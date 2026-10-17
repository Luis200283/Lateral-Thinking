"use client";

import { useEffect, useState } from "react";
import { Button, SignInModal, type SignInProvider } from "@repo/ui/playground";
import { CMS_API_URL, setToken } from "../lib/cms-api";

/**
 * Botón "Iniciar sesión" del CMS: abre el modal compartido. Tras un login
 * email/password exitoso guarda el JWT (localStorage + cookie espejo) y
 * vuelve al dashboard. El magic link redirige a /auth/callback, que
 * intercambia la sesión por el JWT. Los proveedores sociales se piden a
 * GET /providers para no mostrar botones sin credenciales.
 */
export function SignInMenu() {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<SignInProvider[]>([]);

  useEffect(() => {
    let cancelled = false;
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
        magicCallbackUrl="/auth/callback"
        onSuccess={(token) => {
          setToken(token);
          window.location.href = "/";
        }}
      />
    </>
  );
}
