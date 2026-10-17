/**
 * Shared Playground typography (same contract as apps/web):
 * display = Bricolage Grotesque, body = Inter, mono = JetBrains Mono.
 * Exposed as CSS variables on <html> for @repo/ui/playground.css tokens.
 * Requires network access to Google Fonts at build time.
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
