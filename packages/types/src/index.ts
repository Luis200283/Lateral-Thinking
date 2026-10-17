import { z } from "zod";

/**
 * Contratos compartidos entre api-public, api-cms y frontends.
 *
 * Fuente de verdad extraída de:
 * - packages/db/prisma/schema.prisma (modelos Post, Tag, Comment, PostView, ReadSession)
 * - apps/api-public/src/routes/posts.ts (query, comment, view)
 * - apps/api-cms/src/routes/posts.ts (createPost, slugify)
 */

// ---------------------------------------------------------------------------
// Enums (espejo de los enums de Prisma en schema.prisma)
// ---------------------------------------------------------------------------

/** Todos los estados posibles de un Post (enum Status de Prisma). */
export const postStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

/** Estados aceptados al crear/actualizar desde el CMS (sin ARCHIVED directo). */
export const cmsPostStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);

// ---------------------------------------------------------------------------
// Paginación y slugs (query params → usar z.coerce para strings de URL)
// ---------------------------------------------------------------------------

/** ?page=1&limit=10 — usaba `querySchema` en api-public. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(150).default(10),
});

/** Parámetro de ruta `:slug` (Post.slug y Tag.slug, máx. 200 por slugify). */
export const slugSchema = z.string().min(1).max(200);

// ---------------------------------------------------------------------------
// Posts (CMS)
// ---------------------------------------------------------------------------

/** Body de POST / (cms) — extraído de `createPostSchema` en api-cms. */
export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  tags: z.array(z.string().min(1).max(50)).default([]),
});

/** Body de PATCH /:slug (cms) — todos los campos opcionales. */
export const updatePostSchema = createPostSchema.partial();

// ---------------------------------------------------------------------------
// Tags (modelo Tag de Prisma)
// ---------------------------------------------------------------------------

export const tagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(200),
});

// ---------------------------------------------------------------------------
// Comentarios (modelo Comment de Prisma, POST /:slug/comments en api-public)
// ---------------------------------------------------------------------------

/** Body de POST /:slug/comments — usaba `commentSchema` en api-public. */
export const commentCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  authorName: z.string().min(1).optional(),
  authorEmail: z.email().optional(),
});

// ---------------------------------------------------------------------------
// Vistas y sesiones de lectura (PostView y ReadSession de Prisma)
// ---------------------------------------------------------------------------

/** Body de POST /:slug/view — usaba `viewSchema` en api-public. */
export const viewTrackSchema = z.object({
  sessionId: z.string().min(1),
  referrer: z.string().optional(),
});

/**
 * Heartbeat de lectura (avance de ReadSession):
 * actualiza activeSeconds, maxScrollDepth y completed para (postId, sessionId).
 */
export const readHeartbeatSchema = z.object({
  sessionId: z.string().min(1),
  activeSeconds: z.coerce.number().int().min(0),
  maxScrollDepth: z.coerce.number().int().min(0).max(100),
  completed: z.boolean(),
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * "Mi Primer Post!" → "mi-primer-post" (quita tildes, minúsculas, guiones).
 * Extraído de api-cms; se comparte para que CMS y frontends generen
 * el mismo slug candidato antes de pedir `uniqueSlug` al servidor.
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 200) || "post"
  );
}

// ---------------------------------------------------------------------------
// Tipos inferidos (DTOs)
// ---------------------------------------------------------------------------

export type PostStatus = z.infer<typeof postStatusEnum>;
export type Pagination = z.infer<typeof paginationSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type TagDTO = z.infer<typeof tagSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type ViewTrackInput = z.infer<typeof viewTrackSchema>;
export type ReadHeartbeatInput = z.infer<typeof readHeartbeatSchema>;
