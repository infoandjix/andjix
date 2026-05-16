# Andjix Admin

Tableau de bord administrateur pour Andjix Consulting Inc. Single-page HTML, Firebase Auth + Firestore directement depuis le navigateur. Same Firebase project as `andjix-ai`.

## Setup

1. Suis `../andjix-ai/SETUP_FIREBASE.md` d'abord (créer le projet Firebase, activer Auth + Firestore, déployer les règles).
2. Copie `config.example.js` → `config.js` et remplis avec les valeurs Firebase (les mêmes que `NEXT_PUBLIC_FIREBASE_*` dans andjix-ai).
3. Vérifie que `BOOTSTRAP_ADMINS` contient au moins ton email (par défaut: `emile.giovannie@gmail.com` et `info.andjix@gmail.com`).
4. Déploie:
   ```bash
   vercel --prod --yes
   ```
5. Attache le domaine `admin.andjix.ca` au projet, ajoute le CNAME dans GoDaddy.

## Sections

- **Tableau de bord**: total utilisateurs, messages 7j, prospects 7j, actifs 24h
- **Utilisateurs**: liste de tous les utilisateurs connectés, clic = voir conversation
- **Prospects**: leads soumis via le formulaire de réservation
- **Paramètres**: URL Calendly, email de notification, notes injectées dans le prompt système du bot
- **Administrateurs**: gérer qui peut accéder

## Architecture

- Pas de build step — juste `index.html` + `config.js`
- Firebase web SDK chargé en ESM depuis `gstatic.com`
- Tailwind via CDN (JIT au runtime)
- Auth: Google sign-in only. Bootstrap admins dans `config.js`, additionnels dans `admins/{email}` Firestore
- Règles Firestore (dans `../andjix-ai/firestore.rules`) autorisent les admins à lire `users`, `users/*/messages`, `leads`, `config/*` et à écrire `admins`, `config/*`
