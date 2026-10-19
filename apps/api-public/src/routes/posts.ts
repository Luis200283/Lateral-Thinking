import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";
import {
  commentCreateSchema,
  paginationSchema,
  readHeartbeatSchema,
  viewTrackSchema,
} from "@repo/types";

export const posts = new Hono();

// ?page=&limit= (base compartida) + filtros de servidor ?tag= (slug) y ?q=
// (búsqueda en título/contenido). La web ya no filtra en cliente.
const querySchema = paginationSchema.extend({
  tag: z.string().min(1).max(200).optional(),
  q: z.string().min(1).max(200).optional(),
});

const commentSchema = commentCreateSchema;

const viewSchema = viewTrackSchema;

const heartbeatSchema = readHeartbeatSchema;

posts.get("/", zValidator("query", querySchema), async (c) => {
  const { page, limit, tag, q } = c.req.valid("query");
  const skip = (page - 1) * limit;
  const where = {
    status: "PUBLISHED" as const,
    ...(tag ? { tags: { some: { slug: tag } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { content: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        author: { select: { name: true, image: true } },
        tags: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return c.json({ page, limit, total, items });
});

posts.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { name: true, image: true } },
      tags: true,
      _count: { select: { comments: true } },
    },
  });

  if (!post) return c.json({ error: "not_found" }, 404);

  return c.json(post);
});

posts.get("/:slug/comments", async (c) => {
  const slug = c.req.param("slug");

  const post = await prisma.post.findFirst({
    where: { slug },
    select: { id: true },
  });

  if (!post) return c.json({ error: "not_found" }, 404);

  const comments = await prisma.comment.findMany({
    where: { postId: post.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      authorName: true,
      parentId: true,
      createdAt: true,
      user: { select: { name: true, image: true } },
    },
  });

  return c.json(comments);
});

posts.post("/:slug/comments", zValidator("json", commentSchema), async (c) => {
  const slug = c.req.param("slug");
  const body = c.req.valid("json");

  const post = await prisma.post.findFirst({ where: { slug } });

  if (!post) return c.json({ error: "not_found" }, 404);

  if (body.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: body.parentId, postId: post.id },
      select: { id: true },
    });

    if (!parent) return c.json({ error: "invalid_parent" }, 400);
  }

  const comment = await prisma.comment.create({
    data: {
      content: body.content,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      parentId: body.parentId,
      postId: post.id,
      // Publicación automática: sin cola de moderación.
      approved: true,
    },
  });

  return c.json(comment, 201);
});

posts.post("/:slug/view", zValidator("json", viewSchema), async (c) => {
  const slug = c.req.param("slug");
  const body = c.req.valid("json");

  const post = await prisma.post.findFirst({ where: { slug } });

  if (!post) return c.json({ error: "not_found" }, 404);

  await prisma.postView.create({
    data: {
      sessionId: body.sessionId,
      referrer: body.referrer,
      postId: post.id,
    },
  });

  return c.json({ ok: true }, 201);
});

posts.post("/:slug/heartbeat", zValidator("json", heartbeatSchema), async (c) => {
  const slug = c.req.param("slug");
  const body = c.req.valid("json");

  const post = await prisma.post.findFirst({
    where: { slug },
    select: { id: true },
  });

  if (!post) return c.json({ error: "not_found" }, 404);

  const existing = await prisma.readSession.findUnique({
    where: { postId_sessionId: { postId: post.id, sessionId: body.sessionId } },
  });

  if (existing) {
    const session = await prisma.readSession.update({
      where: {
        postId_sessionId: { postId: post.id, sessionId: body.sessionId },
      },
      data: {
        activeSeconds: existing.activeSeconds + body.activeSeconds,
        maxScrollDepth: Math.max(existing.maxScrollDepth, body.maxScrollDepth),
        completed: existing.completed || body.completed,
        lastSeenAt: new Date(),
      },
    });

    return c.json(session);
  }

  const session = await prisma.readSession.create({
    data: {
      postId: post.id,
      sessionId: body.sessionId,
      activeSeconds: body.activeSeconds,
      maxScrollDepth: body.maxScrollDepth,
      completed: body.completed,
    },
  });

  return c.json(session, 201);
});
