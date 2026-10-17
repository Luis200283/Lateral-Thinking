import Link from "next/link";
import { Button, Tag } from "@repo/ui/playground";
import type { PostSummary } from "../lib/api";
import { postMeta, tagTone } from "../lib/ui";

/**
 * Tarjeta de artículo en el lenguaje Playground: borde tinta 1.5px, sombra
 * dura offset, esquinas card, tags como chips mono y meta en mono. Sin
 * animaciones decorativas: solo el lift corto de hover.
 */
export default function PostCard({
  post,
  index,
}: {
  post: PostSummary;
  /** Índice dentro de su lista: alimenta el numerador mono 01/02/03. */
  index?: number;
}) {
  const meta = postMeta(post);

  return (
    <article className="group flex h-full flex-col gap-4 rounded-card border-[1.5px] border-ink bg-surface p-6 shadow-[6px_6px_0_var(--color-ink)] transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
          {meta.join(" · ")}
        </p>
        {typeof index === "number" ? (
          <span
            aria-hidden="true"
            className="font-mono text-xs text-muted tabular-nums"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      <h3 className="text-balance font-display text-2xl font-bold leading-[1.1] tracking-[-0.02em]">
        <Link
          href={`/blog/${post.slug}`}
          className="decoration-ink/40 decoration-2 underline-offset-4 transition-colors group-hover:underline"
        >
          {post.title}
        </Link>
      </h3>

      {post.excerpt ? (
        <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">
          {post.excerpt}
        </p>
      ) : null}

      {post.tags && post.tags.length > 0 ? (
        <ul className="mt-auto flex flex-wrap gap-2 pt-1">
          {post.tags.map((tag) => (
            <li key={tag.slug}>
              <Link
                href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                className="inline-block transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Tag tone={tagTone(tag.slug)}>#{tag.name}</Tag>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        href={`/blog/${post.slug}`}
        size="sm"
        variant="ghost"
        className="-ml-1 px-1"
      >
        Leer →
      </Button>
    </article>
  );
}
