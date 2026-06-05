import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/config
 * Returns public-safe runtime config values from Firestore config/site.
 * Currently exposes only calendlyUrl (needed by LeadModal).
 * Does NOT expose secrets (leadEmailTo, kbNotes, etc.).
 */
export async function GET(_req: NextRequest) {
  try {
    const snap = await adminDb().collection("config").doc("site").get();
    if (!snap.exists) {
      return Response.json({ calendlyUrl: null });
    }
    const d = snap.data() ?? {};
    return Response.json({ calendlyUrl: d.calendlyUrl || null });
  } catch {
    return Response.json({ calendlyUrl: null });
  }
}
