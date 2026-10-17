/**
 * URL del blog público. En local la web corre en :3000 (raíz = blog);
 * en prod el blog vive en https://luishswe.com/blog. Sobrescribible con
 * NEXT_PUBLIC_BLOG_URL. El link "Ver blog" del CMS apunta aquí, nunca
 * a la raíz del portafolio.
 */
export const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://luishswe.com/blog"
    : "http://localhost:3000");
