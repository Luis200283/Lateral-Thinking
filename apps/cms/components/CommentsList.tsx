"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  dangerActionClass,
  inlineActionClass,
  Meta,
  Panel,
  TextInput,
} from "./ui";
import {
  ApiError,
  deleteComment,
  getApiStatus,
  listComments,
  type CmsCommentItem,
} from "../lib/cms-api";

/** Normaliza texto para buscar: minúsculas y sin acentos. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** ¿Coincide el comentario con la consulta (ya normalizada)? */
function matchesQuery(comment: CmsCommentItem, query: string): boolean {
  if (!query) return true;
  return normalize(
    [
      comment.content,
      comment.authorName ?? "",
      comment.authorEmail ?? "",
      comment.user?.name ?? "",
      comment.post.title,
      comment.post.slug,
    ].join(" "),
  ).includes(query);
}

/**
 * Lista de comentarios con búsqueda local. Con `postId` acota a un post
 * (mostrando "Sin comentarios en este post." si no hay); sin él muestra
 * todos (se publican automáticamente en el blog). El AuthGuard lo pone la
 * página que lo usa.
 */
export function CommentsList({ postId }: { postId?: string }) {
  const [items, setItems] = useState<CmsCommentItem[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

  if (items === null) {
    return <Meta className="uppercase">Cargando comentarios…</Meta>;
  }

  const scoped = postId ? items.filter((c) => c.post.id === postId) : items;
  const normalizedQuery = normalize(query.trim());
  const filtered = scoped.filter((c) => matchesQuery(c, normalizedQuery));

  return (
    <div className="grid gap-4">
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

      {scoped.length > 0 ? (
        <div className="grid gap-2">
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por contenido, autor o post…"
            aria-label="Buscar comentarios"
            className="sm:max-w-md"
          />
          <Meta>
            {filtered.length} de {scoped.length} comentarios
          </Meta>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="grid gap-4">
          {filtered.map((c) => (
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
      ) : !offline ? (
        <Panel>
          <Meta className="uppercase">
            {scoped.length > 0
              ? `Sin resultados para “${query.trim()}”.`
              : postId
                ? "Sin comentarios en este post."
                : "Sin comentarios todavía."}
          </Meta>
        </Panel>
      ) : null}
    </div>
  );
}
