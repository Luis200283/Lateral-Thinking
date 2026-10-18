"use client";

import { Button, Tag, cn } from "@repo/ui/playground";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "../../components/AuthGuard";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ChatIcon, EyeIcon, PencilIcon, TrashIcon } from "../../components/icons";
import {
  Alert,
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
// align-middle: las filas con tags altos no deben dejar las acciones arriba.
const tdClass = "px-3 py-3 align-middle text-sm";

/** Acción de fila/tarjeta como icono: chip cuadrado con title y aria-label. */
const iconActionClass =
  "grid size-8 shrink-0 place-items-center rounded-chip border-[1.5px] border-ink bg-surface text-ink transition-colors hover:bg-paper";

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
  const [pending, setPending] = useState<{ id: string; title: string } | null>(null);
  const [working, setWorking] = useState(false);
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

  async function confirmDelete() {
    if (!pending) return;
    setError(null);
    setWorking(true);
    try {
      await deletePost(pending.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `No se pudo eliminar (${err.message}).` : "Error inesperado.");
    } finally {
      setWorking(false);
      setPending(null);
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
        <>
          {/* Escritorio (lg+): tabla con el contenido centrado verticalmente.
              overflow-x-auto por si las columnas no caben justo en lg. */}
          <Panel className="hidden overflow-x-auto p-0 lg:block">
            <table className="w-full border-collapse text-left">
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
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/posts/${p.id}`}
                          aria-label={`Editar ${p.title}`}
                          title="Editar"
                          className={iconActionClass}
                        >
                          <PencilIcon className="size-4" />
                        </Link>
                        <Link
                          href={`/posts/${p.id}/comentarios`}
                          aria-label={`Comentarios de ${p.title}`}
                          title="Comentarios"
                          className={iconActionClass}
                        >
                          <ChatIcon className="size-4" />
                        </Link>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => setPending({ id: p.id, title: p.title })}
                          aria-label={`Eliminar ${p.title}`}
                          title="Eliminar"
                          className={`${iconActionClass} text-coral-ink disabled:opacity-60`}
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* Móvil/tablet: una tarjeta por post. La columna minmax(0,1fr)
              evita que los slugs/tags largos ensanchen la rejilla (min-content). */}
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:hidden">
            {filtered.map((p) => (
              <li key={p.id}>
                <Panel className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold leading-snug tracking-[-0.01em]">
                        {p.title}
                      </p>
                      <Meta className="mt-0.5 truncate">/{p.slug}</Meta>
                    </div>
                    <Tag
                      tone={p.status === "PUBLISHED" ? "mint" : "sun"}
                      className="shrink-0"
                    >
                      {p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"}
                    </Tag>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
                      <EyeIcon className="size-3.5" />
                      {p._count ? p._count.views : 0}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
                      <ChatIcon className="size-3.5" />
                      {p._count ? p._count.comments : 0}
                    </span>
                    {p.tags?.map((t) => (
                      <Tag key={t.slug} tone="plain">
                        {t.name}
                      </Tag>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/posts/${p.id}`}
                        aria-label={`Editar ${p.title}`}
                        title="Editar"
                        className={iconActionClass}
                      >
                        <PencilIcon className="size-4" />
                      </Link>
                      <Link
                        href={`/posts/${p.id}/comentarios`}
                        aria-label={`Comentarios de ${p.title}`}
                        title="Comentarios"
                        className={iconActionClass}
                      >
                        <ChatIcon className="size-4" />
                      </Link>
                    </div>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setPending({ id: p.id, title: p.title })}
                      aria-label={`Eliminar ${p.title}`}
                      title="Eliminar"
                      className={`${iconActionClass} text-coral-ink disabled:opacity-60`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `¿Eliminar “${pending.title}”?` : ""}
        description="Se eliminará el post. Esta acción no se puede deshacer."
        working={working}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPending(null)}
      />
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
