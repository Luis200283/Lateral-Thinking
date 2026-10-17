import type { ReactNode } from "react";
import { SiteFooter, SiteNav, type NavLink, type SocialLink } from "@repo/ui/playground";
import { SignInMenu } from "./SignInMenu";

/**
 * Chrome público de la web: nav + footer del sistema de diseño, una sola vez.
 * Es la extensión del portafolio: mismo lenguaje visual (bordes tinta,
 * sombras duras, kickers mono) sin animaciones decorativas.
 */

const NAV_LINKS: readonly NavLink[] = [
  { label: "Blog", href: "/blog" },
  { label: "Sobre mí", href: "/sobre-mi" },
  { label: "Portafolio", href: "https://luishswe.com", external: true },
];

const SOCIALS: readonly SocialLink[] = [
  { label: "Portafolio", href: "https://luishswe.com" },
];

const BRAND: ReactNode = (
  <>
    Lateral Thinking<span className="text-coral-ink">.</span>
  </>
);

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav links={NAV_LINKS} brand={BRAND} actions={<SignInMenu />} />

      <div className="flex flex-1 flex-col">{children}</div>

      <SiteFooter
        name="Lateral Thinking"
        note="Blog personal sobre pensamiento lateral, creatividad y resolución de problemas."
        socials={SOCIALS}
      />
    </>
  );
}
