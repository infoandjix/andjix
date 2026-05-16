import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set([
  "https://andjix.ca",
  "https://www.andjix.ca",
  "https://ai.andjix.ca",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://andjix.ca";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

type LeadPayload = {
  name?: string;
  email?: string;
  phone?: string;
  segment?: string;
  need?: string;
  conversation?: Array<{ role: string; content: string }>;
  lang?: "fr" | "en";
};

const SEGMENT_LABELS: Record<string, { fr: string; en: string }> = {
  newcomer: { fr: "Nouveau arrivant", en: "Newcomer" },
  self_employed: { fr: "Travailleur autonome", en: "Self-employed" },
  individual: { fr: "Particulier", en: "Individual" },
  sme: { fr: "PME", en: "SME" },
  unknown: { fr: "Non précisé", en: "Unspecified" },
};

export async function POST(req: Request) {
  const cors = corsHeaders(req);
  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400, headers: cors });
  }

  const { name, email, phone, segment, need, conversation, lang = "fr" } = body;

  if (!name || !email) {
    return Response.json(
      { ok: false, error: "name and email required" },
      { status: 400, headers: cors },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  const resendConfigured = Boolean(apiKey && to && from);

  const segmentLabel = SEGMENT_LABELS[segment ?? "unknown"]?.[lang] ?? segment ?? "Non précisé";

  const transcript = (conversation ?? [])
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Andjix"}: ${m.content}`)
    .join("\n\n");

  const subject = lang === "fr"
    ? `Nouveau lead Andjix : ${name} (${segmentLabel})`
    : `New Andjix lead: ${name} (${segmentLabel})`;

  const text = [
    `Nom : ${name}`,
    `Courriel : ${email}`,
    phone ? `Téléphone : ${phone}` : null,
    `Segment : ${segmentLabel}`,
    `Langue : ${lang}`,
    "",
    "Besoin / résumé :",
    need || "(non précisé)",
    "",
    "=".repeat(20),
    "Conversation :",
    transcript || "(aucune conversation enregistrée)",
  ]
    .filter(Boolean)
    .join("\n");

  // Persist to Firestore for the admin dashboard. Best-effort — if Firebase
  // isn't configured yet, we still send the email.
  try {
    await adminDb()
      .collection("leads")
      .add({
        name,
        email,
        phone: phone ?? null,
        segment: segment ?? null,
        need: need ?? null,
        lang,
        transcript: transcript || null,
        createdAt: new Date().toISOString(),
      });
  } catch (err) {
    console.error("[lead] firestore write failed", err);
  }

  // Forward to Make.com so the lead lands in Airtable and triggers the
  // confirmation + internal-notification emails (Scenario A). Best-effort —
  // failure here does not block the Resend email.
  const makeWebhook = process.env.MAKE_LEAD_WEBHOOK_URL;
  if (makeWebhook) {
    try {
      await fetch(makeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "bot",
          name,
          email,
          phone: phone ?? null,
          segment: segment ?? null,
          segmentLabel,
          need: need ?? null,
          lang,
          transcript: transcript || null,
          createdAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[lead] make.com webhook failed", err);
    }
  }

  if (resendConfigured) {
    try {
      const resend = new Resend(apiKey!);
      await resend.emails.send({
        from: from!,
        to: to!,
        replyTo: email,
        subject,
        text,
      });
    } catch (err) {
      console.error("[lead] resend send failed", err);
    }
  }

  return Response.json({ ok: true }, { headers: cors });
}
