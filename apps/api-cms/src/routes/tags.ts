import { Hono } from "hono";
import { prisma } from "@repo/db";
import { requireAuth, type AuthEnv } from "../auth-middleware";
import { requireAdmin } from "../require-admin";

export const tags = new Hono<AuthEnv>();

tags.get("/", requireAuth, requireAdmin, async (c) => {
  const items = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { posts: true } },
    },
  });
  return c.json({ total: items.length, items });
});
