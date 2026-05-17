# CLAUDE.md

Project context and conventions for Claude Code agents working on the Andjix codebase.

**Read this in full before making any change.** Several rules here will cause silent production failures if violated.

---

## What this repo is

Two-system stack for Andjix Consulting Inc. (Ottawa, Canada). André Djomamessi is the owner.

| Folder | What it is | Live URL |
|---|---|---|
| `ai/` | Next.js 16 App Router bot — Anthropic Claude, Firebase Auth + Firestore, Resend, Calendly webhook, Make.com integration | https://ai.andjix.ca |
| `admin/` | Static HTML dashboard (Firebase web SDK, Tailwind CDN) for André's day-to-day operations | https://admin.andjix.ca |

The marketing site (`https://andjix.ca`) lives in a different repo (`giovannielabs/giovannielabs.ai`) and is NOT in this project. Don't touch it from here.

---

## 🚨 Rule #1 — Commit author must be `info.andjix@gmail.com`

**Vercel Hobby plan blocks deploys whose commit author doesn't match the account owner.** If you commit as anyone else (your own email, `noreply@anthropic.com`, etc.), the Vercel deploy will silently fail. The push succeeds but the site does not update.

When committing, ALWAYS use:

```
git -c user.email=info.andjix@gmail.com -c user.name="Andjix" commit -m "..."
```

Or set it permanently in this repo:

```
git config user.email info.andjix@gmail.com
git config user.name "Andjix"
```

If you see the site not updating after a push, this is the first thing to check.

---

## 🚨 Rule #2 — Most "change what the bot says" requests should NOT change code

The bot's knowledge has TWO sources:

1. **Static** (in `ai/src/lib/system-prompt.ts`) — persona, scope, core legal/fiscal knowledge for Ottawa
2. **Dynamic** (in Firestore `config/site.kbNotes`) — promotions, rates, seasonal notes, anything André wants to change frequently

The dynamic part is **edited by André via https://admin.andjix.ca → Paramètres → Notes additionnelles**. Changes take effect on the very next chat message, no deploy.

**Before editing `system-prompt.ts`, ask: could this be done via admin Paramètres instead?** If yes, redirect André there instead of changing code.

Code changes to the system prompt should only be for: persona shifts, scope changes, safety guardrails, or new structural sections — not for individual facts like "tax deadline is March 31."

---

## Repository layout

```
ai/
  src/
    app/
      api/
        chat/route.ts        # Anthropic streaming, profile context injection
        lead/route.ts        # Lead form intake → Firestore + Make.com + Resend
        calendly/route.ts    # Calendly webhook (HMAC-verified)
        messages/route.ts    # User's chat history (GET/DELETE)
        profile/route.ts     # User profile read/write
      page.tsx               # Bot UI entry
      layout.tsx
    components/
      Chat.tsx               # Streaming chat UI
      LeadModal.tsx          # "Réserver un appel" form
      AuthModal.tsx          # Google + email-link sign-in
    lib/
      firebase-admin.ts      # Server SDK + getAuthedRequest helper
      firebase.ts            # Client SDK
      auth-context.tsx       # AuthProvider React context
      system-prompt.ts       # Static persona + core KB
  firestore.rules            # Security rules (publish via Firebase Console)
  firebase.json + .firebaserc

admin/
  index.html                 # Single-page dashboard
  config.js                  # Firebase web config + BOOTSTRAP_ADMINS
  vercel.json                # Headers, clean URLs

OPERATIONS_FR.md             # André's operator guide (French) — UPDATE if you change UI he uses
MAKE_SCENARIO.md             # Make.com setup recipe + Airtable schema
SETUP_FIREBASE.md            # One-time Firebase project bring-up
SETUP_FOR_ANDRE.md           # API keys André needs to provide (Calendly, Resend, Anthropic)
```

---

## Environment variables (Vercel)

Project: `andjix-ai` on `andjix-s-projects` Vercel team (Hobby plan).

| Var | Purpose | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API | Yes — bot won't reply without it |
| `FIREBASE_SERVICE_ACCOUNT` | Base64-encoded service account JSON (Vercel CLI strips inner quotes, so base64) | Yes — Firestore writes fail without it |
| `NEXT_PUBLIC_FIREBASE_API_KEY` + 4 others | Client Firebase config | Yes |
| `RESEND_API_KEY` + `LEAD_EMAIL_TO` + `LEAD_EMAIL_FROM` | Resend transactional email for leads | Optional — if missing, Make.com handles email |
| `MAKE_LEAD_WEBHOOK_URL` | Make.com Scenario A webhook (Webhook → Airtable Prospects + Gmail) | Yes — primary lead notification path |
| `MAKE_BOOKING_WEBHOOK_URL` | Make.com Scenario B webhook (Calendly bookings → Airtable Bookings) | Optional |
| `CALENDLY_WEBHOOK_SECRET` | HMAC secret for Calendly webhook signature verification | Yes — without it, unsigned POSTs are accepted with a log warning |

To add or edit env vars: Vercel dashboard → project → Settings → Environment Variables → after save, **redeploy** (Deployments tab → ⋯ → Redeploy) for the new value to load.

---

## Firestore schema

```
admins/{email}           - admin allowlist (also bootstrapped in rules)
users/{uid}              - profile: email, displayName, segment, phone, notes, lastActiveAt
users/{uid}/messages/{}  - chat history per user
leads/{leadId}           - submissions from /api/lead (bot form + marketing site contact)
bookings/{bookingId}     - Calendly webhook events
config/site              - admin-editable: calendlyUrl, leadEmailTo, kbNotes
```

Rules in `ai/firestore.rules`. Publish changes via Firebase Console → Firestore → Rules tab (or `firebase deploy --only firestore:rules` from `ai/`).

---

## Make.com webhook payloads

**Don't change these field names without updating the Make.com scenarios** — the scenarios map fields by exact name into Airtable.

`MAKE_LEAD_WEBHOOK_URL` receives (from `lead/route.ts`):
```json
{
  "source": "bot|marketing_site_contact|...",
  "name": "string",
  "email": "string",
  "phone": "string|null",
  "segment": "newcomer|self_employed|individual|sme|unknown",
  "segmentLabel": "Nouveau arrivant|Travailleur autonome|...",
  "need": "string|null",
  "lang": "fr|en",
  "transcript": "string|null",
  "createdAt": "ISO datetime"
}
```

`MAKE_BOOKING_WEBHOOK_URL` receives (from `calendly/route.ts`):
```json
{
  "source": "calendly",
  "eventType": "invitee.created|invitee.canceled",
  "name": "string",
  "email": "string",
  "startTime": "ISO datetime",
  "endTime": "ISO datetime",
  "eventName": "string",
  "calendlyUri": "string|null",
  "cancelUrl": "string|null",
  "rescheduleUrl": "string|null",
  "status": "active|canceled",
  "answers": [{"question": "string", "answer": "string"}],
  "receivedAt": "ISO datetime"
}
```

---

## CORS

`/api/lead` accepts cross-origin POSTs from these origins only:

- `https://andjix.ca` (marketing site)
- `https://www.andjix.ca`
- `https://ai.andjix.ca`

Any other origin gets no `Access-Control-Allow-Origin` header — browsers will block the response. If you need to add a new origin, edit `ALLOWED_ORIGINS` in `ai/src/app/api/lead/route.ts:6-10`.

---

## Local development

```bash
cd ai
npm install
cp .env.local.example .env.local   # if it exists; otherwise pull from Vercel
vercel env pull .env.local         # requires `vercel login` as info.andjix
npm run dev                        # http://localhost:3000
```

For the admin dashboard:
```bash
cd admin
# Open index.html in a local server (e.g., `python3 -m http.server 8000`)
# Firebase web SDK requires HTTPS or localhost — file:// won't work for auth
```

---

## Testing changes before pushing

The bot has no automated test suite. Smoke test manually:

1. `npm run dev` in `ai/` → localhost:3000
2. Send a chat message → verify the bot replies
3. Trigger the booking modal ("je veux prendre rendez-vous") → verify Calendly link appears in reply
4. Submit the lead form → verify it shows "success" toast
5. If you touched `/api/calendly`: `curl -X POST localhost:3000/api/calendly -H "Content-Type: application/json" -d '{}'` should return 400 (missing event/email). With `CALENDLY_WEBHOOK_SECRET` set, an unsigned POST should return 401.
6. `npx tsc --noEmit` in `ai/` should pass with zero errors

---

## What NOT to do

- **Don't commit `.env.local` or any file with secrets.** `.gitignore` already covers them — keep it that way.
- **Don't edit `firestore.rules` without understanding what reads what.** Tight rules can break the admin dashboard or the bot. Test in Firebase Console rules playground first.
- **Don't add a new admin** to the BOOTSTRAP_ADMINS in `admin/config.js` and `firestore.rules` at the same time — keep them in sync. Prefer adding via admin UI (writes to `admins/{email}` Firestore doc).
- **Don't remove `CALENDLY_WEBHOOK_SECRET` env var** — it's the only thing preventing webhook forgery.
- **Don't change Make.com payload field names** without coordinating the matching Make.com scenario edit (otherwise Airtable rows get null fields).
- **Don't bypass commit author rule.** See Rule #1 above.

---

## Common change recipes

### "Change the bot's tone / personality"
Edit `ai/src/lib/system-prompt.ts`, commit (author = info.andjix), push. Vercel auto-deploys in ~30s. Test on ai.andjix.ca after.

### "Add a new bot knowledge fact"
Two options:
1. **Volatile fact** (rate, promo, seasonal): tell André to add via admin.andjix.ca → Paramètres → Notes additionnelles. No code change.
2. **Permanent fact** (new service line, structural change): edit `ai/src/lib/system-prompt.ts`.

### "The bot is too talkative / not formal enough"
System prompt change in `system-prompt.ts`. Keep the FR/EN bilingual rules intact.

### "Add a new lead source / different intake form"
Mirror the marketing site contact form pattern: POST to `/api/lead` with `source` field set to identify the origin. Make.com routes by source if needed.

### "Add a Vercel env var"
Use Vercel CLI: `cd ai && vercel env add VAR_NAME production`. Then `vercel env pull .env.local` locally. Then redeploy.

### "Change the admin dashboard layout"
Edit `admin/index.html` (single-file static site). No build step — push triggers Vercel static deploy.

---

## When to escalate to a human

- **You can't reproduce a bug locally** that André reports — get steps from him, screenshots, browser console
- **Firestore rule changes that affect the admin dashboard** — easy to lock yourself out
- **Switching API providers** (Anthropic → other LLM, Resend → other email) — touches multiple files + env vars + costs
- **Anything involving billing or domain DNS** — that's account-level, not code

---

Last updated: 2026-05-16 — full ownership transfer from Giovannie Labs to André, hardening pass applied.
