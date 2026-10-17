"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../lib/cms-api";
import { Meta } from "./ui";

/**
 * Guard de cliente: redirige a /login si no hay JWT en localStorage.
 * Complementa al middleware (que mira la cookie espejo `cms_token`):
 * el middleware cubre SSR/navegación directa y este guard cubre el caso
 * en que solo existe el token en localStorage.
 */
export default function AuthGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <Meta className="uppercase" role="status">
        Verificando sesión…
      </Meta>
    );
  }
  return <>{children}</>;
}
