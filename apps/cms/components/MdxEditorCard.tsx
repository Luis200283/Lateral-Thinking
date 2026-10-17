"use client";

import dynamic from "next/dynamic";
import { Kicker, Meta, Panel } from "./ui";

/**
 * Tarjeta del editor MDX: borde tinta + cabecera mono. Centraliza el
 * `dynamic(..., { ssr: false })` (MDXEditor toca `window` en el import) y el
 * envoltorio `.cms-mdx-scope` que re-mapea sus variables de tema
 * (ver app/globals.css), para que herede la paleta del CMS en claro y oscuro.
 */

const MdxEditor = dynamic(() => import("./MdxEditor"), {
  ssr: false,
  loading: () => (
    <Panel className="p-0">
      <div className="border-b-[1.5px] border-ink px-5 py-3">
        <Kicker>// CONTENIDO (MARKDOWN)</Kicker>
      </div>
      <div className="px-5 py-6">
        <Meta className="uppercase">Cargando editor…</Meta>
      </div>
    </Panel>
  ),
});

export function MdxEditorCard({
  value,
  onChange,
  ready = true,
}: {
  value: string;
  onChange: (value: string) => void;
  /**
   * El editor solo se monta cuando hay markdown cargado: MDXEditor rompe con
   * `initialValue` vacío (misma guarda que tenía la pantalla de edición).
   * Mientras tanto se dibuja la tarjeta con su marcador, sin salto de layout.
   */
  ready?: boolean;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[1.5px] border-ink px-5 py-3">
        <Kicker>// CONTENIDO (MARKDOWN)</Kicker>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
          MDX
        </span>
      </div>
      <div className="cms-mdx-scope">
        {ready ? (
          <MdxEditor initialValue={value} onChange={onChange} />
        ) : (
          <div className="px-5 py-6">
            <Meta className="uppercase">Cargando editor…</Meta>
          </div>
        )}
      </div>
    </Panel>
  );
}
