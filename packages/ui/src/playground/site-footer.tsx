export type SocialLink = {
  label: string;
  href: string;
};

export type SiteFooterProps = {
  name: string;
  note: string;
  socials: readonly SocialLink[];
};

/** Ink hairline footer with a terminal sign-off line + social links. */
export function SiteFooter({ name, note, socials }: SiteFooterProps) {
  return (
    <footer className="border-t-[1.5px] border-ink/15 px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="max-w-[46ch] text-sm text-muted">
            © {new Date().getFullYear()} {name}. {note}
          </p>
          <p className="mt-2 font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
            $ exit — thanks for scrolling
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-5 text-sm">
          {socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center py-2 text-muted underline decoration-ink/30 underline-offset-4 transition-colors hover:text-ink"
              >
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
