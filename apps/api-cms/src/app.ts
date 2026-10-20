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

  // Better Auth redirige sus errores de OAuth a esta API (`/error` o la raíz,
  // con ?error=state_mismatch, etc.). Antes eso mostraba {"error":"not_found"}
  // en el móvil; ahora se manda al frontend, que explica qué pasó.
  const authErrorURL = (error: string) => {
    const origin =
      env.CORS_ORIGIN.split(",")[0]?.trim() ||
      new URL(env.BETTER_AUTH_URL).origin;
    return `${origin}/auth/callback?error=${encodeURIComponent(error)}`;
  };
  app.get("/error", (c) =>
    c.redirect(authErrorURL(c.req.query("error") ?? "auth_error")),
  );
  app.get("/", (c) => {
    const error = c.req.query("error");
    if (error) return c.redirect(authErrorURL(error));
    return c.json({ status: "ok", service: "api-cms" });
  });
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

  // Inicia OAuth con una navegación de página completa (no fetch cross-origin
  // desde el blog): la cookie de state se crea aquí como primera parte. En
  // móvil, el POST cross-origin podía perderla y Google volvía con
  // "state_mismatch". Solo acepta callbackURL de los frontends permitidos.
  app.get("/auth/social/:provider", async (c) => {
    const provider = c.req.param("provider");
    const frontendOrigins = env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const fallbackOrigin =
      frontendOrigins[0] ?? new URL(env.BETTER_AUTH_URL).origin;

    const requested = c.req.query("callbackURL");
    let callbackURL = `${fallbackOrigin}/auth/callback`;
    if (requested) {
      try {
        const parsed = new URL(requested);
        if (frontendOrigins.includes(parsed.origin)) {
          callbackURL = parsed.toString();
        }
      } catch {
        // URL inválida: se queda el fallback del frontend permitido.
      }
    }
    const callbackOrigin = new URL(callbackURL).origin;

    const enabled =
      (provider === "google" &&
        Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)) ||
      (provider === "github" &&
        Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET));
    if (!enabled) {
      return c.redirect(
        `${callbackOrigin}/auth/callback?error=provider_not_enabled`,
      );
    }

    const baseURL = env.BETTER_AUTH_URL.replace(/\/+$/, "");
    const authResponse = await auth.handler(
      new Request(`${baseURL}/auth/sign-in/social`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: new URL(baseURL).origin,
          "user-agent": c.req.header("user-agent") ?? "api-cms",
          ...(c.req.header("x-forwarded-for")
            ? { "x-forwarded-for": c.req.header("x-forwarded-for")! }
            : {}),
        },
        // Los errores (state_mismatch incluido) vuelven al frontend con un
        // mensaje legible, en vez de mostrar el JSON 404 de esta API.
        body: JSON.stringify({
          provider,
          callbackURL,
          errorCallbackURL: callbackURL,
        }),
      }),
    );
    const data = (await authResponse.json().catch(() => null)) as {
      url?: unknown;
    } | null;
    if (!authResponse.ok || typeof data?.url !== "string") {
      console.error(
        `[auth] no se pudo iniciar OAuth (${provider}): ${authResponse.status}`,
      );
      return c.redirect(
        `${callbackOrigin}/auth/callback?error=social_start_failed`,
      );
    }

    const redirect = c.redirect(data.url, 302);
    // La cookie de state viaja en esta misma respuesta 302.
    for (const cookie of authResponse.headers.getSetCookie()) {
      redirect.headers.append("set-cookie", cookie);
    }
    return redirect;
  });

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
