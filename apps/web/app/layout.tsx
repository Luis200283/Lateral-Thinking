import type { Metadata } from "next";
import { SiteThemeProvider } from "@repo/ui/playground";
import { SiteChrome } from "../components/SiteChrome";
import { display, mono, sans } from "../lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lateral Thinking",
    template: "%s | Lateral Thinking",
  },
  description:
    "Blog personal sobre pensamiento lateral, creatividad y resolución de problemas.",
};

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
        <body className="flex min-h-svh flex-col bg-paper font-sans text-ink antialiased">
          <SiteChrome>{children}</SiteChrome>
        </body>
      </SiteThemeProvider>
    </html>
  );
}
