"use client";

import { useEffect } from "react";
import { trackView } from "../lib/api";

function getSessionId(): string {
  try {
    const KEY = "lt:session";
    let sid = window.localStorage.getItem(KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `anon-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
      window.localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

/**
 * Registra UNA vista por sesion de pestaña y slug.
 * Fire-and-forget: si la API esta apagada no rompe nada (trackView -> false).
 */
export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    let already = false;
    try {
      const KEY = `lt:viewed:${slug}`;
      already = window.sessionStorage.getItem(KEY) === "1";
      if (!already) window.sessionStorage.setItem(KEY, "1");
    } catch {
      // sessionStorage no disponible: se intenta el POST igualmente una vez.
    }
    if (already) return;
    const referrer =
      typeof document !== "undefined" && document.referrer
        ? document.referrer
        : undefined;
    void trackView(slug, getSessionId(), referrer);
  }, [slug]);

  return null;
}
