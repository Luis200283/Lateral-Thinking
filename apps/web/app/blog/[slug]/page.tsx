import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Tag } from "@repo/ui/playground";
import Comments from "../../../components/Comments";
import Markdown from "../../../components/Markdown";
import ReadTracker from "../../../components/ReadTracker";
import ShareButtons from "../../../components/ShareButtons";
import ViewTracker from "../../../components/ViewTracker";
import { getComments, getPost, getPosts } from "../../../lib/api";
import { formatViews, tagTone } from "../../../lib/ui";

export const revalidate = 60;

interface SlugParams {
  slug: string;
}

export async function generateStaticParams(): Promise<SlugParams[]> {
  // Con la API apagada safeFetch -> null -> sin rutas prerenderizadas;
  // dynamicParams (por defecto true) permite render bajo demanda + ISR.
  const data = await getPosts(1, 50);
  if (!data) return [];
  return data.items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SlugParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "No encontrado — Lateral Thinking" };
  const description = post.excerpt ?? "Artículo de Lateral Thinking.";
  return {
    title: `${post.title} — Lateral Thinking`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      tags: post.tags?.map((t) => t.name),
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: post.coverImage ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<SlugParams>;
}) {
  const { slug } = await params;
  // Post + comentarios en paralelo; cualquiera puede ser null con API apagada.
  const [post, comments] = await Promise.all([getPost(slug), getComments(slug)]);
  if (!post) notFound();

  const published = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("es", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const views = formatViews(post._count?.views);
  const metaParts = [
    post.author?.name ?? null,
    published,
    views,
  ].filter((part): part is string => Boolean(part));
  const tags = post.tags ?? [];

  return (
    <main className="mx-auto w-full max-w-[68ch] px-6 pb-20 pt-10 sm:px-10">
      <Button href="/blog" size="sm" variant="ghost">
        ← Blog
      </Button>

      <article className="mt-8">
        <header>
          <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-coral-ink">
            // ARTÍCULO
          </p>

          <h1 className="text-balance font-display text-[clamp(2.25rem,5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.03em]">
            {post.title}
          </h1>

          <p className="mt-5 font-mono text-[0.6875rem] tracking-[0.1em] text-muted">
            {metaParts.join(" · ")}
          </p>

          {tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
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
          ) : null}
        </header>

        {post.coverImage ? (
          <div className="mt-8 overflow-hidden rounded-card border-[1.5px] border-ink bg-surface shadow-[6px_6px_0_var(--color-ink)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={`Portada de ${post.title}`}
              className="block h-auto w-full"
            />
          </div>
        ) : null}

        {post.excerpt ? (
          <p className="mt-8 border-l-[3px] border-coral pl-4 text-lg leading-relaxed text-muted">
            {post.excerpt}
          </p>
        ) : null}

        <Markdown content={post.content} />

        <ShareButtons title={post.title} />
        <ViewTracker slug={post.slug} />
        <ReadTracker slug={post.slug} />
      </article>

      <div className="mt-16 border-t-[1.5px] border-ink/15 pt-10">
        <Comments slug={post.slug} initial={comments ?? []} />
      </div>
    </main>
  );
}
