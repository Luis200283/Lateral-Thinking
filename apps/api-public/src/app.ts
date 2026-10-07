import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { posts } from "./routes/posts";

export function createApp() {
  const app = new Hono();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.route("/posts", posts);
  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });

  return app;
}
