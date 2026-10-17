import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";
import { createPostSchema, slugify } from "@repo/types";
import { requireAuth, type AuthEnv } from "../auth-middleware";
import { requireAdmin } from "../require-admin";

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 2;
  // Con excludeId ignoramos el propio post (caso PATCH que cambia el slug).
  const taken = (s: string) =>
    excludeId
      ? prisma.post.findFirst({
          where: { slug: s, NOT: { id: excludeId } },
          select: { id: true },
        })
      : prisma.post.findUnique({ where: { slug: s }, select: { id: true } });
  while (await taken(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

// updatePostSchema NO es createPostSchema.partial() de @repo/types:
// aquí excerpt/coverImage aceptan null para limpiar el campo, y status/tags
// son opcionales sin defaults. Se mantiene local a propósito.
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const posts = new Hono<AuthEnv>();

posts.post(
  "/",
  requireAuth,
  requireAdmin,
  zValidator("json", createPostSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "invalid_body" }, 400);
    }
  }),
  async (c) => {
    const body = c.req.valid("json");

    // El autor sale del JWT (payload.sub), JAMÁS del body.
    // Repetimos el guard aunque requireAdmin ya lo comprobó:
    // TypeScript no sabe lo que pasó en otro middleware.
    const payload = c.get("auth");
    const authorId = typeof payload?.sub === "string" ? payload.sub : null;
    if (!authorId) return c.json({ error: "unauthorized" }, 401);

    const slug = await uniqueSlug(
      body.slug ? slugify(body.slug) : slugify(body.title),
    );

    const post = await prisma.post.create({
      data: {
        title: body.title,
        slug,
        content: body.content,
        excerpt: body.excerpt,
        coverImage: body.coverImage,
        status: body.status,
        publishedAt: body.status === "PUBLISHED" ? new Date() : null,
        authorId,
        tags: {
          connectOrCreate: body.tags.map((name) => ({
            where: { slug: slugify(name) },
            create: { name, slug: slugify(name) },
          })),
        },
      },
      include: { tags: { select: { name: true, slug: true } } },
    });

    return c.json(post, 201);
  },
);

posts.get("/", requireAuth, requireAdmin, async (c) => {
  const items = await prisma.post.findMany({
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      tags: { select: { name: true, slug: true } },
      _count: { select: { comments: true, views: true } },
    },
  });
  return c.json({ total: items.length, items });
});

// GET por :slug (no por :id): el admin previsualiza exactamente la URL
// pública del post, incluyendo drafts que api-public nunca muestra.
posts.get("/:slug", requireAuth, requireAdmin, async (c) => {
  const slug = c.req.param("slug");

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, image: true } },
      tags: { select: { name: true, slug: true } },
      _count: { select: { comments: true, views: true } },
    },
  });

  if (!post) return c.json({ error: "not_found" }, 404);
  return c.json(post);
});

// PATCH y DELETE van por :id (cuid estable), NO por :slug: el slug es
// mutable (se puede editar en el PATCH) y es la URL pública; el id nunca
// cambia, así que las mutaciones no se rompen al renombrar un post.
posts.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  zValidator("json", updatePostSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "invalid_body" }, 400);
    }
  }),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.post.findUnique({
      where: { id },
      include: { tags: { select: { id: true } } },
    });
    if (!existing) return c.json({ error: "not_found" }, 404);

    // El slug solo cambia si se pide explícitamente: editar el título
    // no mueve la URL pública. Si el slug pedido colisiona, se sufija.
    let slug = existing.slug;
    if (body.slug) {
      const base = slugify(body.slug);
      slug = base === existing.slug ? existing.slug : await uniqueSlug(base, id);
    }

    // publishedAt se setea UNA vez al publicar y se mantiene al editar:
    // nunca se sobrescribe ni se nullea en un PATCH (ni siquiera al
    // despublicar: conserva el historial de la primera publicación).
    const publishing =
      body.status === "PUBLISHED" &&
      existing.status !== "PUBLISHED" &&
      !existing.publishedAt;

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        slug,
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
        ...(body.coverImage !== undefined
          ? { coverImage: body.coverImage }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        publishedAt: publishing ? new Date() : existing.publishedAt,
        ...(body.tags !== undefined
          ? {
              tags: {
                disconnect: existing.tags.map((t) => ({ id: t.id })),
                connectOrCreate: body.tags.map((name) => ({
                  where: { slug: slugify(name) },
                  create: { name, slug: slugify(name) },
                })),
              },
            }
          : {}),
      },
      include: { tags: { select: { name: true, slug: true } } },
    });

    return c.json(post);
  },
);

posts.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");

  const existing = await prisma.post.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return c.json({ error: "not_found" }, 404);

  await prisma.post.delete({ where: { id } });
  return c.json({ ok: true });
});
