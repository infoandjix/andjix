"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type Lang = "fr" | "en";

const STRINGS = {
  fr: {
    title: "Connectez-vous pour sauvegarder votre conversation",
    lede: "Andjix se souviendra de votre situation et vous évitera de tout réexpliquer.",
    google: "Continuer avec Google",
    or: "ou",
    email_placeholder: "votre@email.com",
    send_link: "Recevoir un lien par courriel",
    sending: "Envoi…",
    sent: "Lien envoyé. Ouvrez votre courriel et cliquez sur le lien.",
    cancel: "Plus tard",
    error: "Une erreur est survenue. Réessayez.",
    privacy: "Vos informations restent privées et ne sont partagées qu'avec André.",
  },
  en: {
    title: "Sign in to save your conversation",
    lede: "Andjix will remember your situation so you don't have to explain twice.",
    google: "Continue with Google",
    or: "or",
    email_placeholder: "you@email.com",
    send_link: "Send me a sign-in link",
    sending: "Sending…",
    sent: "Link sent. Check your email and click the link.",
    cancel: "Later",
    error: "Something went wrong. Try again.",
    privacy: "Your info stays private, only shared with André.",
  },
} as const;

export default function AuthModal({
  lang,
  onClose,
}: {
  lang: Lang;
  onClose: () => void;
}) {
  const { signInWithGoogle, sendEmailLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const t = STRINGS[lang];

  async function onGoogle() {
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      setStatus("error");
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      await sendEmailLink(email.trim());
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-[var(--color-andjix-blue-deep)]">
          {t.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-andjix-text-muted)]">
          {t.lede}
        </p>

        <button
          onClick={onGoogle}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--color-andjix-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-andjix-text)] transition hover:border-[var(--color-andjix-blue)] hover:bg-[var(--color-andjix-sky-soft)]"
        >
          <GoogleIcon />
          {t.google}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--color-andjix-text-muted)]">
          <span className="h-px flex-1 bg-[var(--color-andjix-border)]" />
          {t.or}
          <span className="h-px flex-1 bg-[var(--color-andjix-border)]" />
        </div>

        {status === "sent" ? (
          <p className="rounded-2xl bg-[var(--color-andjix-sky-soft)] p-4 text-center text-sm text-[var(--color-andjix-blue-deep)]">
            {t.sent}
          </p>
        ) : (
          <form onSubmit={onEmail} className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.email_placeholder}
              className="w-full rounded-2xl border border-[var(--color-andjix-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-andjix-blue)] focus:ring-2 focus:ring-[var(--color-andjix-sky-soft)]"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-2xl bg-[var(--color-andjix-blue)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-andjix-blue-deep)] disabled:opacity-60"
            >
              {status === "sending" ? t.sending : t.send_link}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-center text-xs text-red-600">{t.error}</p>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full text-center text-xs text-[var(--color-andjix-text-muted)] underline-offset-2 hover:underline"
        >
          {t.cancel}
        </button>

        <p className="mt-4 text-center text-[11px] text-[var(--color-andjix-text-muted)]">
          {t.privacy}
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
