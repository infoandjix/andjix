import { Resend } from "resend";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set([
  "https://andjix.ca",
  "https://www.andjix.ca",
  "https://ai.andjix.ca",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    // No origin header (server-to-server) or unknown origin: no ACAO.
    // Browsers from unknown origins will fail the CORS check.
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

type LeadPayload = {
  source?: string;
  name?: string;
  email?: string;
  phone?: string;
  segment?: string;
  need?: string;
  conversation?: Array<{ role: string; content: string }>;
  lang?: "fr" | "en";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { source, name, email, phone, segment, need, conversation, lang = "fr" } = body;

  if (!name || !email) {
    return Response.json(
      { ok: false, error: "name and email required" },
      { status: 400, headers: cors },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { ok: false, error: "invalid email" },
      { status: 400, headers: cors },
    );
  }
  // Cap field sizes to prevent abuse / runaway tokens / Firestore doc size.
  const safeName = name.slice(0, 200);
  const safeEmail = email.slice(0, 200);
  const safePhone = phone?.slice(0, 40) ?? null;
  const safeNeed = need?.slice(0, 4000) ?? null;
  const safeSource = (source ?? "bot").slice(0, 60);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  const resendConfigured = Boolean(apiKey && to && from);

  const segmentLabel = SEGMENT_LABELS[segment ?? "unknown"]?.[lang] ?? segment ?? "Non précisé";

  const transcript = (conversation ?? [])
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Andjix"}: ${m.content}`)
    .join("\n\n");

  const subject = lang === "fr"
    ? `Nouveau lead Andjix : ${safeName} (${segmentLabel})`
    : `New Andjix lead: ${safeName} (${segmentLabel})`;

  const text = [
    `Nom : ${safeName}`,
    `Courriel : ${safeEmail}`,
    safePhone ? `Téléphone : ${safePhone}` : null,
    `Segment : ${segmentLabel}`,
    `Langue : ${lang}`,
    `Source : ${safeSource}`,
    "",
    "Besoin / résumé :",
    safeNeed || "(non précisé)",
    "",
    "=".repeat(20),
    "Conversation :",
    transcript || "(aucune conversation enregistrée)",
  ]
    .filter(Boolean)
    .join("\n");

  const createdAt = new Date().toISOString();

  // Persist to Firestore for the admin dashboard. Best-effort.
  try {
    await adminDb()
      .collection("leads")
      .add({
        source: safeSource,
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        segment: segment ?? null,
        need: safeNeed,
        lang,
        transcript: transcript || null,
        createdAt,
      });
  } catch (err) {
    console.error("[lead] firestore write failed", err);
  }

  // Forward to Make.com (Scenario A: Airtable + Gmail). Best-effort with 3s timeout.
  const makeWebhook = process.env.MAKE_LEAD_WEBHOOK_URL;
  if (makeWebhook) {
    try {
      await fetch(makeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: safeSource,
          name: safeName,
          email: safeEmail,
          phone: safePhone,
          segment: segment ?? "unknown",
          segmentLabel,
          need: safeNeed,
          lang,
          transcript: transcript || null,
          createdAt,
        }),
        signal: AbortSignal.timeout(3000),
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
        replyTo: safeEmail,
        subject,
        text,
      });
    } catch (err) {
      console.error("[lead] resend send failed", err);
    }
  }

  return Response.json({ ok: true }, { headers: cors });
}
