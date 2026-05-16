import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cached: App | null = null;

function app(): App {
  if (cached) return cached;
  if (getApps().length) {
    cached = getApps()[0]!;
    return cached;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT env var missing. See SETUP_FIREBASE.md step 5.",
    );
  }

  // Stored as base64-encoded JSON to survive Vercel CLI quote stripping.
  const json = Buffer.from(raw, "base64").toString("utf8");
  const credentials = JSON.parse(json);

  cached = initializeApp({
    credential: cert(credentials),
    projectId: credentials.project_id,
  });
  return cached;
}

export function adminAuth(): Auth {
  return getAuth(app());
}

export function adminDb(): Firestore {
  return getFirestore(app());
}

export async function verifyIdToken(token: string | undefined | null) {
  if (!token) return null;
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}
