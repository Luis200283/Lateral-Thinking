# Manual de uso — Lateral-Thinking

Manual operativo del blog. El *porqué* de cada decisión vive en el [README](./README.md); aquí solo el *cómo*, paso a paso, para correr todo en local y usarlo a diario.

---

## 1. Requisitos

- **Node** 24+ (ver `.nvmrc`)
- **pnpm** 11.x (`npm i -g pnpm` si falta)
- Cuenta en **Neon** con un proyecto Postgres creado (solo necesitas las dos URLs)

Puertos locales:

| App | Puerto | URL |
|---|---|---|
| web (lector) | 3000 | http://localhost:3000 |
| cms (editor) | 3001 | http://localhost:3001 |
| api-public | 4000 | http://localhost:4000 |
| api-cms + auth | 4001 | http://localhost:4001 |

---

## 2. Instalación (primera vez)

```bash
# 0. Clonar y entrar
git clone <tu-repo> Lateral-Thinking && cd Lateral-Thinking

# 1. Instalar todo el monorepo
pnpm install

# Si pnpm se queja de builds ignorados (es5-ext), es política conocida:
# ya está corregida en pnpm-workspace.yaml (es5-ext: false).
# Si persiste: pnpm install --ignore-scripts y luego pnpm rebuild si hace falta.
```

### 2.1 Variables de entorno

Cada app tiene su `.env.example`. Copia y rellena:

**`packages/db/.env`** (obligatorio: sin esto nada toca la DB)
```
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"  # pooler, runtime
DIRECT_URL="postgresql://.../neondb?sslmode=require"              # directa, migraciones
```
Copia ambas desde el dashboard de Neon (Roles & Databases → Connection strings: pooled vs direct).

**`apps/api-public/.env`**
```
DATABASE_URL="..."   # misma pooler
DIRECT_URL="..."     # opcional aquí, la usa prisma.config
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**`apps/api-cms/.env`**
```
DATABASE_URL="..."
DIRECT_URL="..."
PORT=4001
CORS_ORIGIN=http://localhost:3000,http://localhost:3001   # web y CMS, coma sin espacios
BETTER_AUTH_SECRET="un-secreto-largo-local"   # obligatorio en prod, opcional en dev
BETTER_AUTH_URL="http://localhost:4001"
```

**`apps/web/.env.local`** (opcional; sin esto usa `localhost:4000`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**`apps/cms/.env.local`** (opcional; sin esto usa `localhost:4001`)
```
NEXT_PUBLIC_CMS_API_URL=http://localhost:4001
```

### 2.2 Base de datos

```bash
# Generar cliente (Prisma 7 lo pone en packages/db/generated)
pnpm --filter @repo/db exec prisma generate

# Aplicar migraciones (usa DIRECT_URL)
pnpm --filter @repo/db exec prisma migrate dev

# Sembrar 3 posts de ejemplo en español + 1 comentario pendiente
pnpm --filter @repo/db exec prisma db seed
```

El seed crea al autor `luis@luishswe.com` (ADMIN) y los slugs:
- `pensar-lateral-terminar-lo-que-empiezo`
- `de-express-a-hono-lo-que-aprendi`
- `como-mido-si-alguien-lee-mis-posts`

Bórralos cuando publiques los tuyos (desde el CMS o editando el seed).

### 2.3 Levantar todo

```bash
pnpm dev
```

Abre: web http://localhost:3000, cms http://localhost:3001, `curl http://localhost:4000/health`, `curl http://localhost:4001/health`.

Para correr una sola app: `pnpm --filter web dev`, `pnpm --filter cms dev`, `pnpm --filter @repo/api-public dev`, `pnpm --filter @repo/api-cms dev`.

---

## 3. Uso diario: lector (web)

- `/` — hero del blog + recientes + populares + temas. Si la API está apagada, muestra fallback con aviso (no rompe).
- `/blog?page=1&tag=tecnologia&q=hono` — listado con búsqueda y filtro por tag (servidor).
- `/blog/[slug]` — post con markdown, comentarios, botones compartir (Web Share / X / LinkedIn / copiar), OG dinámica al compartir el link.
- `/sobre-mi` — bio extendida.
- **Tema claro/oscuro:** toggle en la barra superior (mismo que el portafolio). Se guarda la preferencia del sistema.

**Probar medición:** abre un post, haz scroll; cada 15 s se envía heartbeat (`activeSeconds`, `maxScrollDepth`, `completed`). Lo verás en el dashboard del CMS.

### 3.1 El sistema de diseño (cómo se usa y cómo se rompe)

Web y CMS comparten la identidad visual del portafolio en `@repo/ui/playground`:

```tsx
import { Button, Tag, SectionHeading, SiteNav, SiteFooter, ThemeToggle, cn } from "@repo/ui/playground";
// CSS ya importado en app/globals.css; no lo re-importes.
```

- **Tokens** (no uses hex en `apps/*`): `bg-paper`, `bg-surface`, `text-ink`, `text-muted`, `text-coral-ink|violet-ink|mint-ink`, `text-on-accent`, fills `bg-coral|sun|violet|mint`, `border-ink` (+ `/15`), `rounded-card|chip|pill`, utilidades `.ink-border` / `.hard-shadow` / `.hard-shadow-lg`.
- **Tipografía:** `font-display` (titulares), `font-sans` (cuerpo), `font-mono` (kickers, meta, terminal).
- **Kickers:** `font-mono text-[0.6875rem] uppercase tracking-[0.22em]`.
- **El lenguaje:** borde `1.5px` de tinta siempre, sombra dura `3px` (chips) o `6px` (tarjetas), hover `-translate-y-1`, cero gradientes.
- **Al añadir una clase que use un componente de `packages/ui`** no hay que hacer nada. Al añadir una clase nueva en `apps/*`, Tailwind la detecta solo. **Lo que no se regenera solo** son las clases usadas *dentro* de `packages/ui/src`: si añades componentes allí con clases nuevas, verifica que el CSS de build las contiene (`grep '.tu-clase' .next/static/chunks/*.css`); si faltan, el `@source` de `globals.css` no está cubriendo la ruta.
- **Cambiar la paleta:** edita solo `packages/ui/src/playground/theme.css` (bloque `@theme` + `[data-theme="dark"]`), y se propaga a web y CMS. Respeta las reglas: `--color-on-accent` nunca se tematiza, y los `*-ink` deben mantener contraste AA sobre papel en ambos temas.

---

## 4. Uso diario: editor (cms)

### 4.1 Crear tu cuenta ADMIN (solo primera vez)

El seed crea el `User` ADMIN pero **sin password** (Better Auth guarda credenciales en `Account`). Regístrate una vez:

```bash
curl -X POST http://localhost:4001/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"luis@luishswe.com","password":"CAMBIA-ESTO","name":"Luis"}'
```

Luego entra en http://localhost:3001/login con ese email/password. El CMS guarda el JWT en `localStorage (cms_jwt)` + cookie `cms_token`.

> Si el sign-up falla porque el email ya tiene `Account`, usa el login directamente. Si quieres resetear: borra el usuario en Neon y repite seed + sign-up.

### 4.1.1 Entrar con Google, GitHub o magic link

Desde cualquier página (web `:3000` y CMS `:3001`) hay un botón **Iniciar sesión** en la barra superior que abre el modal con fondo difuminado.

**Magic link (probarlo ya, sin configurar nada):**
1. Escribe tu email en el modal → "Enviar enlace mágico".
2. Como no hay proveedor de email en local, el enlace sale en la **consola del servidor** `api-cms`:
   ```
   [magic-link] Enlace de acceso para tu@email.com:
     http://localhost:4001/auth/magic-link/verify?token=...&callbackURL=%2F
   ```
3. Abre ese enlace en el navegador y quedas dentro. (Con `RESEND_API_KEY` configurada llegará por email.)

**Google / GitHub (necesitan credenciales tuyas):**
- El botón solo aparece si el servidor tiene las env correspondientes. Si no, no se muestra (no hay botón muerto).
- Crea las apps OAuth con estos redirect:
  - Google Cloud Console → `http://localhost:4001/auth/callback/google`
  - GitHub → Developer settings → OAuth Apps → `http://localhost:4001/auth/callback/github`
- Pega `GOOGLE_CLIENT_ID/SECRET` y `GITHUB_CLIENT_ID/SECRET` en `apps/api-cms/.env` y reinicia la API.
- Para email en prod: `RESEND_API_KEY` (resend.com) y `EMAIL_FROM` de un dominio verificado.

**Comprobar qué proveedores están activos:**
```bash
curl http://localhost:4001/providers   # {"google":false,"github":false}
```

### 4.2 Escribir un post

1. `/posts/nuevo` → título, slug (auto si lo dejas vacío), excerpt, coverImage (por ahora **pega una URL**; Vercel Blob llega en fase deploy), tags (se crean solas), contenido en MDXEditor.
2. **Guardar borrador** (DRAFT) o **Publicar** (PUBLISHED, fija `publishedAt`).
3. Editar en `/posts/[id]`; previsualiza la URL pública en la web (`/blog/[slug]`, incluye drafts solo en el CMS).
4. Borrar desde la lista (`DELETE`, confirma).

### 4.3 Comentarios

1. Los lectores comentan en `/blog/[slug]`: se publican automáticamente, sin moderación previa.
2. En `/comentarios` ves la lista completa; la única acción es **Eliminar**.

### 4.4 Ver estadísticas

`/` dashboard: totalPosts, published, drafts, totalViews, totalComments + gráfica de top 5 por vistas (recharts). Si la API está apagada, muestra ceros con aviso.

---

## 5. APIs con curl (referencia)

```bash
# Pública
curl http://localhost:4000/posts?limit=3
curl http://localhost:4000/posts/pensar-lateral-terminar-lo-que-empiezo
curl http://localhost:4000/tags
curl -X POST http://localhost:4000/posts/<slug>/comments \
  -H 'content-type: application/json' -d '{"content":"Hola","authorName":"Ana"}'

# CMS (necesita JWT: cópialo del localStorage tras login)
export JWT=<pega-cms_jwt>
curl -H "authorization: Bearer $JWT" http://localhost:4001/me
curl -H "authorization: Bearer $JWT" http://localhost:4001/stats
curl -H "authorization: Bearer $JWT" http://localhost:4001/comments
```

Hay más ejemplos en `apps/api-cms/curl.http`.

---

## 6. Verificación y calidad

```bash
# Todo a la vez (desde la raíz)
pnpm check-types && pnpm lint && npx turbo run test && pnpm build
```

Si `pnpm --filter X <script>` falla con `ERR_PNPM_IGNORED_BUILDS`, usa el binario directo dentro de la carpeta (mismo comando que el script):

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint . --max-warnings 0
./node_modules/.bin/vitest run        # solo APIs
./node_modules/.bin/next build        # solo web/cms
```

Estado esperado hoy: **44/44 tests** (12 api-public + 32 api-cms), 6 rutas web + 7 cms en verde, builds OK con API apagada.

---

## 7. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `prisma migrate` falla con pooler | Usaste `DATABASE_URL` en vez de `DIRECT_URL` | `prisma.config.ts` debe apuntar a `DIRECT_URL` |
| Login CMS 401 siempre | `BETTER_AUTH_URL` no coincide con la URL que llamas, o JWT viejo | Iguala `BETTER_AUTH_URL=http://localhost:4001` y re-loguea |
| CMS dice "No se pudo contactar con la API" | api-cms apagada o `NEXT_PUBLIC_CMS_API_URL` mal | Levanta `pnpm dev`; si la sesión caducó te redirige solo a `/login` |
| Me pide login cada poco | JWT corto | Ya está en `7d`; si vuelve a pasar, revisa `jwt({ jwt: { expirationTime } })` en `api-cms/src/auth.ts` |
| Web vacía con aviso | API apagada o `NEXT_PUBLIC_API_URL` mal | Arranca `api-public` o corrige `.env.local` y reinicia `web` |
| `?page=99` vacía | Página fuera de rango | Vuelve a `?page=1`; se clampéa el título pero pide la 99 (deuda M8) |
| MDXEditor rompe SSR | Import sin `ssr:false` | Usa `dynamic(() => import(...), {ssr:false})` (ya aplicado) |
| Warning `middleware deprecated` en cms | Next 16 prefiere `proxy` | Ignorar por ahora; migrar en M8 con `npx @next/codemod@canary middleware-to-proxy` |
| `pnpm install` pide `es5-ext` | Política de builds | Ya fijado a `false`; si reaparece, `pnpm install --ignore-scripts` |

---

## 8. Deploy (preparado, no ejecutar aún)

Por decisión del dueño, **no desplegar hasta cerrar el producto**. Cuando toque:

1. **Neon:** rama `prod`, copia `DATABASE_URL` (pooler) y `DIRECT_URL` (directa). `migrate deploy` contra `DIRECT_URL`.
2. **Render:** dos Web Services (`api-public`, `api-cms`, Node 24, `pnpm install && pnpm build` + `start`), env según §2.1 con URLs públicas + `CORS_ORIGIN=https://luishswe.com,https://cms.luishswe.com` + `BETTER_AUTH_SECRET` real + `BETTER_AUTH_URL=https://admin-api.luishswe.com`.
3. **Vercel:** dos proyectos (`web`, `cms`), env `NEXT_PUBLIC_API_URL=https://api.luishswe.com`, `NEXT_PUBLIC_CMS_API_URL=https://admin-api.luishswe.com`. Añadir **Vercel Blob** (Storage → Blob) y su `BLOB_READ_WRITE_TOKEN` para el futuro `POST /upload`.
   - **Ojo con las fuentes de Google:** las tres familias se cargan con `next/font/google`, que descarga en build. Si el build corre sin red, falla; el plan B documentado es `next/font/local` con los `.woff2` versionados (igual que se hacía antes con Geist).
   - El blog debe quedar como extensión del portafolio: enlaza `luishswe.com` desde el footer de `/` y `/sobre-mi` (ya está), y usa el mismo favicon si quieres coherenia de marca.
4. **Namecheap DNS:** `A @ → Vercel`, `CNAME cms → cname.vercel-dns.com`, `CNAME api` y `admin-api → <tu-servicio>.onrender.com`. Cookies `cookieDomain: ".luishswe.com"` (same-site).
5. **CI:** GitHub Actions `pnpm check-types + lint + test + build` en PR (M8).

---

*Última actualización: 2026-10-15. Decisiones vinculantes: sin deploy, Blob, single ADMIN, 3 seeds ejemplo, identidad visual compartida con About-Me sin animaciones decorativas.*
