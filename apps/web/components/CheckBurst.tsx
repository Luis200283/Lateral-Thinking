"use client";

import { useEffect, useMemo, useState } from "react";

const PARTICLE_COUNT = 12;
const DURATION_MS = 1800;
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
 * Confirmación de envío: círculo con ✓ que hace pop + 12 partículas (✓ y
 * cuadraditos) que se dispersan en círculo y se desvanecen, junto al texto
 * "Send" en font-display. Mecánica inspirada en el confeti de About-Me
 * (partículas DOM imperativas + keyframes CSS, sin librerías).
 *
 * - Sin foco robado: todo es decorativo (aria-hidden) salvo el role="status".
 * - prefers-reduced-motion: solo el check estático, sin partículas ni pop.
 */
export default function CheckBurst() {
  const [gone, setGone] = useState(false);
  const [reduced, setReduced] = useState(false);

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

  if (gone) return null;

  return (
    <div role="status" className="flex flex-col items-start gap-2 py-2">
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
          0%, 82% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        className="relative flex items-center gap-3"
        style={
          reduced ? undefined : { animation: "cb-exit 1.8s ease-out forwards" }
        }
      >
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

        <span className="font-display text-3xl font-bold tracking-[-0.02em] text-ink">
          Send
        </span>

        {!reduced
          ? particles.map((p) => (
              <span
                key={p.id}
                aria-hidden="true"
                className={`absolute left-7 top-7 ${
                  p.square
                    ? "rounded-[2px] bg-sun"
                    : "font-mono leading-none text-coral-ink"
                }`}
                style={
                  {
                    width: `${p.size}px`,
                    height: `${p.size}px`,
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

      <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-mint-ink">
        Recibido: quedará visible tras la moderación.
      </p>
    </div>
  );
}
