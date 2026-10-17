import "dotenv/config";
import { z } from "zod";

// Fail-fast: si el entorno es inválido, el proceso muere al importar.
// BETTER_AUTH_SECRET solo es obligatorio en producción para no romper
// dev/test (los tests de Vitest corren con NODE_ENV=test sin secretos).
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  // Web (:3000) y CMS (:3001): ambos frontends llaman a esta API desde el
  // navegador, así que los dos orígenes deben estar permitidos. Sin :3001,
  // el preflight del login falla y el CMS muestra "API no disponible".
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  BETTER_AUTH_URL: z.string().default("http://localhost:4001"),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  // Opcionales: los proveedores sociales y el magic link solo se registran
  // si existen sus credenciales. Sin ellas el build y el login email/password
  // siguen funcionando igual.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // Magic link por email: sin RESEND_API_KEY la URL se loguea en consola
  // (modo dev). Con ella, se envía vía API de Resend (fetch, sin SDK).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    "Invalid environment: " + JSON.stringify(parsed.error.issues),
  );
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.BETTER_AUTH_SECRET) {
  throw new Error("Invalid environment: BETTER_AUTH_SECRET is required in production");
}

export const env = parsed.data;
