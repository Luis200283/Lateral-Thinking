"use client";

import { useEffect, useRef, useState } from "react";
import { Button, SignInModal, type SignInProvider } from "@repo/ui/playground";
import { CMS_API_URL } from "../lib/api";

interface UserInfo {
  name: string;
  email: string;
}

export function SignInMenu() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<SignInProvider[]>([]);

  useEffect(() => {
    let cancelled = false;

    // El estado "logueado" se deriva del JWT (cms_jwt), igual que en
    // Comments.tsx: GET /auth/session no existe en Better Auth y devolvía
    // 404, así que el navbar nunca reflejaba el login (Google/GitHub/magic
    // link) al volver de /auth/callback. Sin JWT local se intenta
    // recuperar de la cookie de sesión vía GET /auth/token.
    async function detectSession() {
      let token: string | null = null;
      try {
        token = window.localStorage.getItem("cms_jwt");
      } catch {
        token = null;
      }
      if (!token) {
        try {
          const res = await fetch(`${CMS_API_URL}/auth/token`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = (await res.json()) as { token?: unknown };
            if (typeof data.token === "string") token = data.token;
          }
        } catch {}
        if (token) {
          try {
            window.localStorage.setItem("cms_jwt", token);
          } catch {}
        }
      }
      if (!cancelled) setSignedIn(Boolean(token));
    }

    detectSession();
    fetch(`${CMS_API_URL}/providers`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { google?: boolean; github?: boolean } | null) => {
        if (cancelled || !data) return;
        const enabled: SignInProvider[] = [];
        if (data.google) enabled.push("google");
        if (data.github) enabled.push("github");
        setProviders(enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setUserInfo(null);
      return;
    }
    let token: string | null = null;
    try {
      token = window.localStorage.getItem("cms_jwt");
    } catch {
      token = null;
    }
    if (!token) {
      setSignedIn(false);
      return;
    }

    let cancelled = false;
    fetch(`${CMS_API_URL}/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("no session");
        return res.json();
      })
      .then((data: { user?: { name?: unknown; email?: unknown } }) => {
        if (cancelled || !data?.user) return;
        setUserInfo({
          name: typeof data.user.name === "string" ? data.user.name : "",
          email: typeof data.user.email === "string" ? data.user.email : "",
        });
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

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

  async function signOut() {
    try {
      // Better Auth exige body JSON en sign-out: sin él responde 415 y la
      // cookie de sesión sobrevive (el usuario "cerraba sesión" y seguía
      // logueado al recargar).
      await fetch(`${CMS_API_URL}/auth/sign-out`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch {}
    try {
      window.localStorage.removeItem("cms_jwt");
    } catch {}
    setSignedIn(false);
    setUserInfo(null);
    setMenuOpen(false);
  }

  if (signedIn && userInfo) {
    return (
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-pill border-[1.5px] border-ink bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-ink shadow-[2px_2px_0_var(--color-ink)] transition-colors hover:bg-paper"
        >
          <span
            className="max-w-[80px] truncate"
            style={{
              maskImage: "linear-gradient(to right, black 80%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, black 80%, transparent)",
            }}
          >
            {userInfo.name}
          </span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 fill-ink">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-card border-[1.5px] border-ink bg-surface p-4 shadow-[4px_4px_0_var(--color-ink)]">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-ink">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-ink">
                  {userInfo.name}
                </p>
                {userInfo.email && (
                  <p className="truncate font-mono text-xs text-muted">
                    {userInfo.email}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-4 w-full rounded-pill border-[1.5px] border-ink bg-surface px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:bg-paper"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        as="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Iniciar sesión
      </Button>
      <SignInModal
        open={open}
        onClose={() => setOpen(false)}
        apiUrl={CMS_API_URL}
        providers={providers}
        magicCallbackUrl={`/auth/callback?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
        onSuccess={(token) => {
          window.localStorage.setItem("cms_jwt", token);
          setSignedIn(true);
          setOpen(false);
        }}
      />
    </>
  );
}
