/**
 * POST/GET /api/arc-sync
 *
 * Scrapes key ARC (canada.ca/fr/agence-revenu) pages and stores a compact
 * knowledge base in Firestore (config/arc) for injection into Andjix AI's
 * chat context.
 *
 * Authorization (one of):
 *   - Vercel cron:     Authorization: Bearer {CRON_SECRET}        (automatic)
 *   - Admin manual:    Authorization: Bearer {firebase_id_token}  (admin panel)
 *   - Env fallback:    ADMIN_EMAILS comma-separated list
 */

import { NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { ARC_PAGES } from "@/lib/arc-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel max for serverless functions

// ── HTML extraction ──────────────────────────────────────────────────────────

/**
 * Extracts readable text from a canada.ca HTML page.
 * Targets the <main> content block and strips tags, scripts, nav, etc.
 */
function extractText(html: string, maxLength = 2500): string {
  // Focus on the main content block (canada.ca: <main id="wb-cont" ...>)
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let content = mainMatch ? mainMatch[1] : html;

  // Remove noisy blocks entirely
  content = content.replace(
    /<(script|style|nav|footer|header|aside|form|noscript|figure)[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  // Remove HTML comments
  content = content.replace(/<!--[\s\S]*?-->/g, " ");
  // Strip all remaining tags
  content = content.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities (canada.ca often uses named entities)
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&#39;": "'",
    "&quot;": '"',
    "&laquo;": "«",
    "&raquo;": "»",
    "&eacute;": "é",
    "&egrave;": "è",
    "&ecirc;": "ê",
    "&euml;": "ë",
    "&agrave;": "à",
    "&acirc;": "â",
    "&ugrave;": "ù",
    "&ucirc;": "û",
    "&ccedil;": "ç",
    "&ocirc;": "ô",
    "&icirc;": "î",
    "&iuml;": "ï",
    "&aelig;": "æ",
    "&oelig;": "œ",
  };
  for (const [entity, char] of Object.entries(entities)) {
    content = content.replace(new RegExp(entity, "gi"), char);
  }
  // Decode numeric entities
  content = content.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );

  // Collapse whitespace
  content = content.replace(/\s+/g, " ").trim();

  return content.slice(0, maxLength);
}

// ── HTTP fetch ───────────────────────────────────────────────────────────────

async function fetchPage(url: string, timeoutMs = 5_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        // Use a realistic browser UA — canada.ca blocks identified bots
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "fr-CA,fr;q=0.9,en-CA;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Authorization ────────────────────────────────────────────────────────────

async function authorize(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return false;

  // 1. Vercel cron secret (set automatically by Vercel)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token === cronSecret) return true;

  // 2. Firebase admin JWT
  const decoded = await verifyIdToken(token);
  if (!decoded?.email) return false;
  const email = decoded.email.toLowerCase();

  // 2a. Env var bootstrap admins (mirrors BOOTSTRAP_ADMINS in admin/config.js)
  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envAdmins.includes(email)) return true;

  // 2b. Firestore admins collection
  try {
    const snap = await adminDb().collection("admins").doc(email).get();
    return snap.exists;
  } catch {
    return false;
  }
}

// ── Sync handler ─────────────────────────────────────────────────────────────

async function handleSync(req: NextRequest): Promise<Response> {
  if (!(await authorize(req))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = adminDb();
  const now = () => new Date().toISOString();

  // Mark as syncing
  await db
    .collection("config")
    .doc("arc")
    .set({ status: "syncing", syncStartedAt: now() }, { merge: true });

  const results: Array<{
    topic: string;
    title: string;
    status: "ok" | "error" | "skipped";
    chars: number;
  }> = [];
  const compactParts: string[] = [];

  // Stay well within Vercel's 60-second function limit
  const BUDGET_MS = 50_000;
  const startTime = Date.now();

  for (const page of ARC_PAGES) {
    // Stop if we're running low on time — save what we have
    if (Date.now() - startTime > BUDGET_MS) {
      results.push({ topic: page.topic, title: page.title, status: "skipped", chars: 0 });
      continue;
    }

    const html = await fetchPage(page.url);

    if (!html) {
      results.push({ topic: page.topic, title: page.title, status: "error", chars: 0 });
      continue;
    }

    const content = extractText(html, 2500);
    const summary = content.slice(0, 600); // Compact version for context injection

    // Persist full content in arc_pages/{topic}
    await db.collection("arc_pages").doc(page.topic).set({
      title: page.title,
      url: page.url,
      keywords: page.keywords,
      content,
      summary,
      lastUpdated: now(),
    });

    // Append compact entry to the knowledge base string
    compactParts.push(
      `### ${page.title}\nSource : ${page.url}\n\n${summary}`,
    );

    results.push({ topic: page.topic, title: page.title, status: "ok", chars: content.length });

    // Polite delay between requests (avoid hammering canada.ca)
    await new Promise((r) => setTimeout(r, 250));
  }

  const successCount = results.filter((r) => r.status === "ok").length;
  const syncTime = now();
  const kb = compactParts.join("\n\n---\n\n");

  // Save compact KB + metadata
  await db.collection("config").doc("arc").set({
    lastSync: syncTime,
    pageCount: successCount,
    totalPages: ARC_PAGES.length,
    status: "ok",
    kb,
    results,
  });

  console.log(`[arc-sync] Done: ${successCount}/${ARC_PAGES.length} pages synced at ${syncTime}`);

  return Response.json({
    success: true,
    synced: successCount,
    total: ARC_PAGES.length,
    lastSync: syncTime,
    results,
  });
}

// ── CORS headers (admin.andjix.ca → ai.andjix.ca cross-origin call) ──────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://admin.andjix.ca",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// Preflight handler
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Both GET (Vercel cron) and POST (admin panel manual trigger) are supported.
export async function GET(req: NextRequest) {
  return withCors(await handleSync(req));
}

export async function POST(req: NextRequest) {
  return withCors(await handleSync(req));
}
