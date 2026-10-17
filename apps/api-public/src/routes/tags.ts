import { Hono } from "hono";
import { prisma } from "@repo/db";

export const tags = new Hono();

tags.get("/", async (c) => {
  const items = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { posts: { where: { status: "PUBLISHED" } } },
      },
    },
  });

  return c.json(items);
});
