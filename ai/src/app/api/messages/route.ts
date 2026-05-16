import { NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUid(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const decoded = await verifyIdToken(token);
  return decoded?.uid ?? null;
}

export async function GET(req: NextRequest) {
  const uid = await getUid(req);
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
  const uid = await getUid(req);
  if (!uid) return new Response("unauthorized", { status: 401 });

  const ref = adminDb().collection("users").doc(uid).collection("messages");
  const snap = await ref.get();
  const batch = adminDb().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return Response.json({ ok: true, deleted: snap.size });
}
