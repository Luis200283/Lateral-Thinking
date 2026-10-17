/**
 * Helpers de presentación compartidos por las pantallas públicas.
 * Solo hablan el lenguaje visual del sistema (@repo/ui/playground):
 * ningún color suelto, todo token.
 */

/** Tonos disponibles en <Tag> del sistema de diseño. */
export const TAG_TONES = ["coral", "sun", "violet", "mint"] as const;

export type TagTone = (typeof TAG_TONES)[number];

/**
 * Color estable por slug: el mismo tag conserva su chip en toda la web
 * (home, listado, artículo) sin depender del orden de la respuesta.
 */
export function tagTone(slug: string): TagTone {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) % 100000;
  }
  return TAG_TONES[hash % TAG_TONES.length] ?? "coral";
}

export const CMS_WEB_URL =
  process.env.NEXT_PUBLIC_CMS_WEB_URL?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://cms.luishswe.com"
    : "http://localhost:3001");

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("es", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** "12 vistas" / "1 vista" / null si la API no informa el conteo. */
export function formatViews(count: number | undefined): string | null {
  if (typeof count !== "number") return null;
  return `${count} ${count === 1 ? "vista" : "vistas"}`;
}

/** Meta mono del sistema: "autor · fecha · 12 vistas". */
export function postMeta(post: {
  author?: { name: string | null } | null;
  publishedAt: string | null;
  _count?: { views: number };
}): string[] {
  return [
    post.author?.name ?? null,
    formatDate(post.publishedAt) || null,
    formatViews(post._count?.views),
  ].filter((part): part is string => Boolean(part));
}
