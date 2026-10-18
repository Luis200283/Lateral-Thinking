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

import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
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

/**
 * Consola de los bloques de código: misma piel que un `<pre>` publicado
 * (tokens `--color-terminal`, que por diseño NO se invierten: una consola
 * es una consola en claro y en oscuro). MDXEditor incrusta su propio tema
 * `basicLight` de CodeMirror después de estas extensiones, así que cada
 * valor lleva `!important` para ganar el empate de especificidad; los
 * selectores con `&.cm-editor` suben un nivel más por lo mismo.
 */
const codeMirrorConsole = [
  EditorView.theme(
    {
      "&.cm-editor": {
        backgroundColor: "var(--color-terminal) !important",
        color: "var(--color-terminal-text) !important",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono)",
        fontSize: "0.85rem",
        lineHeight: "1.6",
      },
      ".cm-content": { caretColor: "var(--color-sun)" },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--color-sun) !important",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor:
            "color-mix(in oklab, var(--color-sun) 30%, transparent) !important",
        },
      ".cm-activeLine": {
        backgroundColor:
          "color-mix(in oklab, var(--color-terminal-text) 6%, transparent) !important",
      },
      ".cm-gutters": {
        backgroundColor: "transparent !important",
        color: "var(--color-terminal-dim) !important",
        border: "none !important",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent !important",
        color: "var(--color-terminal-text) !important",
      },
    },
    { dark: true },
  ),
  syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: [
          tags.keyword,
          tags.operatorKeyword,
          tags.definitionKeyword,
          tags.moduleKeyword,
          tags.controlKeyword,
          tags.modifier,
        ],
        color: "var(--color-coral) !important",
      },
      {
        tag: [tags.string, tags.special(tags.string), tags.regexp, tags.escape],
        color: "var(--color-mint) !important",
      },
      {
        tag: [
          tags.number,
          tags.bool,
          tags.null,
          tags.atom,
          tags.constant(tags.name),
        ],
        color: "var(--color-sun) !important",
      },
      {
        tag: [
          tags.function(tags.variableName),
          tags.function(tags.propertyName),
          tags.definition(tags.variableName),
          tags.definition(tags.propertyName),
          tags.labelName,
        ],
        color: "var(--color-violet) !important",
      },
      {
        tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
        color: "var(--color-terminal-dim) !important",
        fontStyle: "italic",
      },
      {
        tag: [tags.operator, tags.punctuation, tags.separator, tags.bracket],
        color: "var(--color-terminal-dim) !important",
      },
      {
        tag: [tags.variableName, tags.propertyName, tags.name, tags.typeName],
        color: "var(--color-terminal-text) !important",
      },
      { tag: tags.invalid, color: "var(--color-coral) !important" },
    ]),
  ),
];

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
          codeMirrorExtensions: codeMirrorConsole,
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
