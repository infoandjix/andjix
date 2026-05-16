import { NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Profile = {
  displayName?: string;
  email?: string;
  phone?: string;
  segment?: "newcomer" | "individual" | "self_employed" | "pme" | "other";
  preferredLanguage?: "fr" | "en";
  notes?: string;
};

async function getUid(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const decoded = await verifyIdToken(token);
  return decoded?.uid ?? null;
}

export async function GET(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return new Response("unauthorized", { status: 401 });

  const snap = await adminDb().collection("users").doc(uid).get();
  return Response.json(snap.exists ? snap.data() : {});
}

export async function PUT(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return new Response("unauthorized", { status: 401 });

  let body: Profile;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const allowed: Profile = {};
  if (typeof body.displayName === "string") allowed.displayName = body.displayName.slice(0, 120);
  if (typeof body.email === "string") allowed.email = body.email.slice(0, 200);
  if (typeof body.phone === "string") allowed.phone = body.phone.slice(0, 40);
  if (
    body.segment === "newcomer" ||
    body.segment === "individual" ||
    body.segment === "self_employed" ||
    body.segment === "pme" ||
    body.segment === "other"
  ) {
    allowed.segment = body.segment;
  }
  if (body.preferredLanguage === "fr" || body.preferredLanguage === "en") {
    allowed.preferredLanguage = body.preferredLanguage;
  }
  if (typeof body.notes === "string") allowed.notes = body.notes.slice(0, 2000);

  await adminDb()
    .collection("users")
    .doc(uid)
    .set(
      { ...allowed, updatedAt: new Date().toISOString() },
      { merge: true },
    );

  return Response.json({ ok: true });
}
