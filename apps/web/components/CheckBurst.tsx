"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const PARTICLE_COUNT = 12;
const DURATION_MS = 2400;
const REDUCED_HOLD_MS = 3000;

interface Particle {
  id: number;
  tx: string;
  ty: string;
  rot: string;
  square: boolean;
  size: number;
}

/**
 * Confirmación de envío: overlay fijo centrado en pantalla (independiente
 * del scroll) con el check, 12 partículas (✓ y cuadraditos) y el texto
 * "Comentario enviado". Mecánica inspirada en el confeti de About-Me
 * (partículas DOM imperativas + keyframes CSS, sin librerías).
 *
 * - Portal a document.body tras montar: evita clipping/stacking del form.
 * - pointer-events-none: no bloquea clics ni roba foco (todo decorativo,
 *   salvo el role="status" que anuncia el resultado).
 * - prefers-reduced-motion: solo el check estático, sin partículas ni pop.
 */
export default function CheckBurst() {
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(
      () => setGone(true),
      reduced ? REDUCED_HOLD_MS : DURATION_MS,
    );
    return () => window.clearTimeout(t);
  }, [reduced]);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 - Math.PI / 2;
        const distance = 80 + (i % 3) * 22;
        return {
          id: i,
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          rot: `${(i % 2 === 0 ? 1 : -1) * (45 + i * 14)}deg`,
          square: i % 3 === 0,
          size: i % 3 === 0 ? 8 + (i % 2) * 3 : 11 + (i % 3) * 2,
        };
      }),
    [],
  );

  if (!mounted || gone) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-paper/50 p-4 backdrop-blur-[2px]"
      style={
        reduced
          ? undefined
          : { animation: `cb-exit ${DURATION_MS}ms ease-out forwards` }
      }
    >
      <style>{`
        @keyframes cb-pop {
          0% { transform: scale(0) rotate(-12deg); opacity: 0; }
          55% { transform: scale(1.18) rotate(3deg); opacity: 1; }
          75% { transform: scale(0.94) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes cb-particle {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.35) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes cb-exit {
          0%, 78% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cb-text {
          0% { transform: translateY(6px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-mint text-on-accent shadow-[3px_3px_0_var(--color-ink)]"
            style={
              reduced
                ? undefined
                : {
                    animation:
                      "cb-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                  }
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>

          {!reduced
            ? particles.map((p) => (
                <span
                  key={p.id}
                  aria-hidden="true"
                  className={`absolute ${
                    p.square
                      ? "rounded-[2px] bg-sun"
                      : "font-mono leading-none text-coral-ink"
                  }`}
                  style={
                    {
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      left: "50%",
                      top: "50%",
                      marginLeft: `${-p.size / 2}px`,
                      marginTop: `${-p.size / 2}px`,
                      "--tx": p.tx,
                      "--ty": p.ty,
                      "--rot": p.rot,
                      animation:
                        "cb-particle 1.1s cubic-bezier(0.17, 0.67, 0.35, 1) both",
                    } as React.CSSProperties
                  }
                >
                  {p.square ? "" : "✓"}
                </span>
              ))
            : null}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p
            className="font-display text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl"
            style={
              reduced
                ? undefined
                : { animation: "cb-text 0.4s ease-out 0.15s both" }
            }
          >
            Comentario enviado
          </p>
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-mint-ink">
            Tu comentario ya está publicado.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
