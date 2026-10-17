import { prisma } from "../src/index";

async function main() {
  const author = await prisma.user.upsert({
    where: { email: "luis@luishswe.com" },
    update: { role: "ADMIN", username: "luis", displayUsername: "Luis" },
    create: {
      email: "luis@luishswe.com",
      name: "Luis",
      role: "ADMIN",
      username: "luis",
      displayUsername: "Luis",
      bio: "Desarrollador: crecimiento personal y tecnología. Escribo para pensar en voz alta.",
    },
  });

  const posts = [
    {
      title: "Pensar lateral: por qué me cuesta terminar lo que empiezo",
      slug: "pensar-lateral-terminar-lo-que-empiezo",
      excerpt:
        "El pensamiento lateral aplicado a la disciplina: cómo reformulo mis bloqueos para convertirlos en sistemas, no en culpa.",
      content: `## La trampa del "me falta disciplina"

Durante años creí que mi problema era la disciplina. Empezaba proyectos —este blog incluido— y los dejaba a medias. La narrativa era simple: soy indisciplinado.

El pensamiento lateral me enseñó a **reformular el problema**: ¿y si no es disciplina, sino diseño?

## Tres reformulaciones que me funcionan

1. **Del objetivo al sistema.** No "publicar 20 posts", sino "escribir 25 minutos cada mañana". El sistema no depende de la motivación.
2. **Del tamaño al umbral.** Un post no es una catedral. Es un borrador feo + una edición. Bajar el umbral de entrada lo cambia todo.
3. **Del secreto al público.** Este blog existe para obligarme a terminar en público. La vergüenza social es un feature, no un bug.

## Cómo lo aplico en código

Igual que en un refactor: pasos pequeños, tests que me dicen si rompí algo, commits que documentan el porqué. Escribir es programar con palabras.

> Si una decisión no tiene un "por qué", no cuenta como decisión, cuenta como accidente.

## Cierre

Este es el primero de tres posts de ejemplo. Los escribí para probar el blog de punta a punta: MDX, tags, comentarios y analítica. Bórralos cuando publiques los tuyos con \`prisma db seed\` modificado o desde el CMS.
`,
      tags: ["crecimiento-personal", "pensamiento-lateral"],
    },
    {
      title: "De Express a Hono: lo que aprendí portando mi API",
      slug: "de-express-a-hono-lo-que-aprendi",
      excerpt:
        "Hono sobre estándares web, validación con Zod y RPC tipado: notas reales de la migración de este blog.",
      content: `## Por qué Hono y no Express

Express es maduro pero su tipado es flojo y no trae validación. Hono está construido sobre \`Request\`/\`Response\` estándar, es TypeScript-first y se integra con Zod vía \`@hono/zod-validator\`.

## Tres cosas que me sorprendieron

### 1. Validar antes de tocar la DB

\`\`\`ts
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(150).default(10),
});
\`\`\`

Los query params llegan como strings: \`z.coerce\` los convierte antes de validar. Contrato primero, lógica después.

### 2. El JWT sin sesiones por request

La API del CMS verifica el JWT contra el JWKS de Better Auth con \`jose\`. Stateless: no toca la DB en cada request, solo para comprobar el rol ADMIN.

### 3. Rate limiting distinto por audiencia

La API pública limita escrituras anónimas a 10/min. El CMS, con autor autenticado, permite 60/min. La seguridad también es UX.

## Código de este blog

Las rutas viven en \`apps/api-public/src/routes/\` y \`apps/api-cms/src/routes/\`. Los contratos compartidos, en \`packages/types\`.
`,
      tags: ["tecnologia", "backend"],
    },
    {
      title: "Cómo mido si alguien realmente lee mis posts",
      slug: "como-mido-si-alguien-lee-mis-posts",
      excerpt:
        "PostView vs ReadSession: visitas, heartbeat cada 15s, scroll y completitud. Analítica propia sin trackers externos.",
      content: `## Una vista no es una lectura

Contar pageviews es fácil y mentiroso. Por eso separé dos modelos: \`PostView\` (una fila por visita) y \`ReadSession\` (engagement por sesión).

## El heartbeat

Cada 15 segundos el lector envía:

- \`activeSeconds\`: segundos con la pestaña visible
- \`maxScrollDepth\`: 0–100
- \`completed\`: scroll ≥ 90%

El endpoint hace **upsert** por \`[postId, sessionId]\`: suma segundos, toma el max de scroll y OR de completitud.

## Por qué analítica propia

No es por reinventar Plausible. Es portfolio: diseño un pipeline medible de punta a punta y lo muestro en el dashboard del CMS con \`recharts\`.

## Pruébalo

Abre este post, haz scroll y revisa el dashboard en \`cms.luishswe.com\` (local: \`localhost:3001\`). Verás \`totalViews\` y el top de posts.
`,
      tags: ["tecnologia", "analitica"],
    },
  ];

  for (const p of posts) {
    const post = await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        content: p.content,
        excerpt: p.excerpt,
        status: "PUBLISHED",
        publishedAt: new Date(),
        authorId: author.id,
        tags: {
          connectOrCreate: p.tags.map((name) => ({
            where: { slug: name },
            create: { name, slug: name },
          })),
        },
      },
    });
    // Un comentario de ejemplo (publicado al momento) solo en el primero
    if (p.slug.startsWith("pensar-lateral")) {
      await prisma.comment.upsert({
        where: { id: "seed-comment-1" },
        update: {},
        create: {
          id: "seed-comment-1",
          content: "¡Gran post! ¿Cómo organizas tus 25 minutos de escritura?",
          authorName: "Lectora de prueba",
          postId: post.id,
          approved: true,
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
