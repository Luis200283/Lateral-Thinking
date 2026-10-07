import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@repo/db";

export const posts = new Hono();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(150).default(10),
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
