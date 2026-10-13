import { Hono } from "hono";
import { auth } from "./auth";
import { requireAuth } from "./auth-middleware";
import type { AuthEnv } from "./auth-middleware";

export function createApp() {
  const app = new Hono<AuthEnv>();
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/me", requireAuth, (c) => c.json({ user: c.get("auth") }));

  app.all("/auth/*", (c) => auth.handler(c.req.raw));

  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });
  return app;
}
