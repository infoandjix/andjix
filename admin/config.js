// Fill in these values from Firebase console → Project Settings → General → "Your apps".
// Same values as NEXT_PUBLIC_FIREBASE_* used by andjix-ai.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDX_inEPyj54dImt7YxwzSSwLL18Wtr9g",
  authDomain: "andjix-site.firebaseapp.com",
  projectId: "andjix-site",
  messagingSenderId: "765179428878",
  appId: "1:765179428878:web:baef18ff92ee76fde6fc5f",
};

// Bootstrap admin emails — these can sign in even before the `admins`
// Firestore collection exists. Keep at least one trusted email so you
// never get locked out.
window.BOOTSTRAP_ADMINS = [
  "emile.giovannie@gmail.com",
  "info.andjix@gmail.com",
];
