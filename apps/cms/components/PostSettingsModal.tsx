"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { PostFields, type PostFormValues } from "./PostFields";

/**
 * Modal de configuración del post: los campos "de formulario" (título, slug,
 * portada, extracto, tags) viven aquí para que la pantalla de edición sea solo
 * una hoja de documento. Reutiliza PostFields tal cual; el estado y el guardado
 * siguen en cada página.
 *
 * Mismo patrón que el SignInModal compartido (packages/ui/src/playground):
 * portal a document.body (un ancestro con `backdrop-filter` rompería
 * `position: fixed`), cierre con Escape y clic fuera, foco inicial en el
 * primer input, trampa de Tab y bloqueo del scroll del body.
 */
export function PostSettingsModal({
  open,
  onClose,
  values,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  values: PostFormValues;
  onChange: (patch: Partial<PostFormValues>) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Bloquea el scroll del body mientras el modal está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Foco inicial en el primer input + trampa básica de Tab dentro del diálogo.
  useEffect(() => {
    if (!open) return;
    const first = dialogRef.current?.querySelector<HTMLElement>("input");
    first?.focus();
  }, [open]);

  if (!open || !mounted) return null;

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configuración del post"
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border-[1.5px] border-ink bg-surface p-6 shadow-[6px_6px_0_var(--color-ink)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-coral-ink">
              // configuración
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
              Ajustes del post
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface font-mono text-sm text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="mt-6">
          <PostFields values={values} onChange={onChange} />
        </div>

        <p className="mt-6 font-mono text-[0.6875rem] leading-relaxed text-muted">
          Los cambios se aplican al guardar el post.
        </p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
