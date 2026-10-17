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

      {items.length === 0 && !offline ? (
        <Panel>
          <Meta className="uppercase">Sin posts todavía. Crea el primero.</Meta>
        </Panel>
      ) : null}

      {items.length > 0 ? (
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
              {items.map((p) => (
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
                    {p._count ? p._count.comments : "—"}
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
