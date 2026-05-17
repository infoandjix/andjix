# Andjix

Two-system stack for Andjix Consulting Inc. (Ottawa, Canada). Owned by André Djomamessi (`info.andjix@gmail.com`).

- **`ai/`** — Next.js 16 bot powered by Anthropic Claude, Firebase Auth + Firestore, Resend, Calendly webhook, Make.com integration. Deploys to https://ai.andjix.ca.
- **`admin/`** — Static admin dashboard (Firebase web SDK + Tailwind CDN). Prospects, bookings, conversations, settings. Deploys to https://admin.andjix.ca.

Marketing site (https://andjix.ca) lives in a separate repo (`giovannielabs/giovannielabs.ai`) and is NOT in this project.

## Start here, depending on who you are

| You are | Read this |
|---|---|
| **André** (the owner, non-developer) | [`UTILISER_CLAUDE_CODE_FR.md`](./UTILISER_CLAUDE_CODE_FR.md) — comment modifier ton site avec Claude Code (en français) |
| **Operator using the admin dashboard** | [`ai/OPERATIONS_FR.md`](./ai/OPERATIONS_FR.md) — guide d'opérations quotidiennes |
| **Developer making code changes** | [`CLAUDE.md`](./CLAUDE.md) — conventions, gotchas, environment, deploy rules |
| **AI agent (Claude Code, Copilot)** | [`CLAUDE.md`](./CLAUDE.md) — must read in full before any change |

## Key infrastructure

| Asset | Where |
|---|---|
| GitHub repo | `infoandjix/andjix` (this repo) |
| Vercel projects | `andjix-ai` + `andjix-admin` (Hobby plan, owned by `info.andjix@gmail.com`) |
| Firebase project | `andjix-site` (Montréal `northamerica-northeast1`, PIPEDA-compliant) |
| CRM | Airtable base `Andjix Consulting - CRM` (Prospects, Bookings, Dossiers Fiscaux, Arrivants, Placement Personnel) |
| Workflow automation | Make.com (Webhook → Airtable + Gmail scenarios) |
| Calendar | Calendly account `info-andjix` |
| Bot LLM | Anthropic Claude Opus 4.7 |

## Critical conventions (full details in [`CLAUDE.md`](./CLAUDE.md))

1. **Commit author must be `info.andjix@gmail.com`** — Vercel Hobby plan silently rejects deploys with mismatched author.
2. **Most "change what the bot says" requests should NOT change code** — they belong in `admin.andjix.ca` → Paramètres → Notes additionnelles.
3. **Make.com webhook payload field names are a contract** — changing them in code without updating the Make.com scenario breaks Airtable mappings.
4. **Calendly webhook is HMAC-verified** — never remove `CALENDLY_WEBHOOK_SECRET` env var without coordinating with the Calendly subscription's signing key.

## Deploys

Both Vercel projects auto-deploy on push to `main`. `andjix-ai` uses Root Directory `ai`, `andjix-admin` uses `admin`.

## Firebase rules

```bash
cd ai && firebase deploy --only firestore:rules
```

Or paste `ai/firestore.rules` into the Firebase Console Rules tab.
