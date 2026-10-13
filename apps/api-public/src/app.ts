import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { posts } from "./routes/posts";
import { profile } from "./routes/profile";
import { env } from "./env";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";
import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { rateLimiter } from "hono-rate-limiter";

function clientKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

const globalLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-6",
  keyGenerator: clientKey,
  message: { error: "too_many_requests" },
});

const writeLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-6",
  keyGenerator: clientKey,
  message: { error: "too_many_requests" },
  skip: (c) => c.req.method !== "POST",
});

export function createApp() {
  const app = new Hono();


  app.use("*", requestId());
  app.use("*", secureHeaders());
  app.use("*", bodyLimit({ maxSize: 100 * 1024 })); //100KB
  app.use("*", logger());
  app.use("*", cors({ origin: env.CORS_ORIGIN.split(",") }));
  app.use("*", globalLimiter);
  app.use("/posts/:slug/comments", writeLimiter)
  app.use("/posts/:slug/view", writeLimiter)

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.route("/posts", posts);
  app.route("/profile", profile);
  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });

  return app;
}
