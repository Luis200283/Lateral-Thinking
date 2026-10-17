"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { ThemeToggle } from "./theme-toggle";

export type NavLink = {
  label: string;
  href: string;
  /** External target (e.g. the portfolio): renders a real anchor with target=_blank. */
  external?: boolean;
};

export type SiteNavProps = {
  links: readonly NavLink[];
  /** Brand mark — usually the handle or app name. */
  brand: ReactNode;
  /** Action slot rendered next to the theme toggle (e.g. a Sign-in button + modal). */
  actions?: ReactNode;
};

/** Sticky terminal-first nav: ink hairline on scroll, mobile menu with Escape. */
export function SiteNav({ links, brand, actions }: SiteNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href.startsWith("#")) return false;
    return pathname === href;
  };

  const linkClass = (href: string) =>
    cn(
      "relative inline-flex items-center py-3 transition-colors",
      isActive(href) ? "text-ink" : "text-muted hover:text-ink",
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b-[1.5px] border-transparent",
        "bg-paper/85 backdrop-blur-md transition-shadow duration-300",
        scrolled && "border-ink/15 shadow-[0_4px_0_rgba(34,29,46,0.06)]",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10"
      >
        <Link
          href="/"
          className="inline-flex items-center py-3 font-mono text-sm font-medium tracking-tight text-ink"
        >
          {brand}
        </Link>

        <ul className="hidden items-center gap-7 text-sm sm:flex">
          {links.map((item) => (
            <li key={item.href}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass(item.href)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={linkClass(item.href)}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1.5 left-0 right-0 h-[3px] -rotate-1 rounded-full bg-sun"
                    />
                  )}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {actions}
          <ThemeToggle />

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface shadow-[2px_2px_0_var(--color-ink)] sm:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className="font-mono text-sm leading-none">
              {menuOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t-[1.5px] border-ink/15 bg-paper px-6 pb-5 pt-3 sm:hidden"
        >
          <ul className="flex flex-col gap-1">
            {links.map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block rounded-chip px-3 py-2.5 text-sm transition-colors",
                      "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block rounded-chip px-3 py-2.5 text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-sun text-on-accent"
                        : "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {actions && (
            <div
              className="mt-3 flex flex-col gap-3 border-t-[1.5px] border-ink/15 pt-3"
              onClick={() => setMenuOpen(false)}
            >
              {actions}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
