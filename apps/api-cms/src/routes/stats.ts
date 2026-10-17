import { Hono } from "hono";
import { prisma } from "@repo/db";
import { requireAuth, type AuthEnv } from "../auth-middleware";
import { requireAdmin } from "../require-admin";

export const stats = new Hono<AuthEnv>();

const TOP_POSTS_LIMIT = 5;

stats.get("/", requireAuth, requireAdmin, async (c) => {
  const [totalPosts, published, drafts, totalViews, totalComments, topPosts] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.postView.count(),
      prisma.comment.count(),
      prisma.post.findMany({
        take: TOP_POSTS_LIMIT,
        orderBy: { views: { _count: "desc" } },
        select: {
          id: true,
          title: true,
          slug: true,
          _count: { select: { views: true } },
        },
      }),
    ]);

  return c.json({
    totalPosts,
    published,
    drafts,
    totalViews,
    totalComments,
    topPosts: topPosts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      views: p._count.views,
    })),
  });
});
