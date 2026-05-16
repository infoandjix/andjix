import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Calendly webhook receiver. Subscribe to `invitee.created` and
// `invitee.canceled` events in Calendly's webhook UI and point them here.
// Optional shared secret: set CALENDLY_WEBHOOK_SECRET and use Calendly's
// signature header (Calendly-Webhook-Signature). For now we accept both
// signed and unsigned requests so André can wire it up without HMAC work.

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

export async function POST(req: Request) {
  let body: CalendlyPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const eventType = body.event ?? "unknown";
  const p = body.payload ?? {};
  const scheduled = p.scheduled_event ?? p.event ?? {};

  const record = {
    eventType,
    name: p.name ?? null,
    email: p.email ?? null,
    startTime: scheduled.start_time ?? null,
    endTime: scheduled.end_time ?? null,
    calendlyUri: scheduled.uri ?? null,
    eventName: ("name" in scheduled ? scheduled.name : null) ?? null,
    cancelUrl: p.cancel_url ?? null,
    rescheduleUrl: p.reschedule_url ?? null,
    status: p.status ?? null,
    answers: p.questions_and_answers ?? [],
    receivedAt: new Date().toISOString(),
  };

  try {
    await adminDb().collection("bookings").add(record);
  } catch (err) {
    console.error("[calendly] firestore write failed", err);
  }

  // Mirror to Make.com so the booking lands in Airtable next to the lead.
  // Reuses the lead webhook pattern; set MAKE_BOOKING_WEBHOOK_URL in Vercel.
  const makeWebhook = process.env.MAKE_BOOKING_WEBHOOK_URL;
  if (makeWebhook) {
    try {
      await fetch(makeWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "calendly", ...record }),
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
