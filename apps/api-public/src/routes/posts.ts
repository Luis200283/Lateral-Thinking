import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";

export const posts = new Hono();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(150).default(10),
});

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  authorName: z.string().min(1).optional(),
  authorEmail: z.email().optional(),
});

posts.get("/", zValidator("query", querySchema), async (c) => {
  const { page, limit } = c.req.valid("query");
  const skip = (page - 1) * limit;
  const where = { status: "PUBLISHED" } as const;

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
    where: { postId: post.id, approved: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      authorName: true,
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

  const comment = await prisma.comment.create({
    data: {
      content: body.content,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      postId: post.id,
    },
  });

  return c.json(comment, 201);
});
