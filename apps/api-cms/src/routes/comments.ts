import { Hono } from "hono";
import { prisma } from "@repo/db";
import { requireAuth, type AuthEnv } from "../auth-middleware";
import { requireAdmin } from "../require-admin";

export const comments = new Hono<AuthEnv>();

// Los comentarios se publican automáticamente: no hay cola de moderación,
// el CMS solo lista todos los comentarios y permite eliminarlos.
comments.get("/", requireAuth, requireAdmin, async (c) => {
  const items = await prisma.comment.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      authorName: true,
      authorEmail: true,
      createdAt: true,
      user: { select: { name: true, image: true } },
      post: { select: { id: true, title: true, slug: true } },
    },
  });
  return c.json({ total: items.length, items });
});

comments.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");

  const existing = await prisma.comment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return c.json({ error: "not_found" }, 404);

  await prisma.comment.delete({ where: { id } });
  return c.json({ ok: true });
});
