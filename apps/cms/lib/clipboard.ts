"use client";

/**
 * Copia de texto robusta para el editor.
 *
 * El botón «copiar enlace» del editor (LinkPreview de MDXEditor) llama
 * directamente a `navigator.clipboard.writeText` y, si esa promesa se rechaza
 * o ausente, no pasa nada: el autor ve que el botón «no funciona». Eso ocurre
 * fuera de contexto seguro (p. ej. abrir el CMS por IP en LAN), sin gesto de
 * usuario reconocido, o con el permiso de portapapeles denegado.
 *
 * Esta envoltura mantiene la API nativa cuando funciona y cae a
 * `document.execCommand("copy")` (textarea oculto) cuando falla, de modo que
 * el flujo acabe igual: texto en el portapapeles y el aviso «¡Copiado!».
 */

let installed = false;

/** Copia con la técnica antigua: textarea fuera de pantalla + execCommand. */
function copyViaSelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);

  const selection = document.getSelection();
  const previous =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  let ok = false;
  try {
    area.select();
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  area.remove();
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
}

/**
 * Instala una sola vez el fallback sobre `navigator.clipboard.writeText`.
 * Idempotente: llamarla en cada montaje del editor es seguro.
 */
export function installClipboardFallback(): void {
  if (installed || typeof navigator === "undefined") return;
  installed = true;

  const clipboard = navigator.clipboard;

  // Sin Clipboard API (contexto no seguro) definimos un objeto mínimo: es lo
  // único que necesita MDXEditor para copiar.
  if (!clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (!copyViaSelection(String(text))) {
            throw new Error("clipboard_unavailable");
          }
        },
      },
    });
    return;
  }

  const nativeWrite = clipboard.writeText?.bind(clipboard);
  Object.defineProperty(clipboard, "writeText", {
    configurable: true,
    writable: true,
    value: async (text: string) => {
      if (nativeWrite) {
        try {
          await nativeWrite(text);
          return;
        } catch {
          // Sigue al fallback (permiso denegado, documento sin foco, etc.).
        }
      }
      if (!copyViaSelection(String(text))) {
        throw new Error("clipboard_unavailable");
      }
    },
  });
}
