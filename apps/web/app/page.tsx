import Link from "next/link";
import { Button, SectionHeading, Tag } from "@repo/ui/playground";
import { ApiOfflineNotice } from "../components/ApiOfflineNotice";
import PostCard from "../components/PostCard";
import { getPosts, getProfile, type PostSummary } from "../lib/api";
import { tagTone } from "../lib/ui";

export const dynamic = "force-static";

export default async function Home() {
  // Server Component: fetch en el servidor para SEO + first paint con datos.
  // Cada llamada ya devuelve `null` si la API está apagada -> build seguro.
  const [profile, posts] = await Promise.all([getProfile(), getPosts(1, 3)]);

  const recent = (
    profile && profile.recent.length > 0 ? profile.recent : (posts?.items ?? [])
  ).slice(0, 3);
  const popular = (profile?.popular ?? []).slice(0, 3);
  const author = profile?.author ?? null;
  const apiOffline = profile === null && posts === null;
  const tagCloud = buildTagCloud(recent, popular);

  return (
    <>
      {/* ---------------------------------------------------------- hero --- */}
      <section
        aria-labelledby="hero-title"
        className="px-6 pb-16 pt-14 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-5 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
            // BLOG
          </p>

          <h1
            id="hero-title"
            className="text-balance font-display text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.03em]"
          >
            Escribo para pensar en voz alta.
          </h1>

          <p className="mt-7 max-w-[58ch] text-[1.0625rem] leading-relaxed text-muted">
            Apuntes de trabajo sobre{" "}
            <span className="mx-[0.1em] bg-sun px-1 font-semibold text-ink">
              pensamiento lateral
            </span>
            , creatividad y resolución de problemas. Ni tesis ni trucos: lo que
            voy aprendiendo mientras lo intento, con el proceso a la vista.
          </p>

          {author?.name ? (
            <p className="mt-6 font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
              $ whoami → {author.name}
            </p>
          ) : null}

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Button href="/blog" size="lg">
              Leer el blog
            </Button>
            <Button href="/sobre-mi" size="lg" variant="outline">
              Sobre mí
            </Button>
          </div>
        </div>
      </section>

      {apiOffline ? (
        <div className="px-6 sm:px-10">
          <div className="mx-auto mt-2 max-w-6xl">
            <ApiOfflineNotice />
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------- recientes --- */}
      <section
        aria-labelledby="recent-title"
        className="border-t-[1.5px] border-ink/15 px-6 py-16 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading kicker="// LO MÁS RECIENTE" id="recent-title">
            Últimas notas publicadas
          </SectionHeading>

          <div className="mt-10">
            {recent.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recent.map((post) => (
                  <li key={post.id} className="h-full">
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {recent.length > 0 ? (
            <div className="mt-10">
              <Button href="/blog" size="sm" variant="ghost">
                Ver todos los artículos →
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------- populares --- */}
      <section
        aria-labelledby="popular-title"
        className="border-t-[1.5px] border-ink/15 px-6 py-16 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading kicker="// POPULARES" id="popular-title">
            Lo que más se lee
          </SectionHeading>

          <div className="mt-10">
            {popular.length === 0 ? (
              <EmptyState message="Todavía no hay suficientes lecturas para rankear. Vuelve en un rato." />
            ) : (
              <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {popular.map((post, index) => (
                  <li key={post.id} className="h-full">
                    <PostCard post={post} index={index} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ tags --- */}
      {tagCloud.length > 0 ? (
        <section
          aria-labelledby="tags-title"
          className="border-t-[1.5px] border-ink/15 px-6 py-16 sm:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading kicker="// TEMAS" id="tags-title">
              Por dónde empezar
            </SectionHeading>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {tagCloud.map((tag) => (
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
          </div>
        </section>
      ) : null}
    </>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="rounded-card border-[1.5px] border-dashed border-ink/40 bg-surface/60 p-6">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        $ ls ~/posts
      </p>
      <p className="mt-2 text-sm text-muted">
        {message ?? "Sin artículos todavía. En cuanto la API responda, aparecen aquí."}
      </p>
    </div>
  );
}

/** Nube de temas deducida de recientes + populares (la home no pide /tags). */
function buildTagCloud(...groups: PostSummary[][]): { slug: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const group of groups) {
    for (const post of group) {
      for (const tag of post.tags ?? []) {
        if (!seen.has(tag.slug)) seen.set(tag.slug, tag.name);
      }
    }
  }
  return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
}
