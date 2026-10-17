"use client";

import { useCallback, useEffect, useState } from "react";
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
  deleteComment,
  getApiStatus,
  listComments,
  type CmsCommentItem,
} from "../../lib/cms-api";

function CommentsList() {
  const [items, setItems] = useState<CmsCommentItem[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const { baseUrl } = getApiStatus();

  const refresh = useCallback(async () => {
    const res = await listComments();
    if (res === null) {
      setOffline(true);
      setItems([]);
    } else {
      setOffline(false);
      setItems(res.items);
    }
  }, []);

  useEffect(() => {
    setItems(null);
    void refresh();
  }, [refresh]);

  async function onDelete(id: string) {
    if (!window.confirm("¿Eliminar este comentario?")) return;
    setError(null);
    setWorking(id);
    try {
      await deleteComment(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `No se pudo eliminar (${err.message}).` : "Error inesperado.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className="grid gap-6">
      <PageHeader kicker="// COMENTARIOS" title="Comentarios" />

      <Meta className="-mt-5">
        Se publican automáticamente en el blog. Aquí solo puedes eliminarlos.
      </Meta>

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

      {items === null ? (
        <Meta className="uppercase">Cargando comentarios…</Meta>
      ) : items.length === 0 && !offline ? (
        <Panel>
          <Meta className="uppercase">Sin comentarios todavía.</Meta>
        </Panel>
      ) : (
        <ul className="grid gap-4">
          {items.map((c) => (
            <li key={c.id}>
              <Panel className="grid gap-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-display text-sm font-semibold tracking-[-0.01em]">
                    {c.authorName ?? c.user?.name ?? "Anónimo"}
                  </span>
                  {c.authorEmail ? <Meta>{c.authorEmail}</Meta> : null}
                  <Meta>
                    en <span className="text-ink">{c.post.title}</span> /{c.post.slug}
                  </Meta>
                </div>

                <p className="text-[0.9375rem] leading-relaxed text-ink">
                  {c.content}
                </p>

                <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
                  <Meta>{new Date(c.createdAt).toLocaleString("es")}</Meta>
                  <span className="ml-auto flex items-center gap-4">
                    <button
                      type="button"
                      disabled={working === c.id}
                      onClick={() => void onDelete(c.id)}
                      className={`${inlineActionClass} ${dangerActionClass} disabled:opacity-60`}
                    >
                      Eliminar
                    </button>
                  </span>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ComentariosPage() {
  return (
    <AuthGuard>
      <CommentsList />
    </AuthGuard>
  );
}
