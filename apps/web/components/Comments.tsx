"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Tag } from "@repo/ui/playground";
import { CMS_API_URL, postComment, type CommentItem } from "../lib/api";
import { formatDate } from "../lib/ui";
import CheckBurst from "./CheckBurst";

interface CommentsProps {
  slug: string;
  initial: CommentItem[];
}

const FIELD =
  "w-full rounded-chip border-[1.5px] border-ink bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted";
const LABEL =
  "font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted";

/** Comentarios visibles antes de pulsar "Ver más". */
const VISIBLE_LIMIT = 5;

type Identity = "guest" | "login";
type SessionState = "idle" | "loading" | "ok";

interface UserInfo {
  name: string;
  email: string;
}

export default function Comments({ slug, initial }: CommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>(initial);
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "ok" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [identity, setIdentity] = useState<Identity>("guest");
  const [session, setSession] = useState<SessionState>("idle");
  const [fromSession, setFromSession] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = window.localStorage.getItem("cms_jwt");
    } catch {
      token = null;
    }
    if (!token) return;

    fetch(`${CMS_API_URL}/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setName(data.user.name);
          setUserInfo({
            name: data.user.name,
            email: data.user.email ?? "",
          });
          setFromSession(true);
          setSession("ok");
          setIdentity("login");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function onChooseLogin(): Promise<void> {
    setIdentity("login");
    if (session === "loading") return;
    setSession("loading");
    let token: string | null = null;
    try {
      token = window.localStorage.getItem("cms_jwt");
    } catch {
      token = null;
    }
    if (!token) {
      setSession("idle");
      setIdentity("guest");
      return;
    }
    try {
      const res = await fetch(`${CMS_API_URL}/me`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setSession("idle");
        setIdentity("guest");
        return;
      }
      const data = (await res.json()) as {
        user?: { name?: string | null; email?: string | null };
      };
      const user = data.user;
      if (typeof user?.name === "string" && user.name.length > 0) {
        setName(user.name);
      }
      setUserInfo({
        name: user?.name ?? "",
        email: user?.email ?? "",
      });
      setFromSession(true);
      setSession("ok");
    } catch {
      setSession("idle");
      setIdentity("guest");
    }
  }

  function onChooseGuest(): void {
    setIdentity("guest");
    setSession("idle");
    setFromSession(false);
    setUserInfo(null);
  }

  function onLogout(): void {
    try {
      window.localStorage.removeItem("cms_jwt");
    } catch {}
    // Body JSON obligatorio: sin él Better Auth responde 415 y la cookie
    // de sesión queda viva (el "cerrar sesión" no cerraba nada).
    fetch(`${CMS_API_URL}/auth/sign-out`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    }).catch(() => {});
    setName("");
    setUserInfo(null);
    setFromSession(false);
    setSession("idle");
    setIdentity("guest");
    setMenuOpen(false);
  }

  function onChangeUser(): void {
    onLogout();
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (status.kind === "sending") return;
    const trimmed = content.trim();
    if (trimmed.length === 0 || name.trim().length === 0) {
      setStatus({ kind: "error", message: "Nombre y comentario son obligatorios." });
      return;
    }
    setStatus({ kind: "sending" });
    const created = await postComment(slug, {
      content: trimmed,
      authorName: name.trim(),
    });
    if (created === null) {
      setStatus({
        kind: "error",
        message: "No se pudo enviar el comentario. La API no responde; inténtalo más tarde.",
      });
      return;
    }
    setName("");
    setContent("");
    setIdentity("guest");
    setSession("idle");
    setFromSession(false);
    setUserInfo(null);
    setBurstKey((k) => k + 1);
    setStatus({ kind: "ok" });
    // Publicado al momento: se añade a la lista; si caía fuera de los
    // visibles, se despliega el resto para que la autora lo vea.
    setComments((prev) => [...prev, created]);
    if (!showAll && comments.length + 1 > VISIBLE_LIMIT) setShowAll(true);
  }

  return (
    <section aria-label="Comentarios">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
        // COMENTARIOS
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-bold tracking-[-0.02em]">
        {comments.length}{" "}
        <span className="text-muted">
          {comments.length === 1 ? "comentario" : "comentarios"}
        </span>
      </h2>

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Todavía no hay comentarios. Sé la primera persona en dejar uno.
        </p>
      ) : (
        <ul className="mt-8 grid gap-5">
          {(showAll ? comments : comments.slice(0, VISIBLE_LIMIT)).map((c) => (
            <li
              key={c.id}
              className="rounded-card border-[1.5px] border-ink bg-surface p-5 shadow-[3px_3px_0_var(--color-ink)]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Tag tone="plain">{c.user?.name ?? c.authorName ?? "Anónimo"}</Tag>
                <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
                  {formatDate(c.createdAt)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!showAll && comments.length > VISIBLE_LIMIT ? (
        <div className="mt-6">
          <Button
            as="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAll(true)}
          >
            Ver más comentarios ({comments.length - VISIBLE_LIMIT})
          </Button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-10 grid max-w-[60ch] gap-5">
        <h3 className="font-display text-xl font-bold tracking-[-0.02em]">
          Deja un comentario
        </h3>

        <div className="grid gap-2">
          <span className={LABEL}>Identidad</span>
          <div
            className="flex flex-wrap gap-3"
            role="group"
            aria-label="Identidad para comentar"
          >
            {fromSession ? (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-pill border-[1.5px] border-ink bg-coral px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-on-accent shadow-[3px_3px_0_var(--color-ink)] transition-colors"
                >
                  <span
                    className="max-w-[100px] truncate"
                    style={{
                      maskImage: "linear-gradient(to right, black 80%, transparent)",
                      WebkitMaskImage: "linear-gradient(to right, black 80%, transparent)",
                    }}
                  >
                    {userInfo?.name ?? name}
                  </span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 fill-ink">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-52 rounded-card border-[1.5px] border-ink bg-surface p-4 shadow-[4px_4px_0_var(--color-ink)]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-ink">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-ink">
                          {userInfo?.name ?? name}
                        </p>
                        {userInfo?.email && (
                          <p className="truncate font-mono text-xs text-muted">
                            {userInfo.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={onLogout}
                        className="rounded-pill border-[1.5px] border-ink bg-surface px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-paper"
                      >
                        Cerrar sesión
                      </button>
                      <button
                        type="button"
                        onClick={onChangeUser}
                        className="rounded-pill border-[1.5px] border-ink bg-surface px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-paper"
                      >
                        Cambiar de usuario
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onChooseLogin}
                aria-pressed={identity === "login"}
                className={`rounded-pill border-[1.5px] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
                  identity === "login"
                    ? "border-ink bg-coral text-on-accent shadow-[3px_3px_0_var(--color-ink)]"
                    : "border-ink bg-surface text-ink hover:bg-paper"
                }`}
              >
                Iniciar sesión
              </button>
            )}
            <button
              type="button"
              onClick={onChooseGuest}
              aria-pressed={identity === "guest"}
              className={`rounded-pill border-[1.5px] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
                identity === "guest"
                  ? "border-ink bg-coral text-on-accent shadow-[3px_3px_0_var(--color-ink)]"
                  : "border-ink bg-surface text-ink hover:bg-paper"
              }`}
            >
              Comentario anónimo
            </button>
          </div>
          <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted">
            Tu información es opcional. Puedes dejar comentarios anónimos.
          </p>

          {identity === "login" && session === "loading" ? (
            <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted">
              Comprobando sesión…
            </p>
          ) : null}
        </div>

        {fromSession ? (
          <p className="font-mono text-sm tracking-[0.02em] text-ink">{name}</p>
        ) : (
          <label className="grid gap-2">
            <span className={LABEL}>Nombre *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              className={FIELD}
            />
          </label>
        )}

        <label className="grid gap-2">
          <span className={LABEL}>Comentario *</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={5}
            required
            className={FIELD}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <Button
            as="button"
            type="submit"
            aria-disabled={status.kind === "sending"}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {status.kind === "sending" ? "Enviando…" : "Publicar comentario"}
          </Button>

          {status.kind === "error" ? (
            <p role="alert" className="font-mono text-[0.6875rem] tracking-[0.1em] text-coral-ink">
              {status.message}
            </p>
          ) : null}
        </div>

        {status.kind === "ok" ? <CheckBurst key={burstKey} /> : null}
      </form>
    </section>
  );
}
