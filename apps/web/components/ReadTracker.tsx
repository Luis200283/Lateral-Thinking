"use client";

import { useEffect, useRef } from "react";
import { trackHeartbeat } from "../lib/api";

/**
 * Mide lectura activa (segundos con pestaña visible) y profundidad maxima
 * de scroll, con "heartbeat" real cada 15 s a `POST /posts/:slug/heartbeat`.
 *
 * La API acumula `activeSeconds` (suma) y `maxScrollDepth` (max) por
 * (postId, sessionId), así que cada latido envía el delta (15 s) y el
 * máximo actual 0..100; `completed` = scroll >= 90 %. Fire-and-forget:
 * si la API está apagada no rompe nada. Además emite `window event
 * "lt:heartbeat"` para depurar.
 */
export const HEARTBEAT_EVENT = "lt:heartbeat";
export const HEARTBEAT_MS = 15_000;
const COMPLETED_AT = 0.9;

export interface HeartbeatDetail {
  slug: string;
  activeSeconds: number;
  scrollDepth: number;
}

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

export default function ReadTracker({ slug }: { slug: string }) {
  const stats = useRef({ activeSeconds: 0, maxScroll: 0 });
  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    stats.current = { activeSeconds: 0, maxScroll: 0 };
    const sessionId = getSessionId();

    const measureScroll = (): void => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      const ratio = total > 0 ? Math.min(1, el.scrollTop / total) : 0;
      if (ratio > stats.current.maxScroll) stats.current.maxScroll = ratio;
    };
    measureScroll();
    window.addEventListener("scroll", measureScroll, { passive: true });

    const beat = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      stats.current.activeSeconds += HEARTBEAT_MS / 1000;
      measureScroll();
      const scrollDepth =
        Math.round(stats.current.maxScroll * 100) / 100;
      const detail: HeartbeatDetail = {
        slug: slugRef.current,
        activeSeconds: stats.current.activeSeconds,
        scrollDepth,
      };
      window.dispatchEvent(new CustomEvent<HeartbeatDetail>(HEARTBEAT_EVENT, { detail }));
      void trackHeartbeat(slugRef.current, {
        sessionId,
        activeSeconds: HEARTBEAT_MS / 1000,
        maxScrollDepth: Math.round(stats.current.maxScroll * 100),
        completed: stats.current.maxScroll >= COMPLETED_AT,
      });
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(beat);
      window.removeEventListener("scroll", measureScroll);
    };
  }, [slug]);

  return null;
}
