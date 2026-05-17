import { NextRequest } from "next/server";
import { adminDb, getAuthedRequest } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the client (AuthContext) whenever a user signs in.
 * Upserts users/{uid} so the admin dashboard sees them immediately,
 * before they send their first chat message.
 */
export async function POST(req: NextRequest) {
  const authed = await getAuthedRequest(req);
  if (!authed) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const now = new Date().toISOString();
  const profile: Record<string, unknown> = {
    lastSignInAt: now,
  };
  if (authed.email) profile.email = authed.email;
  if (authed.displayName) profile.displayName = authed.displayName;
  if (authed.provider) profile.signInProvider = authed.provider;

  const ref = adminDb().collection("users").doc(authed.uid);
  const existing = await ref.get();
  if (!existing.exists) {
    profile.createdAt = now;
  }
  await ref.set(profile, { merge: true });

  return Response.json({ ok: true, created: !existing.exists });
}
