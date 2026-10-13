# Lateral-Thinking — Blog personal + CMS

> Bitácora de un desarrollador construyendo un blog sobre **crecimiento personal** y **tecnología**, documentada como un tutorial de decisiones técnicas para el portfolio.

---

## ¿Qué estás leyendo?

Este README no es solo "cómo instalar y correr el proyecto". Es una **bitácora de decisiones**: cada cosa que se construyó, **por qué** se construyó así, y qué alternativas existían. La idea es que sirva como tutorial personal: cómo se piensa y se decide al construir una aplicación grande, de principio a fin, sin perderse.

Regla de oro del documento: **si una decisión no tiene un "por qué", no cuenta como decisión, cuenta como accidente.**

---

## 1. El proyecto en una frase

Un blog personal con **dos frontends y dos APIs REST**, donde yo escribo y analizo mis publicaciones, y los lectores las leen, comentan y comparten.

**Objetivo doble:**
1. Terminar el proyecto [Blog API de The Odin Project](https://www.theodinproject.com/lessons/node-path-nodejs-blog-api).
2. Construir algo real y bonito para mi portfolio, que me sirva para hacer networking y conseguir trabajo.

---

## 2. Arquitectura y decisiones

### 2.1 Monorepo con Turborepo + pnpm

```
Lateral-Thinking/
├─ apps/
│  ├─ web/          # Next.js: landing + blog público (lector)   [pendiente]
│  ├─ cms/          # Next.js: editor + dashboard (privado)      [pendiente]
│  ├─ api-public/   # Hono: API REST pública
│  └─ api-cms/      # Hono: API REST privada (CMS)               [pendiente]
├─ packages/
│  ├─ db/           # Prisma schema + cliente + migraciones
│  ├─ auth/         # configuración de Better Auth               [pendiente]
│  ├─ types/        # DTOs y schemas Zod compartidos             [pendiente]
│  ├─ ui/           # componentes compartidos
│  ├─ eslint-config/
│  └─ typescript-config/
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

**¿Por qué monorepo?** El backend y los frontends comparten muchísimo: el esquema de la base de datos, los tipos, los schemas de validación (Zod) y la configuración (ESLint/TS). En un monorepo eso vive en un solo lugar (`packages/`). Además, un solo comando (`pnpm dev`) levanta todo, y Turborepo **cachea** los `build`/`lint`/`check-types` para no repetir trabajo.

**Alternativa descartada:** 3 o 4 repositorios separados. Daría historias de commits independientes, pero habría que duplicar tipos y sincronizar cambios a mano. Para un proyecto de una sola persona, el monorepo gana.

**Herramientas:** `pnpm` (gestor de paquetes rápido y ahorra disco con enlaces) y `turbo` (orquestador de tareas).

### 2.2 Next.js + TypeScript

**¿Por qué?** Ya terminé la documentación de Next.js y quiero usarlo. Trae App Router, renderizado en servidor, optimización de imágenes y las **Open Graph dinámicas** que necesito para que compartir posts se vea lindo. TypeScript nos da seguridad de tipos de punta a punta.

### 2.3 Hono para las APIs REST

**¿Por qué Hono y no Express o Fastify?**
- Está construido sobre el **estándar web** (`Request`/`Response`), no sobre el `req`/`res` de Node. Eso lo hace **portable**: el mismo código corre en Node, Bun, Deno o Cloudflare Workers.
- Es **TypeScript-first**, ultraliviano, y se integra directo con Zod vía `@hono/zod-validator`.
- Tiene **RPC type-safe** (`hono/client`): el frontend puede importar los tipos de las rutas y tener autocompletado y errores de compilación si llamo mal un endpoint.
- Express es maduro pero viejo (tipado flojo, sin validación integrada). Fastify es excelente, pero Hono nos enseña los estándares modernos y maximiza la portabilidad.

### 2.4 Neon + Prisma

**¿Por qué?**
- **Neon** es Postgres serverless (escala a cero, ramas de base de datos), con capa gratuita.
- **Prisma** da un schema declarativo, migraciones versionadas y un cliente con **tipos generados** a partir del schema.
- Juntos: escribo el modelo una vez, obtengo seguridad de tipos en las consultas y migraciones reproducibles.

**Detalles clave de Prisma 7 (importante):**
- Es **ESM-only** y usa un **generator nuevo** (`prisma-client`) que exige una ruta de `output`; el cliente ya no se genera dentro de `node_modules`.
- Los **driver adapters son obligatorios**: usamos `@prisma/adapter-neon`.
- La configuración vive en **`prisma.config.ts`** (no en `package.json`), y las variables de entorno **no se cargan solas**: hay que importar `dotenv/config`.
- La **CLI** (migraciones) usa la conexión **directa** (`DIRECT_URL`); la **app** usa la **con pooler** (`DATABASE_URL`).

### 2.5 Autenticación: Better Auth + JWT (pendiente)

**Plan:** Better Auth para el CMS del autor, con el plugin `bearer` para emitir/aceptar **JWT** en el header `Authorization`. Odin pide JWT explícitamente, así que cumplimos el ejercicio y usamos una librería moderna.

Detalle importante: como los frontends y las APIs vivirán en subdominios de `luishswe.com`, son **same-site**, así que las cookies de sesión también funcionan (`cookieDomain: ".luishswe.com"`). Usaremos JWT bearer para la API del CMS.

### 2.6 Despliegue

| Parte | Host | Por qué |
|---|---|---|
| `apps/web`, `apps/cms` | **Vercel** | Es de los creadores de Next.js: soporte de primera para App Router, ISR, `next/image` y Open Graph dinámicas. |
| `api-public`, `api-cms` | **Render** | Proceso Node de larga duración; mejor que serverless para Prisma + Neon (menos cold starts). |
| Base de datos | **Neon** | Postgres serverless, ramas para dev/test. |
| Dominio | **Namecheap** (`luishswe.com`) | Dominio propio: `luishswe.com` → web, `cms.` → CMS, `api.` → API pública, `admin-api.` → API CMS. |

### 2.7 El editor de contenido (decidido, pendiente)

Markdown nativo con **MDXEditor**, y renderizado con `react-markdown` + `remark-gfm` + `rehype-pretty-code` (Shiki). Nota técnica: **Markdown estándar no soporta colores ni tamaños de fuente**; para eso se usan componentes MDX embebidos, o se migra a un editor de contenido rico (Tiptap) guardando otro formato. Se eligió MDXEditor por ser markdown-native.

---

## 3. Requisitos

- **Node** 26.7.0 (ver `.nvmrc`)
- **pnpm** 11.x
- Cuenta en **Neon** con un proyecto creado

---

## 4. Puesta en marcha

```bash
# 1. Instalar dependencias de todo el monorepo
pnpm install

# 2. Configurar variables de entorno (ver sección 5)

# 3. Generar el cliente de Prisma
pnpm --filter @repo/db exec prisma generate

# 4. Aplicar migraciones (necesita DIRECT_URL)
pnpm --filter @repo/db exec prisma migrate dev

# 5. Sembrar datos de ejemplo (opcional)
pnpm --filter @repo/db exec prisma db seed

# 6. Levantar todo en modo desarrollo
pnpm dev
```

La API pública queda en `http://localhost:4000`.

---

## 5. Variables de entorno

Cada paquete que las necesita tiene su propio `.env` (ignorado por git) y un `.env.example` (sí versionado).

**`packages/db/.env`**
```
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"  # con pooler, para la app
DIRECT_URL="postgresql://.../neondb?sslmode=require"             # directa, para migraciones
```

**`apps/api-public/.env`**
```
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

---

## 6. Bitácora paso a paso

### M0 — Fundaciones del monorepo

**Qué:** crear la estructura base con Turborepo + pnpm, TypeScript estricto, ESLint/Prettier y CI.

**Decisiones:**
- `"packageManager": "pnpm@11.25.0"` y `.nvmrc` con `26.7.0` → reproducibilidad: cualquiera (o un CI) usa las mismas versiones.
- Tareas en `turbo.json`: `dev` (persistente, sin caché), `build` (cacheado, depende de `^build`), `lint`, `check-types`.
- Se conservó el scope `@repo/*` (convención de Turborepo).

### M1 — Base de datos (Neon + Prisma)

**Qué:** proyecto en Neon, paquete `@repo/db` con Prisma, schema de datos y primera migración.

**Modelo de datos:**
- `User` (autor y comentaristas; campos compatibles con Better Auth: `email`, `name`, `image`, `emailVerified`, más `role` y `bio`).
- `Post` (título, `slug` único, `content` en Markdown, `excerpt`, `coverImage`, `status` DRAFT/PUBLISHED/ARCHIVED, `publishedAt`, autor).
- `Tag` (relación muchos-a-muchos con `Post`).
- `Comment` (contenido, `approved` para moderación, autor logueado **o** invitado con `authorName`/`authorEmail`).
- `PostView` (una fila por vista: `sessionId`, `referrer`).
- `ReadSession` (tiempo de lectura: `activeSeconds`, `maxScrollDepth`, `completed`, único por `[postId, sessionId]`).

**Decisiones:**
- IDs con `cuid()`; `createdAt`/`updatedAt` en todos los modelos.
- Comentarios con **moderación por defecto** (`approved = false`).
- Analítica **propia** (no Umami/Plausible) para el portfolio.
- Separar `PostView` (visitas) de `ReadSession` (engagement): una vista no implica lectura.

**Buenas prácticas de Prisma 7:** `prisma.config.ts` centraliza schema/migraciones/seed y apunta a `DIRECT_URL`; el runtime usa el adapter de Neon con `DATABASE_URL`.

### M2 — API pública (Hono)

**Qué:** `apps/api-public` con rutas de lectura + comentarios + analítica básica, validación, seguridad y tests.

**Rutas:**
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/posts` | Listado paginado (solo publicados) |
| GET | `/posts/:slug` | Detalle de un post |
| GET | `/posts/:slug/comments` | Comentarios aprobados |
| POST | `/posts/:slug/comments` | Crear comentario (queda pendiente de aprobación) |
| GET | `/profile` | Datos de la landing: autor + recientes + populares |
| POST | `/posts/:slug/view` | Registrar una visita |

**Decisiones y por qué:**
- **Contratos con Zod** (`@hono/zod-validator`): validar la entrada antes de tocar la base de datos. Ej.: `page`/`limit` con `z.coerce.number()` (los query params llegan como strings).
- **`select` en las respuestas:** un endpoint devuelve **solo lo que el cliente necesita**. No filtrar el `email` del usuario ni el `content` completo en un listado.
- **Errores consistentes:** JSON `{ "error": "..." }` + `notFound` y `onError` globales.
- **Seguridad (hardening):** `secureHeaders`, `requestId`, `bodyLimit` (100 KB) y **rate limiting** (120 req/min global, 10/min en escrituras).
- **Validación de entorno** con Zod (`env.ts`) y *fail-fast*: si la config es inválida, el proceso no arranca.
- **Tests con Vitest** y `@repo/db` **mockeado**: probamos la app con `app.request()` sin tocar Neon. Un mock se **configura** (`mockResolvedValue`) y se **aserta** con `toHaveBeenCalled`, no con `.toBe` sobre la función.

### M3 — Autenticación (Better Auth + JWT)

**Qué:** `apps/api-cms` con Better Auth montado en `/auth/*` y una ruta protegida de prueba `GET /me`.

**Rutas:**
| Método | Ruta | Descripción |
|---|---|---|
| ALL | `/auth/*` | Login, registro, sesión y JWKS (delegado a Better Auth) |
| GET | `/health` | Estado del servicio |
| GET | `/me` | Prueba protegida: devuelve el payload del JWT |

**Decisiones y por qué:**
- **La auth vive en `api-cms`:** el autor es el único que inicia sesión; los comentarios públicos son de invitados (`authorName`/`authorEmail`), así que `api-public` no necesita auth.
- **JWT verificado contra el JWKS (`/auth/jwks`) con `jose`:** es *stateless* (no toca la DB en cada request), escala y es literalmente "verificar el JWT". La alternativa (plugin `bearer` + `auth.api.getSession`) es más simple pero consulta la DB y usa el token de sesión, no el JWT.
- **El servidor no guarda el JWT:** guarda la sesión (tabla `Session`) y las claves (tabla `Jwks`). El cliente guarda el JWT (memoria o `localStorage`, conociendo el riesgo XSS) y lo manda como `Authorization: Bearer`.
- **Variables tipadas de Hono (`Hono<AuthEnv>`):** `c.set`/`c.get` exigen declarar `Variables`, si no TS2769. El tipo se comparte entre el middleware y la app.
- **`Session.token` con `@unique`:** lo exige el adapter de Better Auth; sin eso el login falla.

---

## 7. Cómo pensar las decisiones (heurísticas)

1. **Empieza por los datos.** El modelo (`schema.prisma`) es lo que más cuesta cambiar después. Todo lo demás se apoya en él.
2. **Define el contrato antes de implementar.** Primero "qué entra y qué sale" (Zod), después la lógica.
3. **Aísla lo compartido.** Si dos apps necesitan lo mismo, va a `packages/`.
4. **Falla temprano y ruidosamente.** Mejor que el proceso no arranque con env inválido que un error raro a mitad de un request.
5. **Seguridad por defecto.** Headers, límite de tamaño, rate limiting: siempre, no después.
6. **La respuesta es un contrato.** Devuelve solo lo necesario; cada campo expuesto es un riesgo.
7. **Prueba sin depender del mundo.** Tests con mocks = rápidos y reproducibles.
8. **Pasos pequeños con criterio de aceptación.** Cada paso tiene un "listo" verificable (`check-types`, `test`, un `curl`).
9. **Documenta el por qué, no el qué.** El código dice *qué* hace; el README y los commits dicen *por qué*.

---

## 8. Roadmap

- **M3** — Autenticación con Better Auth + JWT.
- **M4** — API del CMS (`api-cms`): CRUD de posts, imágenes, moderación, stats.
- **M5** — Frontend público (`web`): landing, blog, comentarios, compartir, Open Graph.
- **M6** — Frontend del CMS (`cms`): editor MDXEditor + dashboard con gráficos.
- **M7** — Analítica de lectura: heartbeat, scroll, tiempo promedio.
- **M8** — Deploy: Vercel + Render + Neon + dominio `luishswe.com`, y CI.
- **M9** — Pulido de portfolio: README final, accesibilidad, performance, SEO.

---

## 9. Estado actual

- [x] M0 — Monorepo (Turborepo + pnpm)
- [x] M1 — Base de datos (Neon + Prisma)
- [x] M2 — API pública (Hono) + hardening + tests
- [x] M3 — Auth (Better Auth + JWT)
- [ ] M4 — API CMS
- [ ] M5 — Frontend público
- [ ] M6 — Frontend CMS
- [ ] M7 — Analítica de lectura
- [ ] M8 — Deploy
- [ ] M9 — Pulido

---

Hecho a mano, aprendiendo, con un asesor técnico al lado. 🚀
