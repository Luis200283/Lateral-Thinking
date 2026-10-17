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
 */

import {
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
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
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
              <CreateLink />
            </>
          ),
        }),
      ]}
    />
  );
});

export default MdxEditor;
