"use client";

import { ActionButton } from "./ui";

function formatMoment(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Aviso de respaldo local recuperable: aparece al abrir un documento del
 * que quedó una copia del autoguardado más nueva que el servidor. El autor
 * decide si la aplica o la descarta; nada se sobreescribe solo.
 */
export function LocalDraftBanner({
  savedAt,
  onRecover,
  onDiscard,
}: {
  savedAt: string;
  onRecover: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="status"
      className="mt-6 flex flex-col gap-3 rounded-card border-[1.5px] border-ink bg-sun px-4 py-3 text-on-accent shadow-[3px_3px_0_var(--color-ink)] sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 font-mono text-xs uppercase leading-relaxed tracking-[0.12em]">
        Respaldo local del {formatMoment(savedAt)} · el servidor no tiene estos
        cambios.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <ActionButton
          variant="outline"
          size="sm"
          onClick={onDiscard}
        >
          Descartar
        </ActionButton>
        <ActionButton size="sm" onClick={onRecover}>
          Recuperar
        </ActionButton>
      </div>
    </div>
  );
}
