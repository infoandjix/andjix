import { NextRequest } from "next/server";
import { adminDb, getUidFromRequest } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return new Response("unauthorized", { status: 401 });

  const snap = await adminDb()
    .collection("users")
    .doc(uid)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  const messages = snap.docs.map((d) => {
    const data = d.data();
    return {
      role: data.role as "user" | "assistant",
      content: data.content as string,
      createdAt: data.createdAt as string,
    };
  });

  return Response.json({ messages });
}

export async function DELETE(req: NextRequest) {
  const uid = await getUidFromRequest(req);
  if (!uid) return new Response("unauthorized", { status: 401 });

  const ref = adminDb().collection("users").doc(uid).collection("messages");
  const snap = await ref.get();

  // Firestore batches cap at 500 ops. Chunk to 400 for safety headroom.
  const BATCH_SIZE = 400;
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = adminDb().batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, snap.docs.length - i);
  }

  return Response.json({ ok: true, deleted });
}
