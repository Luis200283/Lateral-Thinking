import type { Metadata } from "next";
import { Button, SectionHeading } from "@repo/ui/playground";
import { ApiOfflineNotice } from "../../components/ApiOfflineNotice";
import PostCard from "../../components/PostCard";
import { getPosts, getTags } from "../../lib/api";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Lateral Thinking",
  description: "Artículos sobre pensamiento lateral, creatividad y resolución de problemas.",
};

interface BlogSearchParams {
  page?: string;
  tag?: string;
  q?: string;
}

const PAGE_SIZE = 9;

function pageHref(page: number, tag: string | null, q: string | null): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

/** `$ ls ~/posts --tag x --q "y"` — el filtro activo, en lenguaje terminal. */
function filterLine(tag: string | null, tagName: string | null, q: string | null): string {
  if (!tag && !q) return "$ ls ~/posts";
  const parts: string[] = [];
  if (tag) parts.push(`--tag ${tagName ?? tag}`);
  if (q) parts.push(`--q "${q}"`);
  return `$ ls ~/posts ${parts.join(" ")}`;
}

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const tag = sp.tag && sp.tag.length > 0 ? sp.tag : null;
  const q = sp.q && sp.q.trim().length > 0 ? sp.q.trim() : null;

  // Filtros de servidor (?tag= y ?q=): la API pagina y filtra, la web no
  // filtra en cliente. Tags para la nav vienen de GET /tags.
  const [data, tags] = await Promise.all([
    getPosts(page, PAGE_SIZE, {
      ...(tag ? { tag } : {}),
      ...(q ? { q } : {}),
    }),
    getTags(),
  ]);
  const offline = data === null;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const tagList =
    tags ??
    (() => {
      const m = new Map<string, string>();
      for (const p of items) {
        for (const t of p.tags ?? []) {
          if (!m.has(t.slug)) m.set(t.slug, t.name);
        }
      }
      return [...m.entries()].map(([slug, name]) => ({ slug, name }));
    })();
  const tagName =
    tag !== null
    ? (tagList.find((t) => t.slug === tag)?.name ?? tag)
    : null;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-10">
      <h1 className="sr-only">Blog — todos los artículos</h1>

      <SectionHeading kicker="// BLOG">Todos los artículos</SectionHeading>

      <p className="mt-6 font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
        {filterLine(tag, tagName, q)}
      </p>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <form
          action="/blog"
          method="get"
          role="search"
          className="flex w-full max-w-xl flex-wrap items-center gap-3"
        >
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          <label className="sr-only" htmlFor="blog-search">
            Buscar artículos
          </label>
          <input
            id="blog-search"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título o contenido…"
            maxLength={200}
            className="min-w-0 flex-1 rounded-pill border-[1.5px] border-ink bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted"
          />
          <Button as="button" type="submit" size="sm">
            Buscar
          </Button>
        </form>

        {tag || q ? (
          <Button href="/blog" size="sm" variant="ghost">
            Quitar filtros ✕
          </Button>
        ) : null}
      </div>

      {tagList.length > 0 ? (
        <nav
          aria-label="Filtrar por etiqueta"
          className="mt-8 flex flex-wrap items-center gap-2.5"
        >
          <Button
            as="a"
            href={q ? `/blog?q=${encodeURIComponent(q)}` : "/blog"}
            size="sm"
            variant={tag === null ? "solid" : "outline"}
            aria-current={tag === null ? "true" : undefined}
          >
            Todas
          </Button>
          {tagList.map((t) => {
            const active = tag === t.slug;
            return (
              <Button
                key={t.slug}
                as="a"
                href={pageHref(1, t.slug, q)}
                size="sm"
                variant={active ? "solid" : "outline"}
                aria-current={active ? "true" : undefined}
              >
                #{t.name}
              </Button>
            );
          })}
        </nav>
      ) : null}

      {offline ? (
        <div className="mt-8" role="alert">
          <ApiOfflineNotice />
        </div>
      ) : null}

      <div className="mt-10">
        {items.length === 0 ? (
          <div className="rounded-card border-[1.5px] border-dashed border-ink/40 bg-surface/60 p-6">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              $ ls ~/posts → 0 resultados
            </p>
            <p className="mt-2 text-sm text-muted">
              {offline
                ? "Sin artículos: la API está apagada."
                : "No hay artículos para este filtro todavía."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p.id} className="h-full">
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="Paginación"
          className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-ink/15 pt-8"
        >
          {safePage > 1 ? (
            <Button
              as="a"
              href={pageHref(safePage - 1, tag, q)}
              size="sm"
              variant="outline"
            >
              ← Anteriores
            </Button>
          ) : (
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted">
              ← inicio
            </span>
          )}

          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted tabular-nums">
            página {safePage}/{totalPages} · {total} artículos
          </p>

          {safePage < totalPages ? (
            <Button
              as="a"
              href={pageHref(safePage + 1, tag, q)}
              size="sm"
              variant="outline"
            >
              Siguientes →
            </Button>
          ) : (
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted">
              fin →
            </span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
