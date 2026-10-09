import { Hono } from "hono";
import { prisma } from "@repo/db";

export const profile = new Hono();

profile.get("/", async (c) => {
  const author = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { name: true, image: true, bio: true },
  });

  const summary = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    coverImage: true,
    publishedAt: true,
  } as const;

  const recent = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: { ...summary, tags: { select: { name: true, slug: true } } },
  });
  const popular = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { views: { _count: "desc" } },
    take: 5,
    select: { ...summary, _count: { select: { views: true } } },
  });

  return c.json({ author, recent, popular });
});
