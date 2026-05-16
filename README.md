# Andjix

Two-system stack for Andjix Consulting Inc. (Ottawa).

- **ai/** — Next.js 16 bot powered by Anthropic Claude, Firebase Auth + Firestore, Resend for lead emails, Calendly for bookings. Deploys to `ai.andjix.ca`.
- **admin/** — Static admin dashboard for André (info.andjix@gmail.com): prospects, conversations, bookings, settings. Deploys to `admin.andjix.ca`.

Marketing site (`andjix.ca`) lives separately in the `giovannielabs.ai` monorepo.

## Day-to-day operations

See `ai/OPERATIONS_FR.md` for André's self-serve operations guide (FR).

## Deploys

Both projects are linked to Vercel via git integration. Push to `main` triggers production deploys for both.

## Firebase

Project: `andjix-site` (region `northamerica-northeast1`, Montréal).

To deploy Firestore rules:

```bash
cd ai && firebase deploy --only firestore:rules
```

Or paste `ai/firestore.rules` into the Firebase Console Rules tab.
