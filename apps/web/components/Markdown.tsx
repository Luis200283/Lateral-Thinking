import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/**
 * Renderiza el `content` Markdown del post en el servidor (RSC).
 * - remark-gfm: tablas, tachado, task lists, autolinks.
 * - rehype-slug: ids en headings para deep-links.
 *
 * Todo el estilo vive en `app/globals.css` (clase `.md`, con tokens del
 * sistema: headings font-display, <pre> terminal, código inline con fondo
 * surface, blockquote con borde coral, tablas legibles). Nada de estilos
 * inline aquí para no romper el theming ni el dark mode.
 *
 * NOTA: no usar rehype-pretty-code aquí. Es un plugin async (Shiki) y
 * react-markdown renderiza con unified `runSync` → rompe con
 * "`runSync` finished async. Use `run` instead". El código se estila
 * con <pre>/<code> propios (síncronos). Si se quiere Shiki, hay que
 * pre-procesar a HTML con pipeline async + dangerouslySetInnerHTML.
 */
export default function Markdown({ content }: { content: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
