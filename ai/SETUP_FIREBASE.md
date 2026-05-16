# Firebase setup for andjix-ai

Goal: add user accounts (Google + email magic link) and persistent profile + chat history to the Andjix bot.

This is a **one-time setup** Emile will do. It produces 6 environment variables to paste into Vercel and a security rules file.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. Project name: `andjix-ai` (Firebase will suffix with a random ID, that's fine)
3. **Disable Google Analytics** (not needed, simpler to skip)
4. Wait for provisioning (~30s)

## 2. Set the region (important — Canadian data residency)

1. In the Firebase console, sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Location: **`northamerica-northeast1` (Montréal)** — keep André's customer data in Canada for PIPEDA
4. Mode: **Production mode** (we'll paste rules in step 7)
5. Click Enable

## 3. Enable Authentication

1. Sidebar → **Build → Authentication** → **Get started**
2. **Sign-in method** tab → click **Google** → toggle Enable → set support email to `info.andjix@gmail.com` → Save
3. Click **Email/Password** → toggle Enable → also toggle **Email link (passwordless sign-in)** → Save
4. **Settings** tab → **Authorized domains** → click **Add domain** → add `ai.andjix.ca` (and `www.ai.andjix.ca` if you want both)
   - `localhost` and the auto-generated `*.firebaseapp.com` are pre-added — leave them.

## 4. Register the web app

1. Project settings (gear icon top-left) → **General** tab → scroll to "Your apps"
2. Click the `</>` (web) icon → nickname: `andjix-ai-web` → **don't** check "Firebase Hosting" → Register
3. Firebase shows a `firebaseConfig` object. **Copy these 5 values** — you'll paste them into Vercel:

```js
{
  apiKey: "AIza...",                              // → NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "andjix-ai-xxxxx.firebaseapp.com",  // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "andjix-ai-xxxxx",                   // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
  messagingSenderId: "1234567890",                // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:1234567890:web:abc123"                // → NEXT_PUBLIC_FIREBASE_APP_ID
}
```

(Ignore `storageBucket` and `measurementId`.)

## 5. Generate a service account key (for server-side writes)

1. Project settings → **Service accounts** tab
2. Click **Generate new private key** → confirm. A JSON file downloads.
3. Open it, copy the **entire JSON content** (starts with `{`, ends with `}`)
4. **Base64-encode it** (Vercel CLI strips inner quotes from raw JSON env vars):
   ```bash
   pbpaste | base64 | pbcopy
   # or paste the JSON content directly, then base64 it:
   cat ~/Downloads/andjix-ai-firebase-adminsdk-*.json | base64 | pbcopy
   ```
5. The base64 string is now in your clipboard → that's `FIREBASE_SERVICE_ACCOUNT`.
6. **Delete the downloaded JSON file** when done (`rm ~/Downloads/andjix-ai-firebase-adminsdk-*.json`).

## 6. Paste env vars into Vercel

In `~/ClaudeProjects/giovannielabs.ai/andjix-ai/`:

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
vercel env add FIREBASE_SERVICE_ACCOUNT production   # paste the base64 string
```

Repeat for `preview` and `development` if you want them to work in dev too (the 5 NEXT_PUBLIC ones are safe to share across all envs; the service account too — same project).

Pull them into your local `.env.local`:

```bash
vercel env pull .env.local
```

## 7. Apply Firestore security rules

1. In Firebase console → Firestore Database → **Rules** tab
2. Replace the contents with what's in `firestore.rules` (in this repo)
3. Click **Publish**

## 8. Deploy

```bash
cd ~/ClaudeProjects/giovannielabs.ai/andjix-ai && vercel --prod --yes
```

Visit https://ai.andjix.ca — sign in should work.

---

## Cost expectations

Firebase free tier (Spark plan) covers:
- 50K Firestore reads/day, 20K writes/day, 1 GB storage
- Unlimited Auth users
- Unlimited email link sign-ins

Andjix won't approach these limits in year 1. If/when usage grows, Firebase auto-prompts to upgrade to Blaze (pay-as-you-go), still pennies per month at Andjix's scale.

## What to give André when he's ready

Once tested, transfer the Firebase project to André's Google account:
1. Firebase console → Project settings → **Users and permissions** → Add `info.andjix@gmail.com` as **Owner**
2. André accepts the invite
3. Emile downgrades self to Editor (or leaves entirely)

Billing stays on whoever has the Blaze plan attached. While on Spark (free), no billing concern.
