import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { ANDJIX_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { adminDb, getAuthedRequest } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-4-7";

const client = new Anthropic();

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

async function loadSiteConfig(): Promise<string | null> {
  try {
    const snap = await adminDb().collection("config").doc("site").get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    const lines: string[] = [];
    if (d.calendlyUrl) lines.push(`URL Calendly à utiliser pour les réservations: ${d.calendlyUrl}`);
    if (d.kbNotes) lines.push(`Notes additionnelles d'Andjix:\n${d.kbNotes}`);
    return lines.length ? lines.join("\n\n") : null;
  } catch {
    return null;
  }
}

async function loadProfileContext(uid: string): Promise<string | null> {
  const snap = await adminDb().collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const p = snap.data() ?? {};
  const lines: string[] = [];
  if (p.displayName) lines.push(`Nom: ${p.displayName}`);
  if (p.segment) {
    const labels: Record<string, string> = {
      newcomer: "nouveau arrivant au Canada",
      individual: "particulier",
      self_employed: "travailleur autonome",
      sme: "PME / entreprise",
      other: "autre",
    };
    lines.push(`Profil: ${labels[p.segment] ?? p.segment}`);
  }
  if (p.preferredLanguage) lines.push(`Langue préférée: ${p.preferredLanguage === "fr" ? "français" : "anglais"}`);
  if (p.phone) lines.push(`Téléphone: ${p.phone}`);
  if (p.notes) lines.push(`Notes: ${p.notes}`);
  if (lines.length === 0) return null;
  return `Contexte de l'utilisateur connecté (utilise ces infos sans les redemander):\n${lines.join("\n")}`;
}

export async function POST(req: NextRequest) {
  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length > 0,
  );

  if (messages.length === 0) {
    return new Response("messages array required", { status: 400 });
  }

  if (messages[0].role !== "user") {
    return new Response("first message must be user", { status: 400 });
  }

  const authed = await getAuthedRequest(req);
  const uid = authed?.uid ?? null;

  const [siteConfig, profileContext] = await Promise.all([
    loadSiteConfig(),
    uid ? loadProfileContext(uid) : Promise.resolve(null),
  ]);

  const systemParts: string[] = [ANDJIX_SYSTEM_PROMPT];
  if (siteConfig) systemParts.push(siteConfig);
  if (profileContext) systemParts.push(profileContext);
  const systemPrompt = systemParts.join("\n\n---\n");

  const lastUser = messages[messages.length - 1];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
            );
          }
        }

        const final = await response.finalMessage();
        const fullText = final.content
          .filter((b) => b.type === "text")
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("");
        const wantsBooking = fullText.includes("[BOOK]");
        const cleanedAssistant = fullText.replace(/\[BOOK\]/g, "").trim();

        // Persist both the user's message and the assistant reply for signed-in users.
        // Use distinct timestamps so `orderBy("createdAt")` returns user before assistant.
        if (uid && authed && lastUser?.role === "user" && cleanedAssistant) {
          const col = adminDb().collection("users").doc(uid).collection("messages");
          const userTs = new Date().toISOString();
          const assistantTs = new Date(Date.now() + 1).toISOString();
          const batch = adminDb().batch();
          batch.set(col.doc(), { role: "user", content: lastUser.content, createdAt: userTs });
          batch.set(col.doc(), { role: "assistant", content: cleanedAssistant, createdAt: assistantTs });
          // Enrich the user profile doc on every chat so the admin dashboard
          // shows their email / displayName / photo from the verified token.
          // `email` is the source of truth — only set if present and never overwritten by user payload.
          const profileUpdate: Record<string, unknown> = {
            lastActiveAt: assistantTs,
          };
          if (authed.email) profileUpdate.email = authed.email;
          if (authed.displayName) profileUpdate.displayName = authed.displayName;
          if (authed.photoURL) profileUpdate.photoURL = authed.photoURL;
          if (authed.provider) profileUpdate.signInProvider = authed.provider;
          batch.set(
            adminDb().collection("users").doc(uid),
            profileUpdate,
            { merge: true },
          );
          await batch.commit();
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              wants_booking: wantsBooking,
              persisted: Boolean(uid),
              usage: {
                input: final.usage.input_tokens,
                output: final.usage.output_tokens,
                cache_read: final.usage.cache_read_input_tokens ?? 0,
                cache_write: final.usage.cache_creation_input_tokens ?? 0,
              },
            })}\n\n`,
          ),
        );
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
