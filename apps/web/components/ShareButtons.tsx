"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/playground";

// WhatsApp brand green — documented exception: used ONLY as the WhatsApp
// icon glyph fill. Every other colour in this file comes from theme tokens.
const WHATSAPP_GREEN = "#25D366";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={WHATSAPP_GREEN} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
    </svg>
  );
}

function copyViaSelection(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);

  const range = document.createRange();
  range.selectNodeContents(textarea);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  selection?.removeAllRanges();
  document.body.removeChild(textarea);
  return ok;
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Comparte el enlace en WhatsApp. Dos pasos:
 *   1) Esquema `whatsapp://` para la app nativa/escritorio: si está
 *      instalada, el sistema la abre y el navegador pierde el foco.
 *   2) La web no puede saber si hay handler de `whatsapp://`, así que si
 *      el navegador sigue enfocado tras ~1.2s se cae al destino directo:
 *      en escritorio `web.whatsapp.com/send` (WhatsApp Web logueado, SIN
 *      el interstitial de wa.me); en móvil `wa.me`, que universal-linkea
 *      a la app. En la misma pestaña: el "atrás" vuelve al blog.
 */
function openWhatsApp(text: string): void {
  const encoded = encodeURIComponent(text);
  const appHref = `whatsapp://send?text=${encoded}`;
  const webHref = isMobileDevice()
    ? `https://wa.me/?text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;

  let handoff = false;
  const mark = () => {
    handoff = true;
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") mark();
  };
  window.addEventListener("blur", mark, { once: true });
  document.addEventListener("visibilitychange", onVisibility);

  window.location.href = appHref;

  window.setTimeout(() => {
    window.removeEventListener("blur", mark);
    document.removeEventListener("visibilitychange", onVisibility);
    if (!handoff) window.location.href = webHref;
  }, 1200);
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy Range/Selection path
    }
  }
  return copyViaSelection(text);
}

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [url, setUrl] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function onCopy(): Promise<void> {
    const ok = await copyText(url);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopied(ok);
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  }

  function openPopup(href: string): void {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=540");
  }

  function onAnchorClick(href: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      openPopup(href);
    };
  }

  async function onNativeShare(): Promise<void> {
    try {
      await navigator.share({ title, url });
    } catch {
      // user dismissed or share failed — nothing else to do
    }
  }

  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedinHref = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}`;

  return (
    <section aria-label="Compartir" className="mt-14 border-t-[1.5px] border-ink/15 pt-8">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
        // COMPARTIR
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3" aria-live="polite">
        <Button as="button" onClick={onCopy} size="sm" variant="outline" aria-label="Copiar enlace">
          {copied ? <CheckIcon /> : <LinkIcon />}
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </Button>

        <Button
          as="button"
          onClick={() => openWhatsApp(url)}
          size="sm"
          variant="outline"
          aria-label="Compartir en WhatsApp"
        >
          <WhatsAppIcon />
          WhatsApp
        </Button>

        <Button
          as="a"
          href={xHref}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onAnchorClick(xHref)}
          size="sm"
          variant="outline"
          aria-label="Compartir en X"
          title="Compartir en X"
          className="px-2.5"
        >
          <XIcon />
        </Button>

        <Button
          as="a"
          href={linkedinHref}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onAnchorClick(linkedinHref)}
          size="sm"
          variant="outline"
          aria-label="Compartir en LinkedIn"
        >
          <LinkedInIcon />
          LinkedIn
        </Button>

        {canNativeShare && (
          <Button
            as="button"
            onClick={onNativeShare}
            size="sm"
            variant="outline"
            aria-label="Compartir"
          >
            <ShareIcon />
            Compartir
          </Button>
        )}
      </div>
    </section>
  );
}
