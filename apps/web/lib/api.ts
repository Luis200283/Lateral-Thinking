/**
 * Cliente tipado minimal para la API publica (apps/api-public).
 *
 * Base URL: `NEXT_PUBLIC_API_URL` con fallback a `http://localhost:4000`.
 * Todas las funciones capturan errores de red y devuelven `null`
 * para que el build estatico (SSG/prerender) nunca rompa si la API
 * esta apagada. Las paginas deciden el fallback visual.
 *
 * Filtros de servidor: `GET /posts` acepta `?tag=` (slug) y `?q=`
 * (búsqueda en título/contenido). El blog pagina en servidor con esos
 * params; no se filtra en cliente.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

/**
 * Base URL del CMS API (apps/api-cms, puerto 4001). Se usa SOLO para el
 * prellenado best-effort de identidad en comentarios (ver Comments.tsx):
 * no importamos el cliente del CMS, replicamos el fetch de /me aquí.
 */
export const CMS_API_URL =
  process.env.NEXT_PUBLIC_CMS_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4001";

// ---------------------------------------------------------------- tipos ---

export interface Tag {
  name: string;
  slug: string;
}

export interface PostAuthor {
  name: string | null;
  image: string | null;
}

export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  author?: PostAuthor;
  tags?: Tag[];
  _count?: { views: number };
}

export interface PaginatedPosts {
  page: number;
  limit: number;
  total: number;
  items: PostSummary[];
}

export interface ProfileAuthor {
  name: string | null;
  image: string | null;
  bio: string | null;
}

export interface ProfileResponse {
  author: ProfileAuthor | null;
  recent: PostSummary[];
  popular: PostSummary[];
}

// `GET /posts/:slug` devuelve el post completo de Prisma (include author,
// tags, _count). Lo tipamos de forma abierta para no acoplar la web al
// schema interno: solo garantizamos los campos que la landing necesita.
export interface PostDetail extends PostSummary {
  content: string;
  commentCount?: number;
}

export interface CommentItem {
  id: string;
  content: string;
  authorName: string | null;
  createdAt: string;
  user?: { name: string | null; image: string | null } | null;
}

// --------------------------------------------------------------- helpers ---

async function safeFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // API apagada / DNS / CORS: la pagina muestra fallback estatico.
    return null;
  }
}

export function getApiStatus(): { baseUrl: string; configured: boolean } {
  return {
    baseUrl: API_URL,
    configured: Boolean(process.env.NEXT_PUBLIC_API_URL),
  };
}

// -------------------------------------------------------------- endpoints ---

/** GET /profile -> { author, recent[5], popular[5] } */
export function getProfile(): Promise<ProfileResponse | null> {
  return safeFetch<ProfileResponse>("/profile");
}

/** GET /posts?page=&limit=&tag=&q= (filtros de servidor, sin filtrar en cliente) */
export function getPosts(
  page = 1,
  limit = 6,
  opts?: { tag?: string; q?: string },
): Promise<PaginatedPosts | null> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (opts?.tag) params.set("tag", opts.tag);
  if (opts?.q) params.set("q", opts.q);
  return safeFetch<PaginatedPosts>(`/posts?${params.toString()}`);
}

/** GET /tags -> [{ name, slug, ... }] (con conteos del servidor) */
export function getTags(): Promise<Tag[] | null> {
  return safeFetch<Tag[]>("/tags");
}

/** GET /posts/:slug */
export function getPost(slug: string): Promise<PostDetail | null> {
  return safeFetch<PostDetail>(`/posts/${encodeURIComponent(slug)}`);
}

/** GET /posts/:slug/comments */
export function getComments(slug: string): Promise<CommentItem[] | null> {
  return safeFetch<CommentItem[]>(`/posts/${encodeURIComponent(slug)}/comments`);
}

/** POST /posts/:slug/view — fire-and-forget desde un Client Component. */
export interface ViewHeartbeatExtras {
  /** Segundos activos acumulados (el endpoint v1 los ignora; listos para fase-3). */
  activeSeconds?: number;
  /** Fraccion maxima de scroll 0..1 (idem). */
  scrollDepth?: number;
}

export async function trackView(
  slug: string,
  sessionId: string,
  referrer?: string,
  extras?: ViewHeartbeatExtras,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_URL}/posts/${encodeURIComponent(slug)}/view`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        // La API v1 valida { sessionId, referrer } con zod y descarta
        // claves desconocidas: enviar extras es seguro y forward-compatible.
        body: JSON.stringify({ sessionId, referrer, ...extras }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** POST /posts/:slug/heartbeat — engagement acumulado en ReadSession. */
export async function trackHeartbeat(
  slug: string,
  input: {
    sessionId: string;
    activeSeconds: number;
    maxScrollDepth: number;
    completed: boolean;
  },
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_URL}/posts/${encodeURIComponent(slug)}/heartbeat`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export interface CreateCommentInput {
  content: string;
  authorName?: string;
  authorEmail?: string;
}

/** POST /posts/:slug/comments — devuelve el comentario creado o `null`. */
export async function postComment(
  slug: string,
  input: CreateCommentInput,
): Promise<CommentItem | null> {
  try {
    const res = await fetch(
      `${API_URL}/posts/${encodeURIComponent(slug)}/comments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as CommentItem;
  } catch {
    return null;
  }
}
