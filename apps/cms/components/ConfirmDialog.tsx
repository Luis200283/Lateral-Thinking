"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ActionButton } from "./ui";

/**
 * Confirmación con el estilo del CMS para acciones destructivas; sustituye a
 * window.confirm. Mismo patrón que PostSettingsModal: portal a document.body
 * (un ancestro con `backdrop-filter` rompería `position: fixed`), cierre con
 * Escape o clic fuera, trampa de Tab, bloqueo del scroll de fondo y foco
 * inicial en Cancelar para que la acción segura reciba el foco.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  working = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Mientras trabaja, el botón se deshabilita y el diálogo no se cierra. */
  working?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Bloquea el scroll del body mientras el diálogo está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const cancel = dialogRef.current?.querySelector<HTMLElement>(
      "[data-confirm-cancel]",
    );
    cancel?.focus();
  }, [open]);

  if (!open || !mounted) return null;

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!working) onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-md"
      onClick={() => {
        if (!working) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-card border-[1.5px] border-ink bg-surface p-6 shadow-[6px_6px_0_var(--color-ink)]"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-coral-ink">
          // confirmar
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <ActionButton
            data-confirm-cancel
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancelar
          </ActionButton>
          <ActionButton size="sm" disabled={working} onClick={onConfirm}>
            {working ? "Eliminando…" : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
