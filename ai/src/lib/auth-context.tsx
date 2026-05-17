"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "./firebase";

const EMAIL_FOR_SIGN_IN_KEY = "andjix.signInEmail";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      setLoading(false);
      // Mirror sign-in to Firestore so admin dashboard sees the user
      // immediately, before any chat. Best-effort — silent failure is fine.
      if (u) {
        u.getIdToken()
          .then((token) =>
            fetch("/api/auth/sync", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }),
          )
          .catch(() => {});
      }
    });
    return () => unsub();
  }, [configured]);

  // Complete email-link sign-in if the user landed back on the page via the magic link.
  useEffect(() => {
    if (!configured || typeof window === "undefined") return;
    const auth = firebaseAuth();
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
    if (!email) {
      email = window.prompt("Confirm your email to finish signing in") ?? "";
    }
    if (!email) return;

    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
        // Strip the sign-in params from the URL.
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((err) => {
        console.error("email link sign-in failed", err);
      });
  }, [configured]);

  const value: AuthCtx = {
    user,
    loading,
    configured,
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth(), provider);
    },
    async sendEmailLink(email: string) {
      const auth = firebaseAuth();
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
    },
    async signOut() {
      await fbSignOut(firebaseAuth());
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
