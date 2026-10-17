"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/**
 * Vista previa fiel del post publicado: mismo pipeline que
 * apps/web/components/Markdown.tsx (react-markdown + remark-gfm +
 * rehype-raw + rehype-sanitize + rehype-slug) y misma estructura que el
 * artículo de la web: título grande, portada, extracto con borde coral,
 * separador y contenido. El markdown se usa tal cual, pero saneado: el HTML
 * embebido (p. ej. `<u>` del subrayado de MDXEditor) se interpreta sin abrir
 * la puerta a `<script>`.
 *
 * El estilo del markdown vive en `.cms-preview` (app/globals.css), réplica
 * del `.md` de apps/web.
 */

const sanitizeSchema = {
  ...defaultSchema,
  // El subrayado de MDXEditor emite `<u>`; GitHub (defaultSchema) no lo
  // incluye. El resto (headings con id de rehype-slug, tablas GFM, `<strong>`,
  // `<em>`, `<img>`, `<pre>`) ya está permitido por defecto.
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};

export function MarkdownPreview({
  title,
  excerpt,
  coverImage,
  content,
}: {
  title: string;
  excerpt: string;
  coverImage: string;
  content: string;
}) {
  return (
    <div className="mx-auto mt-10 w-full max-w-[820px] rounded-card border-[1.5px] border-ink bg-surface px-8 py-10 shadow-[3px_3px_0_var(--color-ink)] sm:px-10">
      <article>
        <header>
          <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
            // VISTA PREVIA
          </p>
          <h1 className="text-balance font-display text-[clamp(2.25rem,5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.03em]">
            {title.trim() || "Sin título"}
          </h1>
        </header>

        {coverImage.trim() ? (
          <div className="mt-8 overflow-hidden rounded-card border-[1.5px] border-ink bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={`Portada de ${title.trim() || "el post"}`}
              className="block h-auto w-full"
            />
          </div>
        ) : null}

        {excerpt.trim() ? (
          <p className="mt-8 border-l-[3px] border-coral pl-4 text-lg leading-relaxed text-muted">
            {excerpt}
          </p>
        ) : null}

        <hr className="mt-10 border-0 border-t-[1.5px] border-ink/15" />

        {content.trim() ? (
          <div className="cms-preview">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-muted">
            Sin contenido todavía.
          </p>
        )}
      </article>
    </div>
  );
}
