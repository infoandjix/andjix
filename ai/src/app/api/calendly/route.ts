import { createHmac, timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Calendly webhook receiver. Subscribe to `invitee.created` and
// `invitee.canceled` events in Calendly's webhook UI and point them here.
//
// Security: if CALENDLY_WEBHOOK_SECRET is set, every POST must include a
// valid `Calendly-Webhook-Signature` header. Without the env var, the route
// runs in permissive mode (logged) — intended only for initial bring-up.

type CalendlyPayload = {
  event?: string;
  payload?: {
    email?: string;
    name?: string;
    questions_and_answers?: Array<{ question: string; answer: string }>;
    event?: { start_time?: string; end_time?: string; uri?: string };
    cancel_url?: string;
    reschedule_url?: string;
    status?: string;
    scheduled_event?: {
      start_time?: string;
      end_time?: string;
      uri?: string;
      name?: string;
    };
  };
};

function verifyCalendlySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  // Header format: "t=1234567890,v1=hex_signature"
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return false;
  const signed = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(signed, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("calendly-webhook-signature");
    if (!verifyCalendlySignature(rawBody, header, secret)) {
      return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[calendly] CALENDLY_WEBHOOK_SECRET not set — accepting unsigned requests in production");
  }

  let body: CalendlyPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const eventType = body.event ?? "";
  const p = body.payload ?? {};

  // Require the basic shape — reject empty/garbage bodies.
  if (!eventType || !p.email) {
    return Response.json({ ok: false, error: "missing event or email" }, { status: 400 });
  }

  const scheduled = p.scheduled_event ?? p.event ?? {};
  // Cap unbounded fields so a malicious or buggy payload can't bloat Firestore.
  const answers = (p.questions_and_answers ?? [])
    .slice(0, 20)
    .map((a) => ({
      question: (a.question ?? "").slice(0, 500),
      answer: (a.answer ?? "").slice(0, 2000),
    }));

  const record = {
    eventType,
    name: (p.name ?? "").slice(0, 200) || null,
    email: p.email.slice(0, 200),
    startTime: scheduled.start_time ?? null,
    endTime: scheduled.end_time ?? null,
    calendlyUri: scheduled.uri ?? null,
    eventName: ("name" in scheduled ? scheduled.name : null) ?? null,
    cancelUrl: p.cancel_url ?? null,
    rescheduleUrl: p.reschedule_url ?? null,
    status: p.status ?? null,
    answers,
    receivedAt: new Date().toISOString(),
  };

  try {
    await adminDb().collection("bookings").add(record);
  } catch (err) {
    console.error("[calendly] firestore write failed", err);
  }

  // Mirror to Make.com. 3s timeout so a slow Make doesn't block our 200.
  const makeWebhook = process.env.MAKE_BOOKING_WEBHOOK_URL;
  if (makeWebhook) {
    try {
      await fetch(makeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "calendly", ...record }),
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      console.error("[calendly] make.com webhook failed", err);
    }
  }

  return Response.json({ ok: true });
}

// Calendly health-checks subscriptions with a GET on the webhook URL.
export async function GET() {
  return Response.json({ ok: true, service: "andjix-calendly-webhook" });
}
