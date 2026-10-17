"use client";

import { Button, Tag, cn } from "@repo/ui/playground";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "../../components/AuthGuard";
import {
  Alert,
  dangerActionClass,
  inlineActionClass,
  Meta,
  PageHeader,
  Panel,
  TextInput,
} from "../../components/ui";
import {
  ApiError,
  deletePost,
  getApiStatus,
  listPosts,
  type CmsPostItem,
} from "../../lib/cms-api";

const thClass =
  "px-3 py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted";
const tdClass = "px-3 py-3 align-top text-sm";

/** Normaliza texto para buscar: minúsculas y sin acentos. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Cabecera única de la pantalla: la reutilizan el estado "cargando" y el listado. */
const header = (
  <PageHeader kicker="// CONTENIDO" title="Posts">
    <Button href="/posts/nuevo" variant="outline" size="sm">
      + Nuevo post
    </Button>
  </PageHeader>
);

function PostsList() {
  const [items, setItems] = useState<CmsPostItem[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { baseUrl } = getApiStatus();

  async function refresh() {
    const res = await listPosts();
    if (res === null) {
      setOffline(true);
      setItems([]);
    } else {
      setOffline(false);
      setItems(res.items);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`¿Eliminar “${title}”?`)) return;
    setError(null);
    try {
      await deletePost(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `No se pudo eliminar (${err.message}).` : "Error inesperado.");
    }
  }

  if (items === null) {
    return (
      <section className="grid gap-6">
        {header}
        <Meta className="uppercase">Cargando posts…</Meta>
      </section>
    );
  }

  const normalizedQuery = normalize(query.trim());
  const filtered = normalizedQuery
    ? items.filter((p) =>
        normalize(
          [
            p.title,
            p.slug,
            ...(p.tags?.flatMap((t) => [t.name, t.slug]) ?? []),
          ].join(" "),
        ).includes(normalizedQuery),
      )
    : items;

  return (
    <section className="grid gap-6">
      {header}

      {offline ? (
        <Alert tone="warn" role="alert">
          API no disponible ({baseUrl}). Lista vacía como fallback; el build no se
          rompe.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-2">
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, slug o tags…"
            aria-label="Buscar posts"
            className="sm:max-w-md"
          />
          <Meta>
            {filtered.length} de {items.length} posts
          </Meta>
        </div>
      ) : null}

      {items.length === 0 && !offline ? (
        <Panel>
          <Meta className="uppercase">Sin posts todavía. Crea el primero.</Meta>
        </Panel>
      ) : null}

      {items.length > 0 && filtered.length === 0 ? (
        <Panel>
          <Meta className="uppercase">
            Sin resultados para “{query.trim()}”.
          </Meta>
        </Panel>
      ) : null}

      {filtered.length > 0 ? (
        <Panel className="overflow-x-auto p-0">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <caption className="sr-only">Posts del CMS</caption>
            <thead className="border-b-[1.5px] border-ink">
              <tr>
                <th scope="col" className={thClass}>
                  Título
                </th>
                <th scope="col" className={thClass}>
                  Estado
                </th>
                <th scope="col" className={thClass}>
                  Vistas
                </th>
                <th scope="col" className={thClass}>
                  Coment.
                </th>
                <th scope="col" className={thClass}>
                  Tags
                </th>
                <th scope="col" className={thClass}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line last:border-b-0 hover:bg-paper"
                >
                  <td className={tdClass}>
                    <span className="font-display font-semibold tracking-[-0.01em]">
                      {p.title}
                    </span>
                    <Meta className="mt-0.5">/{p.slug}</Meta>
                  </td>
                  <td className={tdClass}>
                    <Tag tone={p.status === "PUBLISHED" ? "mint" : "sun"}>
                      {p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}
                    </Tag>
                  </td>
                  <td className={cn(tdClass, "font-mono")}>
                    {p._count ? p._count.views : "—"}
                  </td>
                  <td className={cn(tdClass, "font-mono")}>
                    {p._count ? (
                      <Link
                        href={`/posts/${p.id}/comentarios`}
                        className="underline decoration-ink/30 decoration-2 underline-offset-4 transition-colors hover:decoration-ink"
                      >
                        {p._count.comments}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={tdClass}>
                    <span className="flex flex-wrap gap-1.5">
                      {p.tags && p.tags.length > 0 ? (
                        p.tags.map((t) => (
                          <Tag key={t.slug} tone="plain">
                            {t.name}
                          </Tag>
                        ))
                      ) : (
                        <Meta>—</Meta>
                      )}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className="flex flex-wrap items-center gap-3">
                      <Link href={`/posts/${p.id}`} className={inlineActionClass}>
                        Editar
                      </Link>
                      <Link
                        href={`/posts/${p.id}/comentarios`}
                        className={inlineActionClass}
                      >
                        Comentarios
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onDelete(p.id, p.title)}
                        className={`${inlineActionClass} ${dangerActionClass}`}
                      >
                        Eliminar
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}
    </section>
  );
}

export default function PostsPage() {
  return (
    <AuthGuard>
      <PostsList />
    </AuthGuard>
  );
}
