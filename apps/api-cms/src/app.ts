import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";
import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { rateLimiter } from "hono-rate-limiter";
import { prisma } from "@repo/db";
import { auth } from "./auth";
import { requireAuth } from "./auth-middleware";
import type { AuthEnv } from "./auth-middleware";
import { env } from "./env";
import { posts } from "./routes/posts";
import { comments } from "./routes/comments";
import { stats } from "./routes/stats";
import { tags } from "./routes/tags";

function clientKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

const isAuthPath = (c: Context) => c.req.path.startsWith("/auth");
// En tests todos los requests comparten clave ("unknown") y el reloj no
// avanza: sin este skip, los limiters harían los tests flaky.
const isTest = env.NODE_ENV === "test";

// 120 req/min como en api-public. Excluye /auth/*: Better Auth hace
// ráfagas internas (sign-up → session → jwks → token) y un 429 aquí
// rompería el login; /auth/* tiene su propio limiter generoso.
const globalLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-6",
  keyGenerator: clientKey,
  message: { error: "too_many_requests" },
  skip: (c) => isAuthPath(c) || isTest,
});

// Escrituras de CMS: 60 req/min (no 10 como api-public) porque aquí el
// autor ya está autenticado como ADMIN; el límite bajo de api-public es
// para escrituras anónimas (comentarios, views). Cubre POST/PATCH/DELETE.
const writeLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-6",
  keyGenerator: clientKey,
  message: { error: "too_many_requests" },
  skip: (c) => c.req.method === "GET" || isAuthPath(c) || isTest,
});

// Protege /auth/* sin ser agresivo: 120 req/min dan margen a los
// flujos de login/signup sin dejar la ruta abierta a fuerza bruta.
const authLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-6",
  keyGenerator: clientKey,
  message: { error: "too_many_requests" },
  skip: () => isTest,
});

export function createApp() {
  const app = new Hono<AuthEnv>();

  app.use("*", requestId());
  app.use("*", secureHeaders());
  app.use("*", bodyLimit({ maxSize: 100 * 1024 })); // 100KB
  app.use("*", logger());
  // credentials:true es obligatorio: el login usa fetch con
  // credentials:include (cookie de sesión + GET /auth/token).
  app.use("*", cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
  app.use("*", globalLimiter);
  app.use("/auth/*", authLimiter);
  app.use("*", writeLimiter);

  app.get("/health", (c) => c.json({ status: "ok" }));
  // El JWT solo trae `sub`; resolvemos el usuario real en la DB para
  // devolver rol (chip ADMIN en web/CMS) y campos públicos. 401 si el
  // usuario ya no existe (token de una cuenta borrada).
  app.get("/me", requireAuth, async (c) => {
    const payload = c.get("auth");
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return c.json({ error: "unauthorized" }, 401);
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true, image: true, role: true },
    });
    if (!user) return c.json({ error: "unauthorized" }, 401);
    return c.json({ user });
  });

  // Proveedores sociales realmente habilitados (según env). El modal de login
  // lo consulta para NO mostrar botones de Google/GitHub cuando no hay
  // credenciales: un botón que falla al pulsar es peor que no mostrarlo.
  app.get("/providers", (c) =>
    c.json({
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    }),
  );

  app.route("/posts", posts);
  app.route("/comments", comments);
  app.route("/stats", stats);
  app.route("/tags", tags);

  app.all("/auth/*", (c) => auth.handler(c.req.raw));

  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal_error" }, 500);
  });
  return app;
}
