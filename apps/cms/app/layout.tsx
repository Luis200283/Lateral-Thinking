import type { Metadata } from "next";
import { SiteNav, SiteThemeProvider } from "@repo/ui/playground";
import { SignInMenu } from "../components/SignInMenu";
import { BLOG_URL } from "../lib/site-constants";
import { display, mono, sans } from "../lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CMS — Lateral Thinking",
  description: "Panel editorial: posts, comentarios y stats.",
};

/** Navegación interna del panel; "Ver blog" abre la web pública (nunca el portafolio). */
const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "Posts", href: "/posts" },
  { label: "Comentarios", href: "/comentarios" },
  { label: "Ver blog", href: BLOG_URL, external: true },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <SiteThemeProvider>
        <body className="bg-paper text-ink font-sans antialiased">
          {/* Marca idéntica a la web pública (mono del SiteNav + punto coral);
              el sufijo "· cms" solo contextualiza el panel, no re-estila. */}
          <SiteNav
            links={NAV_LINKS}
            brand={
              <>
                Lateral Thinking<span className="text-coral-ink">.</span>
                <span className="hidden text-muted md:inline"> · cms</span>
              </>
            }
            actions={<SignInMenu />}
          />
          <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
            {children}
          </main>
        </body>
      </SiteThemeProvider>
    </html>
  );
}
