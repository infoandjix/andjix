"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import LeadModal from "./LeadModal";
import AuthModal from "./AuthModal";
import { useAuth } from "@/lib/auth-context";

type Lang = "fr" | "en";
type Message = { role: "user" | "assistant"; content: string };

const SIGN_IN_NUDGE_AFTER = 4;

const STRINGS = {
  fr: {
    welcome_title: "Comment puis-je vous aider aujourd'hui ?",
    welcome_lede:
      "Décrivez votre situation. Je peux vous orienter sur les démarches administratives, fiscales, l'emploi, le logement et bien plus à Ottawa.",
    chips: [
      { label: "Je suis nouveau au Canada", text: "Je viens d'arriver au Canada. Par où je commence ?" },
      { label: "Aide pour mes impôts", text: "J'aimerais comprendre comment faire ma déclaration d'impôts au Canada." },
      { label: "Recherche d'emploi", text: "Comment adapter mon CV au marché canadien ?" },
      { label: "Constituer une entreprise", text: "Je veux constituer une entreprise en Ontario. Que dois-je savoir ?" },
    ],
    placeholder: "Posez votre question...",
    send: "Envoyer",
    book_cta: "Réserver un appel avec André",
    book_inline: "Voulez-vous réserver un appel avec André ?",
    book_inline_yes: "Oui, réserver",
    typing: "Andjix réfléchit",
    error_generic: "Une erreur est survenue. Réessayez.",
    legal: "Andjix est l'assistant d'Andjix Consulting Inc. Pour des conseils juridiques formels, consultez un avocat.",
    new_chat: "Nouvelle conversation",
    sign_in: "Se connecter",
    sign_out: "Déconnexion",
    sign_in_nudge: "Connectez-vous pour qu'Andjix se souvienne de votre situation la prochaine fois.",
    sign_in_now: "Se connecter",
    history_loaded: "Conversation précédente chargée.",
  },
  en: {
    welcome_title: "How can I help you today?",
    welcome_lede:
      "Describe your situation. I can guide you on admin, taxes, employment, housing, and more in Ottawa.",
    chips: [
      { label: "I'm new to Canada", text: "I just arrived in Canada. Where do I start?" },
      { label: "Help with taxes", text: "I'd like to understand how to file taxes in Canada." },
      { label: "Job search", text: "How do I adapt my CV for the Canadian market?" },
      { label: "Start a business", text: "I want to incorporate a business in Ontario. What should I know?" },
    ],
    placeholder: "Ask your question...",
    send: "Send",
    book_cta: "Book a call with André",
    book_inline: "Want to book a call with André?",
    book_inline_yes: "Yes, book",
    typing: "Andjix is thinking",
    error_generic: "An error occurred. Please try again.",
    legal: "Andjix is the assistant for Andjix Consulting Inc. For formal legal advice, consult a lawyer.",
    new_chat: "New conversation",
    sign_in: "Sign in",
    sign_out: "Sign out",
    sign_in_nudge: "Sign in so Andjix remembers your situation next time.",
    sign_in_now: "Sign in",
    history_loaded: "Previous conversation loaded.",
  },
} as const;

export default function Chat() {
  const [lang, setLang] = useState<Lang>("fr");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [bookSuggested, setBookSuggested] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [signInNudgeShown, setSignInNudgeShown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = STRINGS[lang];
  const { user, configured, signOut } = useAuth();

  // Note: conversation history is saved to Firestore for André's admin dashboard
  // but is intentionally NOT reloaded on sign-in — each session starts fresh
  // with the welcome screen and service chips.

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("andjix.lang") : null;
    if (stored === "fr" || stored === "en") setLang(stored);
    else if (typeof navigator !== "undefined" && navigator.language?.startsWith("en")) setLang("en");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("andjix.lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamBuffer]);

  const send = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || streaming) return;

      const next: Message[] = [...messages, { role: "user", content: text }];
      setMessages(next);
      setInput("");
      setStreaming(true);
      setStreamBuffer("");

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user) {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({ messages: next }),
        });
        if (!res.ok || !res.body) throw new Error("network");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let assistantText = "";
        let suggestedBooking = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const chunks = acc.split("\n\n");
          acc = chunks.pop() ?? "";
          for (const chunk of chunks) {
            if (!chunk.startsWith("data: ")) continue;
            const payload = chunk.slice(6).trim();
            if (!payload) continue;
            try {
              const parsed = JSON.parse(payload);
              if (typeof parsed.text === "string") {
                assistantText += parsed.text;
                setStreamBuffer(assistantText);
              }
              if (parsed.done && parsed.wants_booking) suggestedBooking = true;
              if (parsed.error) throw new Error(parsed.error);
            } catch {
              // ignore malformed event
            }
          }
        }

        const cleaned = assistantText.replace(/\[BOOK\]/g, "").trim();
        setMessages([...next, { role: "assistant", content: cleaned }]);
        setStreamBuffer("");
        if (suggestedBooking) setBookSuggested(true);
      } catch {
        setMessages([...next, { role: "assistant", content: t.error_generic }]);
        setStreamBuffer("");
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, t.error_generic, user],
  );

  // Nudge anonymous users to sign in after a few exchanges.
  useEffect(() => {
    if (!configured) return;
    if (user) return;
    if (signInNudgeShown) return;
    if (messages.length >= SIGN_IN_NUDGE_AFTER) setSignInNudgeShown(true);
  }, [messages.length, user, configured, signInNudgeShown]);

  const reset = useCallback(async () => {
    setMessages([]);
    setStreamBuffer("");
    setBookSuggested(false);
    setSignInNudgeShown(false);
    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch("/api/messages", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore — local clear already happened
      }
    }
  }, [user]);

  const showWelcome = messages.length === 0;

  return (
    <div className="flex h-screen flex-col">
      <Header
        lang={lang}
        setLang={setLang}
        onBook={() => setBookOpen(true)}
        onReset={reset}
        userLabel={user?.displayName ?? user?.email ?? null}
        showSignIn={configured && !user}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={() => signOut()}
        signInLabel={t.sign_in}
        signOutLabel={t.sign_out}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
          {showWelcome && <Welcome strings={t} onPick={(text) => setInput(text)} disabled={streaming} />}

          <div className="space-y-4">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {streaming && streamBuffer && <Bubble role="assistant" content={streamBuffer} />}
            {streaming && !streamBuffer && <TypingDots label={t.typing} />}
          </div>

          {signInNudgeShown && !user && configured && !streaming && (
            <div className="fade-up mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-andjix-border)] bg-[var(--color-andjix-sky-soft)] p-4">
              <p className="text-sm text-[var(--color-andjix-blue-deep)]">{t.sign_in_nudge}</p>
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-full bg-[var(--color-andjix-blue)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-andjix-blue-deep)]"
              >
                {t.sign_in_now}
              </button>
            </div>
          )}

          {bookSuggested && !streaming && (
            <div className="fade-up mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-andjix-border)] bg-white p-4 shadow-sm">
              <p className="text-sm text-[var(--color-andjix-text-muted)]">{t.book_inline}</p>
              <button
                onClick={() => setBookOpen(true)}
                className="rounded-full bg-[var(--color-andjix-blue)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-andjix-blue-deep)]"
              >
                {t.book_inline_yes}
              </button>
            </div>
          )}
        </div>
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        disabled={streaming}
        placeholder={t.placeholder}
        sendLabel={t.send}
        legal={t.legal}
      />

      {bookOpen && (
        <LeadModal
          lang={lang}
          conversation={messages}
          onClose={() => setBookOpen(false)}
        />
      )}

      {authOpen && <AuthModal lang={lang} onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function Header({
  lang,
  setLang,
  onBook,
  onReset,
  userLabel,
  showSignIn,
  onSignIn,
  onSignOut,
  signInLabel,
  signOutLabel,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onBook: () => void;
  onReset: () => void;
  userLabel: string | null;
  showSignIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  signInLabel: string;
  signOutLabel: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-andjix-border)] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <button onClick={onReset} className="flex items-center gap-2.5 transition hover:opacity-80">
          <Logo />
          <div className="text-left">
            <div className="font-display text-[15px] font-semibold leading-tight text-[var(--color-andjix-blue-deep)]">
              Andjix
            </div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-andjix-text-muted)]">
              Andjix Consulting Inc.
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-andjix-border)] bg-[var(--color-andjix-sky-soft)] font-display text-[11px] font-semibold text-[var(--color-andjix-blue-deep)] transition hover:border-[var(--color-andjix-blue)]"
            aria-label="Toggle language"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
          {showSignIn && (
            <button
              onClick={onSignIn}
              className="rounded-full border border-[var(--color-andjix-blue)] px-3 py-1.5 text-xs font-medium text-[var(--color-andjix-blue-deep)] transition hover:bg-[var(--color-andjix-sky-soft)] sm:px-4 sm:py-2 sm:text-sm"
            >
              {signInLabel}
            </button>
          )}
          {userLabel && (
            <button
              onClick={onSignOut}
              title={userLabel}
              className="rounded-full border border-[var(--color-andjix-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-andjix-text-muted)] transition hover:border-[var(--color-andjix-blue)] hover:text-[var(--color-andjix-blue-deep)] sm:px-4 sm:py-2 sm:text-sm"
            >
              {signOutLabel}
            </button>
          )}
          <button
            onClick={onBook}
            className="hidden rounded-full bg-[var(--color-andjix-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-andjix-blue-deep)] sm:inline-flex"
          >
            {STRINGS[lang].book_cta}
          </button>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4FC3F7" />
          <stop offset="55%" stopColor="#1E88E5" />
          <stop offset="100%" stopColor="#0B3D91" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#g)" />
      <path
        d="M19 44 L26 22 L31 22 L38 44 L33 44 L31.4 39 L25.6 39 L24 44 Z M27 34.5 L30 34.5 L28.5 28.8 Z"
        fill="#FFFFFF"
      />
      <path
        d="M40 22 L45 22 L45 36 C45 39.5 42.7 41.5 39.5 41.5 C36.3 41.5 34 39.5 34 36 L38 36 C38 37.5 38.7 38 39.5 38 C40.3 38 41 37.5 41 36 Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      <circle cx="48" cy="48" r="4" fill="#D52B1E" />
    </svg>
  );
}

type Strings = typeof STRINGS[Lang];

function Welcome({
  strings,
  onPick,
  disabled,
}: {
  strings: Strings;
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="fade-up mb-8 text-center">
      <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-[var(--color-andjix-text)]">
        {strings.welcome_title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-[15px] text-[var(--color-andjix-text-muted)]">
        {strings.welcome_lede}
      </p>
      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        {strings.chips.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c.text)}
            disabled={disabled}
            className="rounded-2xl border border-[var(--color-andjix-border)] bg-white px-4 py-3 text-left text-sm transition hover:border-[var(--color-andjix-blue)] hover:bg-[var(--color-andjix-sky-soft)] disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="fade-up flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--color-andjix-blue)] px-4 py-2.5 text-[15px] leading-relaxed text-white">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="fade-up flex justify-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
        <Logo />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-[15px] leading-relaxed text-[var(--color-andjix-text)] shadow-sm ring-1 ring-[var(--color-andjix-border)]">
        <FormattedText content={content} />
      </div>
    </div>
  );
}

function FormattedText({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: Array<{ type: "p" | "ul" | "ol" | "h"; items: string[] }> = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    const heading = /^\s*#{1,3}\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last && last.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else if (numbered) {
      if (last && last.type === "ol") last.items.push(numbered[2]);
      else blocks.push({ type: "ol", items: [numbered[2]] });
    } else if (heading) {
      blocks.push({ type: "h", items: [heading[1]] });
    } else if (line.trim() === "") {
      if (last && last.type !== "p") continue;
      if (last && last.type === "p" && last.items[last.items.length - 1] !== "") last.items.push("");
    } else {
      if (last && last.type === "p") last.items.push(line);
      else blocks.push({ type: "p", items: [line] });
    }
  }

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={i} className="ml-1 list-none space-y-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-andjix-blue)]" />
                  <span>{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="ml-5 list-decimal space-y-1.5 marker:font-semibold marker:text-[var(--color-andjix-blue-deep)]">
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          );
        }
        if (b.type === "h") {
          return (
            <p key={i} className="font-display text-[15px] font-semibold text-[var(--color-andjix-blue-deep)]">
              {renderInline(b.items[0])}
            </p>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {b.items.map((line, j) => (
              <span key={j}>
                {renderInline(line)}
                {j < b.items.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--color-andjix-blue-deep)]">
          {m[2]}
        </strong>,
      );
    } else if (m[3] !== undefined) {
      parts.push(
        <code key={key++} className="rounded bg-[var(--color-andjix-sky-soft)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--color-andjix-blue-deep)]">
          {m[3]}
        </code>,
      );
    } else if (m[4] !== undefined && m[5] !== undefined) {
      parts.push(
        <a key={key++} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-[var(--color-andjix-blue)] underline underline-offset-2 hover:text-[var(--color-andjix-blue-deep)]">
          {m[4]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="fade-up flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Logo />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-[var(--color-andjix-border)]">
        <span className="text-xs text-[var(--color-andjix-text-muted)]">{label}</span>
        <span className="flex gap-1">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--color-andjix-blue)]" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--color-andjix-blue)]" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--color-andjix-blue)]" />
        </span>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  sendLabel,
  legal,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  sendLabel: string;
  legal: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-[var(--color-andjix-border)] bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-[var(--color-andjix-border)] bg-white px-3 py-2 shadow-sm focus-within:border-[var(--color-andjix-blue)] focus-within:ring-2 focus-within:ring-[var(--color-andjix-sky-soft)]">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="max-h-40 flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-[var(--color-andjix-text-muted)] disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="shrink-0 rounded-full bg-[var(--color-andjix-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-andjix-blue-deep)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sendLabel}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[var(--color-andjix-text-muted)]">{legal}</p>
      </div>
    </div>
  );
}
