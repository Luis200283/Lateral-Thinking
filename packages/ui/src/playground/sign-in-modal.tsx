"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

export type SignInProvider = "google" | "github";

export type SignInModalProps = {
  open: boolean;
  onClose: () => void;
  /** Base de api-cms, p.ej. http://localhost:4001 */
  apiUrl: string;
  /** Proveedores sociales habilitados (según env del servidor). */
  providers?: readonly SignInProvider[];
  /** URL relativa a la que redirige el magic link tras verificar (origen actual si se omite). */
  magicCallbackUrl?: string;
  /** Se llama con el JWT tras un login email/password exitoso. */
  onSuccess?: (token: string) => void;
};

type Status = { kind: "error" | "success"; text: string } | null;

/**
 * Modal de login compartido (web pública + CMS). Lenguaje Playground:
 * overlay con blur, tarjeta con borde tinta y sombra dura. Cierra con Escape
 * y clic fuera, bloquea el scroll del body y atrapa el foco mientras está abierto.
 */
export function SignInModal({
  open,
  onClose,
  apiUrl,
  providers,
  magicCallbackUrl,
  onSuccess,
}: SignInModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Evita dobles pulsaciones en móvil: dos POST seguidos generan dos states
  // y el primero en volver de Google provoca un state_mismatch.
  const busyRef = useRef(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // El modal se monta en un portal sobre document.body. Sin esto, al vivir
  // dentro del nav (que tiene backdrop-filter) el `position: fixed` se ancla
  // al nav en vez de a la pantalla: un ancestro con backdrop-filter/filter/
  // transform crea un containing block para descendientes `fixed`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const base = apiUrl.replace(/\/+$/, "");
  // Sin lista explícita de proveedores habilitados, no mostramos botones
  // sociales: es mejor ocultarlos que ofrecer un botón que fallará al pulsar.
  // El consumidor consulta GET /providers y pasa solo los habilitados.
  const magicProviders = providers ?? [];
  const showGoogle = magicProviders.includes("google");
  const showGithub = magicProviders.includes("github");

  // Bloquea el scroll del body mientras el modal está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Al volver de Google con el botón atrás, la página puede restaurarse
  // desde bfcache con `busy` atascado en true: se libera al reabrir el
  // modal y cuando el navegador restaura la página.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      busyRef.current = false;
      setBusy(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Foco inicial en el primer input + trap básico de Tab dentro del diálogo.
  // En pantallas táctiles NO enfocamos automáticamente: abrir el teclado al
  // mostrar el modal impedía cerrarlo con un toque y se quedaba atascado.
  useEffect(() => {
    if (!open) return;
    busyRef.current = false;
    setBusy(false);
    setMode("signin");
    setStatus(null);
    setUsername("");
    setConfirmPassword("");
    const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
    if (!coarsePointer) {
      dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    }
    return () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && dialogRef.current?.contains(active)) {
        active.blur();
      }
    };
  }, [open]);

  /** Cierra siempre soltando el foco: en Android el teclado no baja si el
   *  input enfocado se desmonta sin blur explícito. */
  function requestClose(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    onClose();
  }

  function blurInsideDialog(event: ReactMouseEvent<HTMLDivElement>): void {
    const target = event.target as HTMLElement;
    if (!target.closest("input, textarea, select, button, a, label")) {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
  }

  if (!open) return null;

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function post(path: string, body: unknown): Promise<Response> {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return res;
  }

  async function fetchToken(): Promise<string> {
    const res = await fetch(`${base}/auth/token`, { credentials: "include" });
    if (!res.ok) throw new Error("token_error");
    const data = (await res.json()) as { token?: unknown };
    if (typeof data.token !== "string") throw new Error("token_error");
    return data.token;
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    const value = identifier.trim();
    if (mode === "signup") {
      if (!username.trim()) {
        setStatus({ kind: "error", text: "Elige un nombre de usuario." });
        return;
      }
      // El plugin username de Better Auth exige 3-30 caracteres.
      if (username.trim().length < 3) {
        setStatus({
          kind: "error",
          text: "El nombre de usuario debe tener al menos 3 caracteres.",
        });
        return;
      }
      if (password !== confirmPassword) {
        setStatus({ kind: "error", text: "Las contraseñas no coinciden." });
        return;
      }
    }
    setStatus(null);
    busyRef.current = true;
    setBusy(true);
    try {
      // En sign-in el campo acepta email O nombre de usuario: con "@" es
      // email (/auth/sign-in/email); sin "@" es usuario
      // (/auth/sign-in/username, plugin username).
      const isEmail = value.includes("@");
      const path =
        mode === "signin"
          ? isEmail
            ? "/auth/sign-in/email"
            : "/auth/sign-in/username"
          : "/auth/sign-up/email";
      const res = await post(
        path,
        mode === "signin"
          ? isEmail
            ? { email: value, password }
            : { username: value, password }
          : {
              email: value,
              password,
              name: username.trim(),
              username: username.trim(),
            },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          code?: unknown;
          error?: unknown;
        } | null;
        // Better Auth responde { message, code } (p. ej.
        // USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL). `error` queda como
        // fallback por si alguna versión devuelve esa forma.
        const detail =
          typeof data?.code === "string"
            ? data.code
            : typeof data?.error === "string"
              ? data.error
              : "unknown_error";
        setStatus({
          kind: "error",
          text:
            mode === "signin"
              ? "Credenciales inválidas."
              : detail.startsWith("USER_ALREADY_EXISTS")
                ? "Ese email ya está registrado. Inicia sesión."
                : detail.startsWith("USERNAME_IS_ALREADY_TAKEN")
                  ? "Ese nombre de usuario ya está en uso."
                  : "No se pudo crear la cuenta. Inténtalo de nuevo.",
        });
        return;
      }
      const token = await fetchToken();
      onSuccess?.(token);
      requestClose();
    } catch {
      setStatus({
        kind: "error",
        text: "No se pudo contactar con la API. ¿Está api-cms levantada?",
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function onSocial(provider: SignInProvider) {
    if (busyRef.current) return;
    setStatus(null);
    busyRef.current = true;
    setBusy(true);
    // Igual que el magic link: si el consumidor define magicCallbackUrl
    // (el CMS usa "/auth/callback"), volvemos por ahí para intercambiar la
    // sesión por el JWT. Sin él (web pública), volvemos a la página actual.
    const callbackURL =
      typeof window === "undefined"
        ? ""
        : magicCallbackUrl
          ? window.location.origin + magicCallbackUrl
          : window.location.origin + window.location.pathname;
    // Navegación de página completa a api-cms (no fetch cross-origin): así
    // la cookie de state del OAuth se crea en un contexto de primera parte.
    // En móvil, el POST cross-origin podía perderla y el callback de Google
    // terminaba en "state_mismatch".
    window.location.assign(
      `${base}/auth/social/${provider}?callbackURL=${encodeURIComponent(callbackURL)}`,
    );
  }

  const socialButtonClass =
    "flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-surface px-4 py-2.5 font-display text-sm font-semibold tracking-tight text-ink shadow-[3px_3px_0_var(--color-ink)] transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";

  const inputClass =
    "w-full rounded-chip border-[1.5px] border-ink bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet";

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-md sm:items-center"
      onClick={requestClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Iniciar sesión"
        onKeyDown={onKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          blurInsideDialog(e);
        }}
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-card border-[1.5px] border-ink bg-surface p-6 shadow-[6px_6px_0_var(--color-ink)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-coral-ink">
              // acceso
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
              Iniciar sesión
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface font-mono text-sm text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Email/usuario + contraseña */}
        <form onSubmit={onEmailSubmit} className="mt-6 grid gap-4">
          <div>
            <label
              htmlFor="signin-identifier"
              className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted"
            >
              {mode === "signin" ? "Email o usuario" : "Email"}
            </label>
            <input
              id="signin-identifier"
              type={mode === "signin" ? "text" : "email"}
              required
              autoComplete={mode === "signin" ? "username" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={inputClass}
              placeholder={mode === "signin" ? "tu@email.com o tu usuario" : "tu@email.com"}
            />
          </div>
          <div>
            <label
              htmlFor="signin-password"
              className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted"
            >
              Contraseña
            </label>
            <input
              id="signin-password"
              type="password"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          {mode === "signup" && (
            <>
              <div>
                <label
                  htmlFor="signup-username"
                  className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted"
                >
                  Nombre de usuario
                </label>
                <input
                  id="signup-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="luisitohc"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-confirm"
                  className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full border-[1.5px] border-ink bg-coral px-5 py-2.5 font-display font-semibold tracking-tight text-on-accent shadow-[3px_3px_0_var(--color-ink)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
          >
            {busy
              ? mode === "signin"
                ? "Entrando…"
                : "Creando cuenta…"
              : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
          <p className="text-center text-xs text-muted">
            {mode === "signin" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setStatus(null);
                  }}
                  className="font-medium text-violet-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setStatus(null);
                  }}
                  className="font-medium text-violet-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </form>

        {/* Social */}
        {(showGoogle || showGithub) && (
          <>
            <div className="mt-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-ink/15" />
              <span className="font-mono text-xs text-muted">o</span>
              <span className="h-px flex-1 bg-ink/15" />
            </div>
            <div className="mt-6 grid gap-3">
              {showGoogle && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSocial("google")}
                  className={socialButtonClass}
                >
                  {/* Glifo Google — colores de marca (única excepción documentada) */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"
                    />
                  </svg>
                  Continuar con Google
                </button>
              )}
              {showGithub && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSocial("github")}
                  className={socialButtonClass}
                >
                  {/* Glifo GitHub (silueta, hereda currentColor) */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-5 w-5 fill-ink"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                  Continuar con GitHub
                </button>
              )}
            </div>
          </>
        )}

        {status && (
          <p
            role={status.kind === "error" ? "alert" : "status"}
            className={
              status.kind === "error"
                ? "mt-6 rounded-chip border-[1.5px] border-ink bg-paper px-4 py-3 text-sm text-coral-ink"
                : "mt-6 rounded-chip border-[1.5px] border-ink bg-paper px-4 py-3 text-sm text-mint-ink"
            }
          >
            {status.text}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Al iniciar sesión aceptas el uso de cookies de sesión.
        </p>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
