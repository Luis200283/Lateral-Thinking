"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CMS_API_URL } from "../../../lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${CMS_API_URL}/auth/token`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("no session");
        return res.json();
      })
      .then((data: { token?: unknown }) => {
        if (cancelled || typeof data.token !== "string") {
          if (!cancelled) setError(true);
          return;
        }
        window.localStorage.setItem("cms_jwt", data.token);
        const searchParams = new URLSearchParams(window.location.search);
        const redirectUrl = searchParams.get("redirect") || "/";
        router.replace(redirectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
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
            <p className="mt-2 text-sm text-muted">
              El enlace puede haber expirado. Vuelve a intentarlo.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-ink">
              Completando acceso…
            </h1>
            <p className="mt-2 text-sm text-muted">
              Iniciando tu sesión.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
