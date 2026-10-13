import "dotenv/config";
import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4001";
const JWKS = createRemoteJWKSet(new URL(`${baseURL}/auth/jwks`));

export type AuthEnv = {
  Variables: {
    auth: JWTPayload;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized" }, 401);
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), JWKS, {
      issuer: baseURL,
      audience: baseURL,
    });
    c.set("auth", payload);
    await next();
  } catch {
    return c.json({ error: "unauthorized" }, 401);
  }
});
