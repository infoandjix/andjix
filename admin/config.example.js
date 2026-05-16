// Copy this file to `config.js` and fill in the values from
// Firebase console → Project Settings → General → "Your apps".
// These are the SAME values used as NEXT_PUBLIC_FIREBASE_* in andjix-ai.
// Firebase web config is meant to be public — safe to commit if you want.
window.FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

// Bootstrap admin emails — whoever is in this list can sign in even before
// the `admins` Firestore collection has any docs. Keep at least one trusted
// email here so we never get locked out.
window.BOOTSTRAP_ADMINS = [
  "emile.giovannie@gmail.com",
  "info.andjix@gmail.com",
];
