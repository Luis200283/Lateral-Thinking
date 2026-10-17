/**
 * Cliente del CMS API (apps/api-cms, puerto 4001).
 *
 * Base URL: `NEXT_PUBLIC_CMS_API_URL` con fallback a `http://localhost:4001`.
 * Auth: JWT Bearer guardado en localStorage (`cms_jwt`) + cookie espejo
 * (`cms_token`) para que el middleware (SSR) pueda redirigir a /login.
 *
 * Flujo login (Better Auth email/password + plugin jwt):
 *   1. POST {API}/auth/sign-in/email { email, password } (credentials:include)
 *      -> crea sesión y deja cookie httpOnly.
 *   2. GET {API}/auth/token (credentials:include) -> { token: "<jwt>" }.
 *   3. Se guarda el JWT y se usa como `Authorization: Bearer` en /me,
 *      /posts, /comments, /stats, /tags.
 *
 * Todas las llamadas que requieren red devuelven `null` (GETs de lectura)
 * o lanzan `ApiError` (mutaciones) en vez de romper el render/SSR:
 * el build y las páginas muestran fallbacks si la API está apagada.
 */

// ------------------------------------------------------------ base / token ---

export const CMS_API_URL =
  process.env.NEXT_PUBLIC_CMS_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4001";

export const TOKEN_KEY = "cms_jwt";
const COOKIE_KEY = "cms_token";

export function getApiStatus(): { baseUrl: string; configured: boolean } {
  return {
    baseUrl: CMS_API_URL,
    configured: Boolean(process.env.NEXT_PUBLIC_CMS_API_URL),
  };
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage lleno o bloqueado: seguimos solo con cookie.
  }
  // Espejo en cookie legible por el middleware (7 días, path /).
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // noop
  }
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Una respuesta 401 significa que la sesión/JWT caducó, NO que la API esté
 * caída. Antes ambos casos devolvían null y las páginas decían "API no
 * disponible", mandando al autor a buscar un problema inexistente. Aquí
 * limpiamos el token y volvemos a /login para renovar la sesión.
 */
function onUnauthorized(): void {
  if (typeof window === "undefined") return;
  clearToken();
  window.location.href = "/login";
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

/** Igual que readError, pero redirige a /login si el fallo es 401 (sesión caducada). */
async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError("unauthorized", 401);
  }
  if (!res.ok) throw new ApiError(await readError(res, fallback), res.status);
}

// ----------------------------------------------------------------- tipos ---

export interface CmsUser {
  id?: string;
  email?: string;
  name?: string | null;
  role?: string;
  [key: string]: unknown;
}

export interface CmsTag {
  name: string;
  slug: string;
}

export type CmsPostStatus = "DRAFT" | "PUBLISHED";

export interface CmsPostItem {
  id: string;
  title: string;
  slug: string;
  status: CmsPostStatus;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  tags?: CmsTag[];
  _count?: { comments: number; views: number };
}

export interface CmsPostDetail extends CmsPostItem {
  content: string;
  author?: { name: string | null; image: string | null };
}

export interface CmsPostList {
  total: number;
  items: CmsPostItem[];
}

export interface CreatePostInput {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  status?: CmsPostStatus;
  tags?: string[];
}

/** PATCH /:id — todos los campos opcionales; excerpt/coverImage aceptan null para limpiar (mirror del schema Zod del servidor). */
export interface UpdatePostInput {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string | null;
  coverImage?: string | null;
  status?: CmsPostStatus;
  tags?: string[];
}

export interface CmsCommentItem {
  id: string;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  createdAt: string;
  user?: { name: string | null; image: string | null } | null;
  post: { id: string; title: string; slug: string };
}

export interface CmsCommentList {
  total: number;
  items: CmsCommentItem[];
}

export interface TopPost {
  id: string;
  title: string;
  slug: string;
  views: number;
}

export interface CmsStats {
  totalPosts: number;
  published: number;
  drafts: number;
  totalViews: number;
  totalComments: number;
  topPosts: TopPost[];
}

// ------------------------------------------------------------------ auth ---

/**
 * Login Better Auth email/password contra {API}/auth.
 * Hace sign-in (cookie de sesión) + GET /auth/token (JWT) y guarda el JWT.
 * Lanza ApiError si las credenciales son inválidas o la API está caída.
 */
export async function login(email: string, password: string): Promise<string> {
  let signIn: Response;
  try {
    signIn = await fetch(`${CMS_API_URL}/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError("api_unreachable", 0);
  }
  if (!signIn.ok) {
    throw new ApiError(await readError(signIn, "invalid_credentials"), signIn.status);
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch(`${CMS_API_URL}/auth/token`, {
      credentials: "include",
      headers: { ...authHeaders() },
    });
  } catch {
    throw new ApiError("api_unreachable", 0);
  }
  if (!tokenRes.ok) {
    throw new ApiError(await readError(tokenRes, "token_error"), tokenRes.status);
  }

  const data = (await tokenRes.json()) as
    | { token?: unknown; data?: { token?: unknown }; jwt?: unknown }
    | string;
  const token =
    typeof data === "string"
      ? data
      : typeof data.token === "string"
        ? data.token
        : typeof data.data?.token === "string"
          ? data.data.token
          : typeof data.jwt === "string"
            ? data.jwt
            : null;
  if (!token) throw new ApiError("token_error", 500);

  setToken(token);
  return token;
}

export async function getMe(): Promise<CmsUser | null> {
  try {
    const res = await fetch(`${CMS_API_URL}/me`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    if (res.status === 401) {
      onUnauthorized();
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: CmsUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------- posts ---

export async function listPosts(): Promise<CmsPostList | null> {
  try {
    // Sin trailing slash: Hono es estricto y /posts/ devuelve 404.
    const res = await fetch(`${CMS_API_URL}/posts`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    if (res.status === 401) {
      onUnauthorized();
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as CmsPostList;
  } catch {
    return null;
  }
}

/** Detalle por :slug (el admin ve drafts; la API pública nunca los muestra). */
export async function getPostBySlug(slug: string): Promise<CmsPostDetail | null> {
  try {
    const res = await fetch(
      `${CMS_API_URL}/posts/${encodeURIComponent(slug)}`,
      { headers: { ...authHeaders() }, cache: "no-store" },
    );
    if (res.status === 401) {
      onUnauthorized();
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as CmsPostDetail;
  } catch {
    return null;
  }
}

export async function createPost(input: CreatePostInput): Promise<CmsPostDetail> {
  let res: Response;
  try {
    // Sin trailing slash: Hono es estricto y /posts/ devuelve 404.
    res = await fetch(`${CMS_API_URL}/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError("api_unreachable", 0);
  }
  await ensureOk(res, "create_failed");
  return (await res.json()) as CmsPostDetail;
}

/** PATCH por :id (estable; el slug es mutable y es la URL pública). */
export async function updatePost(
  id: string,
  input: UpdatePostInput,
): Promise<CmsPostDetail> {
  let res: Response;
  try {
    res = await fetch(`${CMS_API_URL}/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError("api_unreachable", 0);
  }
  await ensureOk(res, "update_failed");
  return (await res.json()) as CmsPostDetail;
}

export async function deletePost(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${CMS_API_URL}/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
  } catch {
    throw new ApiError("api_unreachable", 0);
  }
  await ensureOk(res, "delete_failed");
}

// -------------------------------------------------------------- comments ---

/** Lista completa de comentarios (se publican automáticamente). */
export async function listComments(): Promise<CmsCommentList | null> {
  try {
    const res = await fetch(`${CMS_API_URL}/comments`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    if (res.status === 401) {
      onUnauthorized();
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as CmsCommentList;
  } catch {
    return null;
  }
}

export async function deleteComment(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${CMS_API_URL}/comments/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
  } catch {
    throw new ApiError("api_unreachable", 0);
  }
  await ensureOk(res, "delete_failed");
}

// ----------------------------------------------------------------- stats ---

export async function getStats(): Promise<CmsStats | null> {
  try {
    const res = await fetch(`${CMS_API_URL}/stats`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    if (res.status === 401) {
      onUnauthorized();
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as CmsStats;
  } catch {
    return null;
  }
}
