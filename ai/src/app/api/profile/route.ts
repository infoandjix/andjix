import { NextRequest } from "next/server";
import { adminDb, getAuthedRequest } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Profile = {
  displayName?: string;
  email?: string;
  phone?: string;
  segment?: "newcomer" | "individual" | "self_employed" | "sme" | "other";
  preferredLanguage?: "fr" | "en";
  notes?: string;
};

const VALID_SEGMENTS = new Set([
  "newcomer",
  "individual",
  "self_employed",
  "sme",
  "other",
]);

export async function GET(req: NextRequest) {
  const authed = await getAuthedRequest(req);
  if (!authed) return new Response("unauthorized", { status: 401 });

  const snap = await adminDb().collection("users").doc(authed.uid).get();
  return Response.json(snap.exists ? snap.data() : {});
}

export async function PUT(req: NextRequest) {
  const authed = await getAuthedRequest(req);
  if (!authed) return new Response("unauthorized", { status: 401 });

  let body: Profile;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const allowed: Profile = {};
  if (typeof body.displayName === "string") allowed.displayName = body.displayName.slice(0, 120);
  // Email comes from the verified Firebase token, NOT user payload — prevents
  // admin-impersonation by setting email to a bootstrap admin address.
  if (authed.email) allowed.email = authed.email;
  if (typeof body.phone === "string") allowed.phone = body.phone.slice(0, 40);
  if (typeof body.segment === "string" && VALID_SEGMENTS.has(body.segment)) {
    allowed.segment = body.segment as Profile["segment"];
  }
  if (body.preferredLanguage === "fr" || body.preferredLanguage === "en") {
    allowed.preferredLanguage = body.preferredLanguage;
  }
  if (typeof body.notes === "string") allowed.notes = body.notes.slice(0, 2000);

  await adminDb()
    .collection("users")
    .doc(authed.uid)
    .set(
      { ...allowed, updatedAt: new Date().toISOString() },
      { merge: true },
    );

  return Response.json({ ok: true });
}
