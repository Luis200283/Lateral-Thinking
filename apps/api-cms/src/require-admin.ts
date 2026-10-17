import { createMiddleware } from "hono/factory";
import { prisma } from "@repo/db";
import type { AuthEnv } from "./auth-middleware";

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const payload = c.get("auth");
  const userId = typeof payload?.sub === "string" ? payload.sub : null;

  if (!userId) return c.json({ error: "unauthorized" }, 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return c.json({ error: "forbidden" }, 403);
  }

  await next();
});
