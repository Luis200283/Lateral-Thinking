"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export type SiteThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * System-aware light/dark with a manual override, persisted locally.
 * `data-theme` on <html> drives the CSS custom properties in theme.css.
 * Put `suppressHydrationWarning` on the app's <html>, not here.
 */
export function SiteThemeProvider({
  children,
  ...props
}: SiteThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
