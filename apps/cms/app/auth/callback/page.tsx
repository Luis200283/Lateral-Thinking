"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CMS_API_URL, setToken } from "../../../lib/cms-api";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch:
    "El inicio de sesión caducó o se abrió en otra pestaña. Inténtalo de nuevo.",
  access_denied: "Cancelaste el inicio de sesión.",
  provider_not_enabled: "Ese proveedor de acceso no está disponible.",
  social_start_failed: "No se pudo iniciar el acceso. Inténtalo de nuevo.",
};

/**
 * Destino del magic link en el CMS: Better Auth ya verificó el token y
 * dejó la cookie de sesión; aquí la intercambiamos por el JWT (GET
 * /auth/token) y guardamos en localStorage + cookie espejo, como en el
 * login email/password. Si el flujo social vuelve con ?error=, se muestra
 * el motivo en vez de intentar canjear una sesión inexistente.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("error");
    if (authError) {
      setError(
        ERROR_MESSAGES[authError] ??
          "No se pudo iniciar sesión. Vuelve a intentarlo.",
      );
      return;
    }

    let cancelled = false;
    fetch(`${CMS_API_URL}/auth/token`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("no session");
        return res.json();
      })
      .then((data: { token?: unknown }) => {
        if (cancelled || typeof data.token !== "string") {
          if (!cancelled) {
            setError("El enlace puede haber expirado. Vuelve a intentarlo.");
          }
          return;
        }
        setToken(data.token);
        router.replace("/");
      })
      .catch(() => {
        if (!cancelled) {
          setError("El enlace puede haber expirado. Vuelve a intentarlo.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center py-8">
      <div className="w-full max-w-md rounded-card border-[1.5px] border-ink bg-surface p-8 text-center shadow-[6px_6px_0_var(--color-ink)]">
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold text-ink">
              No se pudo iniciar sesión
            </h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-6 rounded-full border-[1.5px] border-ink bg-coral px-5 py-2.5 font-display font-semibold text-on-accent shadow-[3px_3px_0_var(--color-ink)]"
            >
              Ir a login
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-ink">
              Completando acceso…
            </h1>
            <p className="mt-2 text-sm text-muted">
              Intercambiando el enlace mágico por tu sesión.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
