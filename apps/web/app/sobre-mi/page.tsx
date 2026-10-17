import type { Metadata } from "next";
import Link from "next/link";
import { Button, SectionHeading, Tag } from "@repo/ui/playground";
import { ApiOfflineNotice } from "../../components/ApiOfflineNotice";
import { getApiStatus, getProfile } from "../../lib/api";
import { formatViews, tagTone } from "../../lib/ui";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sobre mí — Lateral Thinking",
  description: "Quién escribe Lateral Thinking: bio, artículos recientes y populares.",
};

const PORTFOLIO_URL = "https://luishswe.com";

export default async function SobreMi() {
  const profile = await getProfile();
  const { baseUrl } = getApiStatus();
  const author = profile?.author ?? null;
  const recent = profile?.recent ?? [];
  const popular = profile?.popular ?? [];
  const topics = (() => {
    const seen = new Map<string, string>();
    for (const post of [...recent, ...popular]) {
      for (const tag of post.tags ?? []) {
        if (!seen.has(tag.slug)) seen.set(tag.slug, tag.name);
      }
    }
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  })();

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-10">
      <h1 className="sr-only">Sobre mí</h1>

      <SectionHeading kicker="// SOBRE MÍ">Quién escribe esto</SectionHeading>

      {profile === null ? (
        <div className="mt-8" role="alert">
          <ApiOfflineNotice />
          <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
            base url: {baseUrl}
          </p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        {/* ------------------------------------------------------- bio --- */}
        <article className="rounded-card border-[1.5px] border-ink bg-surface p-6 shadow-[6px_6px_0_var(--color-ink)] sm:p-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
            // AUTOR
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            {author?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.image}
                alt={author.name ?? "Autora"}
                width={88}
                height={88}
                className="h-[88px] w-[88px] shrink-0 rounded-full border-[1.5px] border-ink bg-paper object-cover shadow-[3px_3px_0_var(--color-ink)]"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-sun font-display text-3xl font-bold text-on-accent shadow-[3px_3px_0_var(--color-ink)]"
              >
                LT
              </span>
            )}

            <div>
              <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
                {author?.name ?? "Lateral Thinking"}
              </h2>
              <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                $ cat ~/bio.md
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-[58ch] text-[1.0625rem] leading-relaxed text-muted">
            {author?.bio ??
              "Blog personal sobre pensamiento lateral, creatividad y resolución de problemas. Arranca la API para ver la bio real."}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Button
              as="a"
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noreferrer noopener"
              size="sm"
              variant="outline"
            >
              Ver portafolio ↗
            </Button>
            <Button href="/blog" size="sm" variant="ghost">
              Leer el blog →
            </Button>
          </div>
        </article>

        {/* -------------------------------------------------- fact cards --- */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FactCard label="// RECIENTES" value={String(recent.length)} unit="artículos">
            {recent.length === 0 ? (
              <p className="text-sm text-muted">Nada publicado todavía.</p>
            ) : (
              <ul className="grid gap-2">
                {recent.slice(0, 3).map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm text-ink underline decoration-ink/40 underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </FactCard>

          <FactCard label="// POPULARES" value={String(popular.length)} unit="más leídos">
            {popular.length === 0 ? (
              <p className="text-sm text-muted">Sin datos de lecturas todavía.</p>
            ) : (
              <ul className="grid gap-2">
                {popular.slice(0, 3).map((post) => (
                  <li key={post.id} className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm text-ink underline decoration-ink/40 underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      {post.title}
                    </Link>
                    {formatViews(post._count?.views) ? (
                      <span className="font-mono text-[0.625rem] tracking-[0.1em] text-muted">
                        {formatViews(post._count?.views)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </FactCard>

          <FactCard label="// TEMAS" value={String(topics.length)} unit="etiquetas">
            {topics.length === 0 ? (
              <p className="text-sm text-muted">Sin etiquetas todavía.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {topics.slice(0, 6).map((tag) => (
                  <li key={tag.slug}>
                    <Link
                      href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                      className="inline-block transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <Tag tone={tagTone(tag.slug)}>#{tag.name}</Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </FactCard>

          <FactCard label="// PORTFOLIO" value="luishswe.com" unit="trabajo">
            <p className="max-w-[42ch] text-sm text-muted">
              El portafolio vive en su propia web. Este blog es solo la parte
              escrita.
            </p>
            <Button
              as="a"
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noreferrer noopener"
              size="sm"
              variant="ghost"
              className="mt-3 px-0"
            >
              Abrir ↗
            </Button>
          </FactCard>
        </div>
      </div>
    </main>
  );
}

function FactCard({
  label,
  value,
  unit,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-card border-[1.5px] border-ink bg-surface p-5 shadow-[3px_3px_0_var(--color-ink)]">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <p className="font-display text-2xl font-bold tracking-[-0.02em]">
        {value}{" "}
        <span className="font-mono text-xs font-normal tracking-[0.1em] text-muted">
          {unit}
        </span>
      </p>
      <div className="mt-1">{children}</div>
    </article>
  );
}
