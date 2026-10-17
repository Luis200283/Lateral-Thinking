import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/**
 * Renderiza el `content` Markdown del post en el servidor (RSC).
 * - remark-gfm: tablas, tachado, task lists, autolinks.
 * - rehype-raw: interpreta el HTML embebido que emite el editor del CMS
 *   (p. ej. `<u>` del subrayado, `<img>`, `<br>`). Sin él, esos tags se
 *   veían como texto literal en el artículo.
 * - rehype-sanitize: sanea ese HTML (nada de `<script>`, `on*`, `javascript:`)
 *   antes de publicarlo.
 * - rehype-slug: ids en headings para deep-links (va al final para que el
 *   saneado no elimine los ids que añade).
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

const sanitizeSchema = {
  ...defaultSchema,
  // El subrayado del editor emite `<u>`; GitHub (defaultSchema) no lo incluye.
  // El resto (headings con id, tablas GFM, strong/em, img, pre) ya está
  // permitido por el schema por defecto.
  tagNames: [...(defaultSchema.tagNames ?? []), "u"],
};

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
