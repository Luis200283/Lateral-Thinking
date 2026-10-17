"use client";

/**
 * Editor markdown basado en @mdxeditor/editor.
 *
 * NOTA SSR: MDXEditor accede a `window`/`document` durante el import y
 * rompe el prerender/SSG. NO importarlo directamente en un Server Component:
 * las páginas lo cargan con `next/dynamic(..., { ssr: false })`:
 *
 *   const MdxEditor = dynamic(() => import("../../components/MdxEditor"), {
 *     ssr: false,
 *     loading: () => <p>Cargando editor…</p>,
 *   });
 *
 * Plugins completos de la demo de MDXEditor: headings, listas, cita, regla
 * horizontal, atajos markdown, links (con diálogo), imágenes (diálogo URL/alt),
 * tablas, bloques de código editables con CodeMirror y toolbar curada. El
 * markdown resultante es HTML estándar (`<u>` para subrayado, `<table>`,
 * `<img>`, etc.), así que apps/web lo renderiza saneado con rehype-raw +
 * rehype-sanitize (ver apps/web/components/Markdown.tsx).
 */

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeCodeMirrorLanguage,
  codeBlockPlugin,
  codeMirrorPlugin,
  ConditionalContents,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { forwardRef } from "react";

interface MdxEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
}

const MdxEditor = forwardRef<MDXEditorMethods, MdxEditorProps>(function MdxEditor(
  { initialValue, onChange },
  ref,
) {
  return (
    <MDXEditor
      ref={ref}
      markdown={initialValue}
      onChange={onChange}
      contentEditableClassName="cms-mdx"
      // La clase viaja también al contenedor de diálogos que MDXEditor
      // monta en document.body (fuera de `.cms-mdx-scope`): así el capeado
      // de variables de tema (app/globals.css) alcanza link/imagen/tabla.
      className="cms-mdx-dialog"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: "JavaScript",
            ts: "TypeScript",
            tsx: "TSX",
            jsx: "JSX",
            css: "CSS",
            html: "HTML",
            markdown: "Markdown",
            json: "JSON",
            bash: "Bash",
            python: "Python",
          },
        }),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertCodeBlock />
              {/* Solo visible con un bloque de código enfocado: sin
                  editorInFocus$ (null al primer render) el selector lanza
                  "Cannot read properties of null (reading 'rootNode')". */}
              <ConditionalContents
                options={[
                  {
                    when: (editor) => editor?.editorType === "codeblock",
                    contents: () => <ChangeCodeMirrorLanguage />,
                  },
                ]}
              />
              <InsertThematicBreak />
            </>
          ),
        }),
      ]}
    />
  );
});

export default MdxEditor;
