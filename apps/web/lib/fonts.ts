/**
 * Shared Playground typography (docs/design/TOKENS.md):
 * display = Bricolage Grotesque, body = Inter, mono = JetBrains Mono.
 * Loaded via next/font and exposed as CSS variables on <html>; the values
 * feed the --font-display/--font-sans/--font-mono tokens in
 * @repo/ui/playground.css. Requires network access to Google Fonts at build
 * time; otherwise fall back to the local Geist files in app/fonts.
 */
import {
  Bricolage_Grotesque,
  Inter,
  JetBrains_Mono,
} from "next/font/google";

export const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});
