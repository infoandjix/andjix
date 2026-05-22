// ARC (Agence du revenu du Canada) knowledge base loader.
// Loaded on-demand during chat when a tax-related question is detected.

import { adminDb } from "./firebase-admin";
import { TAX_KEYWORDS } from "./arc-pages";

export interface ArcConfigDoc {
  lastSync: string;
  pageCount: number;
  totalPages: number;
  status: "ok" | "error" | "syncing";
  kb: string; // Compact knowledge base injected into the chat context
}

/**
 * Returns true if the user message contains any fiscal/tax keyword.
 * Used to decide whether to inject ARC knowledge into the system prompt.
 */
export function isTaxRelated(message: string): boolean {
  const lower = message.toLowerCase();
  return TAX_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Loads the compact ARC knowledge base from Firestore (config/arc).
 * Returns null if not yet synced or on any error.
 */
export async function loadArcKB(): Promise<string | null> {
  try {
    const snap = await adminDb().collection("config").doc("arc").get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<ArcConfigDoc>;
    if (!data.kb || data.status !== "ok") return null;
    return data.kb;
  } catch {
    return null;
  }
}

/**
 * Wraps the ARC KB string in a clear section header for the system prompt.
 */
export function buildArcSection(kb: string, lastSync?: string): string {
  const syncNote = lastSync
    ? `Dernière mise à jour : ${new Date(lastSync).toLocaleDateString("fr-CA", { dateStyle: "long" })}.`
    : "";
  return [
    "# Données fiscales ARC — Source officielle canada.ca",
    "",
    "Les extraits ci-dessous proviennent directement des pages officielles de l'Agence du revenu du Canada (ARC).",
    syncNote,
    "Utilise ces données pour répondre avec précision aux questions fiscales.",
    "En cas de doute ou de situation complexe, renvoie toujours vers canada.ca ou propose une consultation avec André.",
    "",
    kb,
  ]
    .filter(Boolean)
    .join("\n");
}
