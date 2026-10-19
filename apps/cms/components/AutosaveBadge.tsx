"use client";

import { cn } from "@repo/ui/playground";
import type { AutosaveState } from "../lib/use-autosave";

function hhmm(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * Indicador discreto del autoguardado para el docbar. Se oculta cuando no
 * hay nada pendiente; "saved" = servidor confirmado, "backup" = solo copia
 * local (sin conexión o post publicado). Texto compacto para no desbordar
 * la fila en ningún ancho; el tooltip aclara el estado completo.
 */
export function AutosaveBadge({
  state,
  savedAt,
  className,
}: {
  state: AutosaveState;
  savedAt: string | null;
  className?: string;
}) {
  if (state === "clean") return null;
  const time = savedAt ? hhmm(savedAt) : "";

  const label =
    state === "saving"
      ? "Guardando…"
      : state === "saved"
        ? `✓ ${time}`
        : `local ${time}`;
  const title =
    state === "saving"
      ? "Guardando cambios…"
      : state === "saved"
        ? `Autoguardado en el servidor a las ${time}`
        : `Respaldo local a las ${time} · aún sin confirmar en el servidor`;

  return (
    <span
      aria-live="polite"
      title={title}
      className={cn(
        "whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.12em]",
        state === "backup" ? "text-ink" : "text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}
