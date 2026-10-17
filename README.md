# Lateral-Thinking — Blog personal + CMS

> Bitácora de un desarrollador construyendo un blog sobre **crecimiento personal** y **tecnología**, documentada como un tutorial de decisiones técnicas para el portfolio.

---

## Qué estás leyendo

Este README no es solo "cómo instalar y correr el proyecto". Es una **bitácora de decisiones**: cada cosa que se construyó, **por qué** se construyó así, y qué alternativas existían. La idea es que sirva como tutorial personal: cómo se piensa y se decide al construir una aplicación grande, de principio a fin, sin perderse.

Regla de oro del documento: **si una decisión no tiene un "por qué", no cuenta como decisión, cuenta como accidente.**

El **manual de uso local** (instalar, correr, escribir, comentar, medir) vive en [`MANUAL.md`](./MANUAL.md). Este README explica el *porqué*; el manual explica el *cómo*.

---

## 1. El proyecto en una frase

Un blog personal con **dos frontends y dos APIs REST**, donde yo escribo y analizo mis publicaciones, y los lectores las leen, comentan y comparten.

**Objetivo doble:**
1. Terminar el proyecto [Blog API de The Odin Project](https://www.theodinproject.com/lessons/node-path-nodejs-blog-api).
2. Construir algo real y bonito para mi portfolio, que me sirva para hacer networking y conseguir trabajo.

**Decisiones del dueño (2026-10-14, vinculantes):**
- **Sin deploy por ahora.** Todo queda documentado y funcional en local; el deploy se hará cuando el producto esté cerrado.
- **Imágenes: Vercel Blob.** `coverImage` hoy es URL externa; el upload Blob se implementa en fase deploy.
- **Un solo autor ADMIN + comentarios de invitados con publicación automática.** Sin multi-autor; los comentarios se publican al momento y el CMS solo los elimina.
- **3 posts de ejemplo en español** para probar todo de punta a punta (los escribo yo los reales después).

---

## 2. Mapa del monorepo (estado real)

```
Lateral-Thinking/
├─ apps/
│  ├─ web/          # Next.js 16: landing + /blog + /blog/[slug] + /sobre-mi (lector)
│  ├─ cms/          # Next.js 16: login + dashboard + posts + comentarios (privado)
│  ├─ api-public/   # Hono: API REST pública (puerto 4000)
│  └─ api-cms/      # Hono: API REST privada + Better Auth (puerto 4001)
├─ packages/
│  ├─ db/           # Prisma 7 schema + cliente (adapter Neon) + migraciones + seed
│  ├─ types/        # Contratos Zod compartidos (fuente de verdad)
│  ├─ ui/           # Componentes compartidos (button, card, code)
│  ├─ eslint-config/
│  └─ typescript-config/
├─ MANUAL.md        # Manual de uso local paso a paso
├─ turbo.json       # Tareas: build, lint, check-types, test, dev
└─ pnpm-workspace.yaml
```

**¿Por qué monorepo?** El backend y los frontends comparten muchísimo: el esquema de la base de datos, los tipos, los schemas de validación (Zod) y la configuración (ESLint/TS). En un monorepo eso vive en un solo lugar (`packages/`). Además, un solo comando (`pnpm dev`) levanta todo, y Turborepo **cachea** los `build`/`lint`/`check-types`/`test` para no repetir trabajo.

**Alternativa descartada:** 3 o 4 repositorios separados. Daría historias de commits independientes, pero habría que duplicar tipos y sincronizar cambios a mano. Para un proyecto de una sola persona, el monorepo gana.

**Herramientas:** `pnpm` (rápido, ahorra disco con enlaces) y `turbo` (orquestador de tareas).

---

## 3. Cómo se trabajó: orquestador + Dynamic Workflow

A partir de M4 el proyecto se construyó como **orquestación por subagentes**, no como una sola sesión lineal. El patrón, reutilizable para M8/M9:

### 3.1 Roles

| Rol | Responsabilidad | Ejemplo |
|---|---|---|
| **Investigación** | Auditar estado, proponer contratos, listar riesgos. No escribe código. | Auditoría M4-M9, prototipo web mínimo |
| **Redacción** | Implementa una sola app/paquete con tests y verificación verde. | `packages/types`, `api-cms` CRUD, `web` M5, `cms` M6, `api-public` M7 |
| **Edición** | Revisa el trabajo de todos, unifica, limpia, corrige bugs, deja deuda listada. | Validación global 44 tests verdes |

Regla: **si una subtarea requiere más de 3 pasos lógicos, se le asigna un subagente propio.** Cada subagente solo toca su alcance (`apps/api-cms/*`, `apps/web/*`, etc.) para evitar conflictos de merge.

### 3.2 Paralelización

```
W0  packages/types ──→ bloqueante (1 agente)
     │
     ├─→ W1 api-cms completa ─┐
     ├─→ W2 api-public M7 ────├── en paralelo (3 agentes)
     ├─→ W3 web pública M5 ───┘
     └─→ W4 cms frontend M6 ──┘ (paralelo, solo lee contratos)
W5  validación + limpieza ──→ secuencial (1 agente edición)
W6  seed + README + manual ──→ orquestador
```

W1-W4 no se tocan archivos entre sí, así que pueden correr a la vez. La validación (W5) es la única fase secuencial obligatoria.

### 3.3 Validación (criterio de aceptación)

Nada se muestra al dueño sin pasar, **con binarios directos** (en este entorno `pnpm --filter` falla por `ERR_PNPM_IGNORED_BUILDS` preexistente de `es5-ext`; se usa `./node_modules/.bin/`):

- `tsc --noEmit` en cada paquete
- `eslint . --max-warnings 0`
- `vitest run` donde haya tests (44 totales: 12 api-public + 32 api-cms)
- `next build` con API apagada (los frontends nunca rompen sin backend gracias a `safeFetch → null`)

---

## 4. Arquitectura y decisiones

### 4.1 Next.js + TypeScript

**¿Por qué?** Documentación de Next ya estudiada. Trae App Router, renderizado en servidor, optimización de imágenes y **Open Graph dinámicas** para compartir posts. TypeScript de punta a punta.

Decisiones frontend:
- **Server Components por defecto** (`/`, `/blog`, `/blog/[slug]`, `/sobre-mi`): SEO, OG dinámica, ISR 60s. **Client Components** solo donde hay navegador (`Comments`, `ViewTracker`, `ReadTracker`, `ShareButtons`, `MDXEditor`).
- **`safeFetch → null`:** ninguna página rompe el build con la API apagada; cada página decide su fallback visual.
- **`generateStaticParams` + `dynamicParams`:** el detalle prerenderiza los últimos 50 slugs y genera el resto on-demand.

### 4.2 Hono para las APIs REST

**¿Por qué Hono y no Express o Fastify?**
- Sobre el **estándar web** (`Request`/`Response`), portable a Node/Bun/Deno/Workers.
- **TypeScript-first**, ultraliviano, validación con `@hono/zod-validator`.
- Express es maduro pero tipado flojo; Fastify excelente pero menos portable/estándar.

### 4.3 Neon + Prisma 7

**¿Por qué?** Neon = Postgres serverless (escala a cero, ramas). Prisma = schema declarativo + migraciones + cliente tipado.

**Detalles clave de Prisma 7 (importante):**
- **ESM-only**, generator nuevo (`prisma-client`) con `output` obligatorio; el cliente **no** vive en `node_modules`.
- **Driver adapters obligatorios:** usamos `@prisma/adapter-neon`.
- Config en **`prisma.config.ts`**; las env **no se cargan solas** (`dotenv/config`).
- **CLI usa `DIRECT_URL`**, **app usa `DATABASE_URL` (pooler).** Mezclarlos agota conexiones o rompe migraciones.

**Modelo de datos:**
- `User` (autor + comentaristas; compatible Better Auth + `role` + `bio`).
- `Post` (título, `slug` único, `content` Markdown, `excerpt`, `coverImage` URL, `status` DRAFT/PUBLISHED/ARCHIVED, `publishedAt`, autor).
- `Tag` (N-M con `Post`).
- `Comment` (`approved = true` por defecto = **publicación automática**; el CMS solo elimina).
- `PostView` (una fila por visita) vs `ReadSession` (engagement por `[postId, sessionId]`: `activeSeconds`, `maxScrollDepth`, `completed`). Una vista no implica lectura.

### 4.4 Contratos compartidos (`packages/types`)

**¿Por qué?** Sin este paquete, `api-public` y `api-cms` duplicaban schemas y divergían (`z.email()` vs `z.string().url()`, `ARCHIVED` sí/no). Ahora la fuente de verdad es `@repo/types`: `paginationSchema` (con `z.coerce` porque los query params llegan como strings), `createPostSchema`/`updatePostSchema`, `commentCreateSchema`, `viewTrackSchema`, `readHeartbeatSchema`, `slugify()`.

**Divergencia consciente:** el CMS admite `excerpt/coverImage: null` para limpiar campos; el `partial()` del paquete no. Se deja local con comentario hasta decidir subir `nullable` al paquete.

### 4.5 Autenticación: Better Auth + JWT

**Diseño:** la auth vive en `api-cms`. El autor es el único que inicia sesión; los comentarios públicos son de invitados, así que `api-public` no necesita auth.

- Better Auth montado en `/auth/*`, plugin `jwt()`.
- Verificación **stateless** con `jose` contra el JWKS (`/auth/jwks`): no toca la DB por request. Alternativa descartada: `auth.api.getSession` (simple pero consulta DB y usa token de sesión, no JWT).
- El servidor guarda sesión + claves (`Session`, `Jwks`); el cliente guarda el JWT (`localStorage cms_jwt` + espejo en cookie `cms_token` para el middleware) y lo manda como `Authorization: Bearer`.
- `requireAuth` + `requireAdmin` (1 query de rol por request). `Session.token @unique` lo exige el adapter.
- Rate limit del CMS: global 120/min, escrituras 60/min (más generoso que los 10/min anónimos de la pública). `/auth/*` excluido del global porque Better Auth hace ráfagas internas (sign-up → session → jwks → token) y un 429 rompería el login.
- Tests desactivan limiters (`NODE_ENV=test` comparte clave `unknown`).

#### 4.5.1 Métodos de acceso (M11)

Además de email/contraseña, el CMS ofrece **Google**, **GitHub** y **magic link** (enlace por email), desde un **modal compartido** (`@repo/ui/playground/sign-in-modal`) que se abre desde la barra superior de **web y CMS**, con fondo difuminado.

- **Proveedores sociales opcionales:** Google/GitHub solo se registran en Better Auth si existen **ambas** env (`GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`). El modal pide `GET /providers` y **solo pinta los botones habilitados**: un botón que falla al pulsar es peor que no mostrarlo. Ese endpoint existe por ese motivo concreto. Redirect URIs: `http://localhost:4001/auth/callback/{google,github}` (en prod, los del dominio).
- **Callback social = mismo camino que magic link:** en el CMS, el login social vuelve por `magicCallbackUrl` (`/auth/callback`) para intercambiar la cookie de sesión por el JWT; antes volvía a la página actual y dejaba al autor sin JWT (las páginas protegidas daban 401). En la web pública, sin `magicCallbackUrl`, vuelve a la página actual y basta la cookie de sesión para el estado "logueado".
- **Magic link:** plugin `magicLink` con `disableSignUp` (solo se loguean cuentas existentes). Sin `RESEND_API_KEY` (dev/local) la URL se **loguea en la consola del servidor** con un aviso, así el flujo completo se prueba sin proveedor de email; en prod se envía por Resend vía `fetch` (sin SDK nuevo).
- **Opcionalidad por diseño:** ninguna credencial faltante rompe el build ni el login email/contraseña. Todo es env-driven.
- **El modal** cierra con Escape y clic fuera, bloquea el scroll, atrapa el foco, y es SSR-safe (`window`/`localStorage` solo en handlers y effects).
- **Sesión de comentaristas (parcial):** el formulario de comentarios puede prellenar nombre/email desde `cms_jwt` (best-effort) o permitir comentario anónimo. La API pública **aún no** acepta `userId` de comentarista: se prepara el terreno sin cambiar el contrato.
- **Vida del JWT (7d, no 15m):** Better Auth firma los JWT con **15 minutos** por defecto. En un CMS de un solo autor eso obliga a reloguearse cada rato, y peor: el 401 resultante se veía como "API no disponible" (bug de UX real). Se subió a `7d` para alinearlo con la cookie espejo `cms_token`. Tradeoff asumido: panel privado de un único ADMIN; el paso natural es un refresh token (M11+).
- **401 ≠ API caída:** el cliente del CMS ahora distingue ambos. Antes los dos devolvían `null` y las páginas decían "API no disponible", enviando al autor a buscar un problema inexistente. Ahora un 401 limpia el token y redirige a `/login`; "API no disponible" significa de verdad que la API no responde.
- **Modal en portal:** el `SignInModal` se monta con `createPortal` sobre `document.body`. Vivía dentro del nav, y el nav tiene `backdrop-blur` — un ancestro con `backdrop-filter`/`filter`/`transform` crea un *containing block* para descendientes `position: fixed`, así que el `inset-0` se anclaba al nav y el modal salía descentrado y recortado. El portal lo saca de ese contexto y lo centra sobre toda la pantalla.

### 4.6 Editor y render

Markdown nativo con **MDXEditor** (CMS, `ssr:false` obligatorio) y render con `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-pretty-code` (Shiki). Nota: **Markdown estándar no soporta colores/tamaños**; para eso, componentes MDX embebidos o migrar a Tiptap. Se eligió MDXEditor por ser markdown-native.

### 4.7 Imágenes (decisión Blob)

Hoy `coverImage` es `z.string().url()`: se pega URL externa. **Decisión del dueño: Vercel Blob** para el upload desde el CMS. No implementado aún (requiere cuenta/keys de Vercel, fase deploy). El endpoint `POST /upload` queda como próximo paso; el CMS ya deja el campo editable.

### 4.8 Despliegue (preparado, no ejecutado)

| Parte | Host previsto | Por qué |
|---|---|---|
| `apps/web`, `apps/cms` | **Vercel** | Soporte de primera para App Router, ISR, `next/image`, OG dinámicas |
| `api-public`, `api-cms` | **Render** | Proceso Node larga duración; mejor que serverless para Prisma + Neon |
| DB | **Neon** | Postgres serverless, ramas dev/test |
| Dominio | **Namecheap** (`luishswe.com`) | `luishswe.com` → web, `cms.` → CMS, `api.` → pública, `admin-api.` → CMS |

Por decisión del dueño, **no se despliega aún**. Queda documentado en el manual (DNS + env) para cuando el producto se cierre.

---

## 5. APIs (referencia rápida)

### api-public `http://localhost:4000`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado |
| GET | `/posts?page&limit&tag&q` | Listado paginado, solo PUBLISHED, filtro tag/q servidor |
| GET | `/posts/:slug` | Detalle publicado |
| GET | `/tags` | Tags con conteo de publicados |
| GET | `/posts/:slug/comments` | Aprobados |
| POST | `/posts/:slug/comments` | Crear (queda pendiente, 10/min) |
| GET | `/profile` | Autor ADMIN + recientes + populares |
| POST | `/posts/:slug/view` | Visita `{sessionId, referrer}` |
| POST | `/posts/:slug/heartbeat` | Engagement `{sessionId, activeSeconds, maxScrollDepth 0-100, completed}` (upsert) |

Hardening: `secureHeaders`, `requestId`, `bodyLimit` 100KB, `cors`, global 120/min + escrituras 10/min, `env.ts` Zod fail-fast, errores `{error:...}`.

### api-cms `http://localhost:4001`

| Método | Ruta | Descripción |
|---|---|---|
| ALL | `/auth/*` | Better Auth (login, sesión, JWKS) |
| GET | `/health` | Estado |
| GET | `/me` | Payload JWT (prueba protegida) |
| GET | `/posts` | Todos (incluye drafts), con `_count` |
| GET | `/posts/:slug` | Detalle admin (incluye drafts) |
| POST | `/posts` | Crear (slug auto + `connectOrCreate` tags) |
| PATCH | `/posts/:id` | Editar parcial (slug estable salvo explícito; `publishedAt` una sola vez) |
| DELETE | `/posts/:id` | Borrar (`{ok:true}`) |
| GET | `/comments` | Lista completa (CMS; solo eliminar) |
| DELETE | `/comments/:id` | Eliminar |
| GET | `/stats` | `totalPosts, published, drafts, totalViews, totalComments, topPosts[5]` |
| GET | `/tags` | Tags con conteo |

Convención: **GET por `:slug`** (previsualiza la URL pública), **PATCH/DELETE por `:id`** (el slug es mutable, el `cuid` no).

---

## 6. Frontends (qué hay)

**web (`localhost:3000`):** `/` (hero del blog + recientes + populares + temas), `/blog?page&tag&q` (paginación + búsqueda servidor), `/blog/[slug]` (markdown + comentarios + `ViewTracker` + `ReadTracker` + `ShareButtons` + `generateMetadata` OG), `/sobre-mi`, 404 tematizado. ISR 60s.

**cms (`localhost:3001`):** `/login` (email/password → JWT), `/` (dashboard: 5 stat cards + Bar `recharts` topPosts), `/posts` (tabla + borrar), `/posts/nuevo` y `/posts/[id]` (MDXEditor `ssr:false`), `/comentarios` (lista completa + eliminar). `middleware.ts` + `AuthGuard` redirigen sin token. Nota Next 16: `middleware.ts` está deprecado a favor de `proxy` (migrar en M8 con el codemod).

### 6.1 Sistema de diseño compartido (`@repo/ui/playground`)

**Decisión:** el blog y el CMS comparten **exactamente** la identidad visual del portafolio [About-Me](../About-Me). No es "inspiración": son los mismos tokens, la misma tipografía y las mismas primitivas en un solo sitio del monorepo, así que un cambio de paleta se propaga a las dos apps a la vez.

- **Dónde vive:** `packages/ui/src/playground/` → `theme.css` (tokens), `button.tsx`, `tag.tsx`, `section-heading.tsx`, `theme-toggle.tsx`, `site-nav.tsx`, `site-footer.tsx`, `site-theme-provider.tsx`, `cn.ts`. Se consume con `@repo/ui/playground` (JS) y `@repo/ui/playground.css` (CSS). Los exports antiguos `@repo/ui/button|card|code` siguen intactos.
- **Paleta:** papel `#fff6ec` / tinta `#221d2e` + coral `#ff5c7a`, sol `#ffc95c`, violeta `#8b7cff`, menta `#3fc7a9`. Fondo alterno en dark: papel `#17141c`, tinta `#f4ede4`.
- **Contraste (la parte que no se improvisa):** `--color-on-accent` (**nunca** tematizado) para texto sobre los fills brillantes; variantes `*-ink` (coral/violet/mint) para texto de acento sobre papel. En dark los `*-ink` se invierten a los tonos brillantes. Ratios AA medidos en el portafolio: 5.50 / 5.01 / 10.72 / 7.76 sobre fills y 5.26 / 6.28 / 4.91 sobre papel.
- **Terminal:** `--color-terminal` y sus variantes **no** se tematizan a propósito: una shell no debe invertirse entre temas.
- **Tipografía:** tres familias de Google vía `next/font/google` en `lib/fonts.ts` de cada app: Bricolage Grotesque (`font-display`, titulares), Inter (`font-sans`, cuerpo), JetBrains Mono (`font-mono`, kickers y meta). Kickers mono `0.6875rem / uppercase / tracking .22em`.
- **El lenguaje:** borde de tinta `1.5px` siempre (`border-[1.5px] border-ink`), sombras duras offset sin blur (`3px` y `6px`), radios `card 14px` / `chip 10px` / `pill`, cero gradientes, rotaciones decorativas solo en `-5..5deg`, `color-scheme` sincronizado con `[data-theme]`.
- **Dark mode:** `next-themes` con `attribute="data-theme"`, `defaultTheme="system"` y toggle pill en ambas apps. Sin flash de hidratación (toggle con `useSyncExternalStore`, no estado en efectos).
- **Tailwind v4 CSS-first:** sin `tailwind.config.js`; todos los tokens viven en `@theme` dentro de `theme.css`. Integración por `postcss.config.mjs` (`@tailwindcss/postcss`), que Next 16 honra también con Turbopack.
- **`@source` (la trampa del monorepo):** Tailwind escanea el directorio del CSS de entrada; como las clases viven en `packages/ui/src`, cada `globals.css` declara `@source "../../../packages/ui/src"`. Sin eso, las utilidades usadas dentro del paquete **no se generarían** y los componentes saldrían sin estilo. Verificado en build: `.bg-coral`, `.border-ink`, `.text-on-accent`, `.hard-shadow`, `.ink-border` y `.rounded-card` aparecen en el CSS servido.
- **Sin animaciones decorativas** por decisión del dueño: no hay confetti, sonido, Lenis ni reveals con `motion`; solo transiciones de hover cortas, y el kill-switch global de `prefers-reduced-motion` que ya viene en `theme.css`.
- **Regla dura:** los hex viven **solo** en `theme.css`. En `apps/*` solo tokens. Única excepción documentada: el scope `.cms-mdx-scope` de `apps/cms/app/globals.css`, que remapea variables internas de MDXEditor (traen `--basePageBg: white` fijo) a los tokens para que el editor no quede en blanco en dark.

---

## 7. Puesta en marcha (resumen; detalle en MANUAL.md)

```bash
pnpm install
# configurar .env en packages/db, apps/api-public, apps/api-cms (+ .env.local en web/cms)
pnpm --filter @repo/db exec prisma migrate dev
pnpm --filter @repo/db exec prisma db seed   # 3 posts ejemplo + 1 comentario pendiente
pnpm dev   # web:3000 cms:3001 api-public:4000 api-cms:4001
```

Verificación global: `turbo run check-types lint test build` (o binarios directos si `pnpm --filter` falla por `es5-ext`; ver manual).

---

## 8. Bitácora paso a paso

### M0 — Fundaciones
Turborepo + pnpm, TS estricto, ESLint, `turbo.json` (`dev` persistente sin caché; `build` con `^build`; + `test` añadido en validación). `packageManager pnpm@11 + .nvmrc` = reproducibilidad.

### M1 — Base de datos
Neon + `@repo/db` + Prisma 7. Decisiones: `cuid()`, `createdAt/updatedAt` siempre, comentarios con publicación automática (migración `20261016000000`), analítica propia, `PostView` vs `ReadSession` separados.

### M2 — API pública
Lectura + comentarios + analítica básica, Zod-first, `select` mínimo (no exponer emails ni `content` en listados), errores consistentes, hardening completo, tests con `@repo/db` mockeado (`mockResolvedValue` + `toHaveBeenCalled`).

### M3 — Auth
Better Auth + JWT en `api-cms`. JWKS + `jose` stateless. Variables tipadas `Hono<AuthEnv>` (sin eso, TS2769).

### M4 — API CMS (completada por subagente)
CRUD + comentarios (solo eliminar) + stats + tags + `env.ts` + hardening. Ver §5 para convención slug/id.

### M5 — Web pública (subagente)
Landing + blog + detalle + OG + comentarios + trackers. Markdown stack mínimo instalado.

### M6 — CMS frontend (subagente)
Scaffold `apps/cms` + auth JWT + MDXEditor + dashboard recharts. 7 rutas, build verde sin API.

### M7 — Analítica (subagente)
`POST /heartbeat` (upsert acumulativo), `GET /tags`, `?tag=&q=` servidor. Web: `ReadTracker` POST real cada 15s; `ViewTracker` 1 POST por pestaña+slug.

### Validación (agente edición)
Unificó `@repo/types` en ambas APIs, pasó blog a filtros servidor, `ReadTracker` a POST real, normalizó `.env.example`, añadió `test` a `turbo.json`, corrigió `es5-ext: "true or false"` → `false` en `pnpm-workspace.yaml`. **44/44 tests, 6+7 rutas Next en verde.**

### Seed ejemplo
3 posts en español (lateralidad, Hono, analítica) + 1 comentario de ejemplo ya publicado.

### M10 — Identidad visual compartida (portado desde About-Me)

**Qué:** extraer el sistema de diseño del portafolio a `@repo/ui/playground` y aplicarlo a web y CMS.

**Decisiones:**
- **Paquete compartido, no copiar-pegar.** El portafolio es un repo suelto; aquí vive en `packages/ui`. Un cambio de paleta se propaga a web y CMS a la vez, y el CMS no puede divergir por descuido.
- **Solo paleta y tipografía**, por petición del dueño: se portaron tokens, fuentes, bordes de tinta y sombras duras; se **descartaron** las animaciones decorativas del portafolio (confetti con `K`, toggle de sonido, Lenis, reveals con `motion`, squiggles animadas). El lenguaje visual se mantiene; la teatralidad no. Es un blog, no una landing.
- **Contraste como restricción, no como opinión:** los tokens `on-accent` y `*-ink` existen porque los fills brillantes necesitan texto oscuro y el papel necesitaba variantes AA. Se midieron antes de usarse.
- **`@source` explícito** en cada `globals.css` (trampa real de Tailwind v4 en monorepo, documentada en §6.1).
- **Contenido traducido, lenguaje visual no:** el blog mantiene `lang="es"`; los kickers mono (`// BLOG`, `$ ls ~/posts --featured`) son parte del sistema y se adaptaron al español.
- **Bug corregido al portar:** `Button` renderizaba `<button>` sin `type`, así que cualquier acción dentro de un `<form>` (p. ej. los botones de compartir en el artículo) enviaba el formulario. Ahora el defecto es `type="button"` y `type="submit"` se declara explícito.

**Verificación:** 18/18 comprobaciones en verde (tsc, eslint, next build, 44 tests), ambos temas en el CSS servido, contraste AA verificado en claro y oscuro, y cero hex fuera de `theme.css`.

---

## 9. Cómo pensar las decisiones (heurísticas)

1. **Empieza por los datos.** El schema es lo más caro de cambiar.
2. **Contrato antes de lógica.** Zod primero, Prisma después.
3. **Aísla lo compartido.** Dos consumidores → `packages/`.
4. **Falla temprano.** Env inválido = proceso que no arranca.
5. **Seguridad por defecto.** Headers, bodyLimit, rate limit siempre.
6. **La respuesta es un contrato.** Solo lo necesario.
7. **Prueba sin el mundo.** Mocks = rápidos y reproducibles.
8. **Pasos con aceptación verificable.** Cada fase tiene su comando verde.
9. **Documenta el porqué.** El código dice qué; el README dice por qué.

---

## 10. Roadmap

- [x] M0 Monorepo · [x] M1 DB · [x] M2 API pública · [x] M3 Auth
- [x] M4 API CMS · [x] M5 Web pública · [x] M6 CMS · [x] M7 Analítica
- [ ] M8 Deploy (Vercel + Render + Neon + `luishswe.com` + Blob + migrar `middleware→proxy`) — **pendiente por decisión del dueño**
- [ ] M9 Pulido (tests web/cms, `session.ts` compartido, clamp `?page=99`, exponer `_count.views`, a11y, performance, SEO)

Deuda fina (de la validación del re-skin):

| Sev. | Hallazgo |
|---|---|
| MEDIA | `site-nav.tsx`: la elevación al hacer scroll usa un `rgba` literal → invisible en dark (solo actúa `border-ink/15`). Pide un token de sombra suave tematizado. |
| MEDIA | ~~`Comments.tsx`: el comentario nuevo se descarta del estado local; el contador queda desfasado hasta el ISR (60 s). Coherente con "visible tras moderación".~~ **Resuelto (2026-10-16):** publicación automática; el comentario nuevo se añade al estado local y aparece al momento. |
| BAJA | `ReadTracker.tsx`: `slugRef.current = slug` en fase de render (impureza). |
| BAJA | `getSessionId()` duplicado en `ViewTracker` y `ReadTracker` → extraer a `lib/session.ts`. |
| BAJA | `cms/components/ui.tsx`: el `hint` va dentro del `<label>`; debería ir fuera con `aria-describedby`. |
| BAJA | `middleware.ts` deprecada a favor de `proxy` (Next 16). |
| BAJA | Home: si solo cae `/posts` (y no `/profile`), no se muestra el aviso de API caída. |
| INFO | `Meta` del CMS usa `text-xs` (12 px) vs `0.6875rem` en web: roles distintos, a decisión del dueño. |

---

Hecho a mano, aprendiendo, con un equipo de subagentes orquestado. 🚀
