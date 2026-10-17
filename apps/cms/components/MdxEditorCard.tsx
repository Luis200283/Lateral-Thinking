"use client";

import dynamic from "next/dynamic";

/**
 * Editor MDX con aspecto de documento (tipo Google Docs): la toolbar de
 * MDXEditor queda como panel superior sticky (ver `.cms-mdx-scope` en
 * app/globals.css) y el contenido vive en una hoja centrada sobre el fondo
 * paper de la página. Centraliza el `dynamic(..., { ssr: false })` (MDXEditor
 * toca `window` en el import) y el envoltorio `.cms-mdx-scope` que re-mapea
 * sus variables de tema, para que herede la paleta del CMS en claro y oscuro.
 */

const MdxEditor = dynamic(() => import("./MdxEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

/** Marcador sin salto de layout: barra superior + hoja vacía. */
function EditorSkeleton() {
  return (
    <>
      <div className="cms-mdx-placeholder-bar" aria-hidden="true" />
      <div className="mdxeditor-root-contenteditable">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Cargando editor…
        </p>
      </div>
    </>
  );
}

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
   * Mientras tanto se dibuja la misma estructura con un marcador, sin salto
   * de layout.
   */
  ready?: boolean;
}) {
  return (
    <div className="cms-mdx-scope">
      {ready ? (
        <MdxEditor initialValue={value} onChange={onChange} />
      ) : (
        <EditorSkeleton />
      )}
    </div>
  );
}
