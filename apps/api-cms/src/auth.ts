import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt, magicLink, username } from "better-auth/plugins";
import { prisma } from "@repo/db";
import { env } from "./env";

// Social providers opcionales: solo se registran si AMBAS credenciales del
// proveedor existen. Sin ellas, betterAuth no los monta y el botón social
// correspondiente no se muestra en el modal (providers prop).
const socialProviders = {
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
};

// Magic link: sin RESEND_API_KEY (dev/local) la URL se loguea en consola del
// servidor con un aviso claro — así se puede probar el flujo completo en local
// sin proveedor de email. En prod (RESEND_API_KEY presente) se envía por email
// vía la API de Resend con fetch (sin SDK).
async function sendMagicLink({
  email,
  url,
}: {
  email: string;
  url: string;
  token: string;
}) {
  if (!env.RESEND_API_KEY) {
    console.log(
      `\n[magic-link] RESEND_API_KEY no configurada — modo dev.\n` +
        `[magic-link] Enlace de acceso para ${email}:\n  ${url}\n` +
        `[magic-link] En prod (con RESEND_API_KEY) se envía por email.\n`,
    );
    return;
  }
  const from = env.EMAIL_FROM || "no-reply@luishswe.com";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Tu enlace de acceso — Lateral Thinking",
        html: `<p>Haz clic para iniciar sesión:</p><p><a href="${url}">${url}</a></p>`,
      }),
    });
    if (!res.ok) {
      console.error(
        `[magic-link] Resend respondió ${res.status}: ${await res.text()}`,
      );
    }
  } catch (err) {
    console.error("[magic-link] No se pudo enviar el email:", err);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/auth",
  // El sign-in llega cross-origin desde web (:3000) y CMS (:3001).
  // Sin esto, Better Auth rechaza el login con 403 aunque CORS pase.
  // En producción deben estar los dominios reales de ambos frontends
  // (Vercel): blog.luishswe.com y cms.luishswe.com.
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    ...(process.env.NODE_ENV === "production"
      ? [
          "https://luishswe.com",
          "https://blog.luishswe.com",
          "https://cms.luishswe.com",
        ]
      : []),
  ],
  emailAndPassword: { enabled: true },
  socialProviders: Object.keys(socialProviders).length
    ? socialProviders
    : undefined,
  plugins: [
    jwt({
      // Better Auth firma los JWT con 15 min de vida por defecto. Para un CMS
      // de un solo autor eso obliga a reloguearse constantemente (y confunde:
      // el 401 se veía como "API caída"). 7d alinea el JWT con la cookie
      // espejo (cms_token, max-age 7d). Tradeoff asumido: es un panel privado
      // de un único ADMIN; el seguimiento natural es un refresh token (M11+).
      jwt: { expirationTime: "7d" },
    }),
    magicLink({
      sendMagicLink,
      // Sin registro público: solo usuarios existentes pueden loguearse.
      disableSignUp: true,
    }),
    // Habilita login con nombre de usuario además de email: añade
    // User.username (único, normalizado a minúsculas), User.displayUsername
    // y POST /auth/sign-in/username { username, password }.
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
  ],
});
