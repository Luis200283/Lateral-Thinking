"use client";

import { Tag } from "@repo/ui/playground";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import {
  ArrowLeftIcon,
  EyeIcon,
  GearIcon,
  PencilIcon,
} from "../../../components/icons";
import { LocalDraftBanner } from "../../../components/LocalDraftBanner";
import { MarkdownPreview } from "../../../components/MarkdownPreview";
import { MdxEditorCard } from "../../../components/MdxEditorCard";
import { PostSettingsModal } from "../../../components/PostSettingsModal";
import { type PostFormValues } from "../../../components/PostFields";
import {
  ActionButton,
  Alert,
  Meta,
  PageHeader,
  Panel,
  inlineActionClass,
} from "../../../components/ui";
import {
  ApiError,
  getPostBySlug,
  listPosts,
  updatePost,
  type CmsPostDetail,
  type CmsPostStatus,
  type UpdatePostInput,
} from "../../../lib/cms-api";
import {
  clearLocalDraft,
  readLocalDraft,
  useAutosave,
  type LocalDraft,
} from "../../../lib/use-autosave";

/** Estado completo del documento: lo que respalda y sincroniza el autoguardado. */
interface DraftPayload {
  values: PostFormValues;
  content: string;
  status: CmsPostStatus;
}

/** Payload del PATCH, compartido por el guardado manual y el automático. */
function buildUpdateInput(
  payload: DraftPayload,
  currentSlug: string,
): UpdatePostInput {
  const slug = payload.values.slug.trim();
  return {
    title: payload.values.title.trim(),
    // Solo cambia la URL pública si el slug difiere del actual.
    slug: slug && slug !== currentSlug ? slug : undefined,
    content: payload.content,
    excerpt: payload.values.excerpt.trim() || null,
    coverImage: payload.values.coverImage.trim() || null,
    status: payload.status,
    tags: payload.values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

function payloadFromDetail(detail: CmsPostDetail): DraftPayload {
  return {
    values: {
      title: detail.title,
      slug: detail.slug,
      excerpt: detail.excerpt ?? "",
      coverImage: detail.coverImage ?? "",
      tags: detail.tags?.map((t) => t.name).join(", ") ?? "",
    },
    content: detail.content,
    status: detail.status,
  };
}

/**
 * Edición de un post existente, con la misma estructura de documento que
 * /posts/nuevo: barra superior sticky + hoja grande + configuración en modal.
 */
function EditPostForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [post, setPost] = useState<CmsPostDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<PostFormValues>({
    title: "",
    slug: "",
    excerpt: "",
    coverImage: "",
    tags: "",
  });
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<CmsPostStatus>("DRAFT");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [recovery, setRecovery] = useState<LocalDraft<DraftPayload> | null>(null);

  function patch(next: Partial<PostFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  // La API resuelve GET por :slug y muta por :id. Esta página recibe el :id
  // estable: lo resolvemos a slug vía la lista y luego pedimos el detalle.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Al cambiar de post (navegación entre clientes) se vuelve a "cargando":
      // así el autoguardado jamás compara contra valores del post anterior.
      setPost(null);
      setRecovery(null);

      const list = await listPosts();
      if (cancelled) return;
      if (list === null) {
        setNotFound(true);
        return;
      }
      const found = list.items.find((p) => p.id === id || p.slug === id);
      if (!found) {
        setNotFound(true);
        return;
      }
      const detail = await getPostBySlug(found.slug);
      if (cancelled) return;
      if (!detail) {
        setNotFound(true);
        return;
      }

      const loaded = payloadFromDetail(detail);
      setPost(detail);
      setValues(loaded.values);
      setContent(loaded.content);
      setStatus(loaded.status);

      // Respaldo local del autoguardado: si quedó una copia distinta de lo
      // que hay en el servidor, se ofrece recuperarla; si es idéntica (el
      // servidor ya la tiene) se limpia en silencio.
      const backup = readLocalDraft<DraftPayload>(detail.id);
      if (backup) {
        const identical =
          JSON.stringify(backup.payload) === JSON.stringify(loaded);
        if (identical) {
          clearLocalDraft(detail.id);
        } else {
          setRecovery(backup);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const autosave = useAutosave<DraftPayload>({
    storageKey: post?.id ?? "pending",
    ready: Boolean(post),
    snapshot: () => ({ values, content, status }),
    // Solo los borradores se sincronizan solos: un post publicado no debe
    // cambiar en el blog sin que el autor pulse Guardar.
    serverSave:
      post && post.status === "DRAFT"
        ? async (payload) => {
            await updatePost(post.id, buildUpdateInput(payload, post.slug));
          }
        : undefined,
    canServerSave: () => Boolean(values.title.trim() && content.trim()),
  });

  async function save(nextStatus: CmsPostStatus) {
    if (!post) return;
    setError(null);
    setSaved(false);
    if (!values.title.trim() || !content.trim()) {
      setError("Título y contenido son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const payload: DraftPayload = { values, content, status: nextStatus };
      const updated = await updatePost(post.id, buildUpdateInput(payload, post.slug));
      setPost(updated);
      setStatus(updated.status);
      setValues((prev) => ({ ...prev, slug: updated.slug }));
      setSaved(true);
      // El servidor ya tiene estos cambios: se limpia el respaldo local.
      autosave.markSaved({
        ...payload,
        values: { ...payload.values, slug: updated.slug },
      });
      setRecovery(null);
    } catch (err) {
      setError(err instanceof ApiError ? `No se pudo guardar (${err.message}).` : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function recoverDraft() {
    if (!recovery) return;
    setValues(recovery.payload.values);
    setContent(recovery.payload.content);
    setStatus(recovery.payload.status);
    setRecovery(null);
  }

  function discardDraft() {
    if (!post) return;
    clearLocalDraft(post.id);
    setRecovery(null);
  }

  if (notFound) {
    return (
      <section className="grid gap-6">
        <PageHeader kicker="// POSTS" title="Post no encontrado" />
        <Panel>
          <Meta>
            Sin detalle (API apagada o id inexistente).
          </Meta>
          <div className="mt-4">
            <ActionButton variant="outline" size="sm" onClick={() => router.replace("/posts")}>
              Volver a posts
            </ActionButton>
          </div>
        </Panel>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="grid gap-6">
        <PageHeader kicker="// POSTS" title="Editar post" />
        <Meta className="uppercase">Cargando post…</Meta>
      </section>
    );
  }

  return (
    <section>
      {/* Barra de documento a todo el ancho, sticky bajo el SiteNav (h-16,
          ver app/layout.tsx). En < lg se parte en dos filas compactas. */}
      <div className="cms-docbar sticky top-16 z-30 border-b-[1.5px] border-ink bg-surface/95 backdrop-blur-md">
        {/* Móvil/tablet: flecha, título y guardar. */}
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:hidden">
          <Link
            href="/posts"
            aria-label="Volver a posts"
            title="Volver a posts"
            className="grid size-9 shrink-0 place-items-center rounded-chip border-[1.5px] border-ink bg-surface text-ink shadow-[2px_2px_0_var(--color-ink)]"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>

          <input
            aria-label="Título del post"
            value={values.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Título del post"
            className="min-w-0 flex-1 bg-transparent font-display text-lg font-bold tracking-tight text-ink outline-none placeholder:text-muted/60"
          />

          <Tag
            tone={status === "PUBLISHED" ? "mint" : "sun"}
            className="hidden shrink-0 sm:inline-flex"
          >
            {status === "PUBLISHED" ? "Publicado" : "Borrador"}
          </Tag>

          <ActionButton
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={saving}
            onClick={() => void save(status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")}
          >
            {saving ? "…" : "Guardar"}
          </ActionButton>
        </div>

        {/* Móvil/tablet: formato, ajustes, vista y publicar. */}
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-2 border-t border-line px-3 sm:px-6 lg:hidden">
          <div className="flex items-center gap-2">
            {!previewing ? (
              <button
                type="button"
                aria-expanded={toolsOpen}
                title="Herramientas de formato"
                onClick={() => setToolsOpen((open) => !open)}
                className={`grid size-9 place-items-center rounded-chip border-[1.5px] border-ink transition-colors ${
                  toolsOpen ? "bg-ink text-paper" : "bg-surface text-ink"
                }`}
              >
                <span className="font-display text-sm font-bold leading-none">Aa</span>
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Configuración del post"
              title="Configuración"
              onClick={() => setSettingsOpen(true)}
              className="grid size-9 place-items-center rounded-chip border-[1.5px] border-ink bg-surface text-ink transition-colors hover:bg-paper"
            >
              <GearIcon className="size-4" />
            </button>
          </div>


          <div className="flex items-center gap-2">
            <div className="flex shrink-0 overflow-hidden rounded-full border-[1.5px] border-ink">
              <button
                type="button"
                aria-pressed={!previewing}
                aria-label="Editar"
                title="Editar"
                onClick={() => {
                  setPreviewing(false);
                  setToolsOpen(false);
                }}
                className={`grid size-8 place-items-center transition-colors ${
                  previewing ? "bg-surface text-ink" : "bg-ink text-paper"
                }`}
              >
                <PencilIcon className="size-4" />
              </button>
              <button
                type="button"
                aria-pressed={previewing}
                aria-label="Vista previa"
                title="Vista previa"
                onClick={() => {
                  setPreviewing(true);
                  setToolsOpen(false);
                }}
                className={`grid size-8 place-items-center transition-colors ${
                  previewing ? "bg-ink text-paper" : "bg-surface text-ink"
                }`}
              >
                <EyeIcon className="size-4" />
              </button>
            </div>

            {status !== "PUBLISHED" ? (
              <ActionButton
                size="sm"
                className="shrink-0"
                disabled={saving}
                title="Guardar y publicar"
                onClick={() => void save("PUBLISHED")}
              >
                Publicar
              </ActionButton>
            ) : (
              <ActionButton
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={saving}
                title="Pasar a borrador (se oculta del blog)"
                onClick={() => void save("DRAFT")}
              >
                Despublicar
              </ActionButton>
            )}
          </div>
        </div>

        {/* Escritorio (lg+). */}
        <div className="mx-auto hidden h-16 max-w-6xl items-center gap-2 px-6 sm:px-10 lg:flex">
          <Link
            href="/posts"
            className={`${inlineActionClass} shrink-0 whitespace-nowrap`}
          >
            ← Volver a posts
          </Link>

          <input
            aria-label="Título del post"
            value={values.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Título del post"
            className="min-w-[9rem] flex-1 bg-transparent font-display text-xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/60 sm:text-2xl lg:text-xl xl:text-2xl"
          />

          <Tag tone={status === "PUBLISHED" ? "mint" : "sun"} className="shrink-0">
            {status === "PUBLISHED" ? "Publicado" : "Borrador"}
          </Tag>


          {/* Entre lg y xl el botón va como icono para que la fila no apriete. */}
          <ActionButton
            variant="outline"
            size="sm"
            className="hidden shrink-0 xl:inline-flex"
            onClick={() => setSettingsOpen(true)}
          >
            Configuración
          </ActionButton>
          <button
            type="button"
            aria-label="Configuración del post"
            title="Configuración"
            onClick={() => setSettingsOpen(true)}
            className="hidden size-8 shrink-0 place-items-center rounded-chip border-[1.5px] border-ink bg-surface text-ink transition-colors hover:bg-paper lg:grid xl:hidden"
          >
            <GearIcon className="size-4" />
          </button>

          <div className="flex shrink-0 overflow-hidden rounded-full border-[1.5px] border-ink">
            <button
              type="button"
              aria-pressed={!previewing}
              onClick={() => {
                setPreviewing(false);
                setToolsOpen(false);
              }}
              className={`px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] transition-colors ${
                previewing ? "bg-surface text-ink" : "bg-ink text-paper"
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              aria-pressed={previewing}
              onClick={() => {
                setPreviewing(true);
                setToolsOpen(false);
              }}
              className={`px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] transition-colors ${
                previewing ? "bg-ink text-paper" : "bg-surface text-ink"
              }`}
            >
              Vista previa
            </button>
          </div>

          {status === "PUBLISHED" ? (
            <ActionButton
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={saving}
              title="Pasar a borrador (se oculta del blog)"
              onClick={() => void save("DRAFT")}
            >
              Despublicar
            </ActionButton>
          ) : null}

          <ActionButton
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={saving}
            onClick={() => void save(status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")}
          >
            {saving ? "Guardando…" : "Guardar"}
          </ActionButton>
          {status !== "PUBLISHED" ? (
            <ActionButton
              size="sm"
              className="shrink-0"
              disabled={saving}
              onClick={() => void save("PUBLISHED")}
            >
              <span className="xl:hidden">Publicar</span>
              <span className="hidden xl:inline">Guardar y publicar</span>
            </ActionButton>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert tone="error" role="alert" className="mt-6">
          {error}
        </Alert>
      ) : null}
      {saved ? (
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-mint-ink">
          Guardado.
        </p>
      ) : null}

      {recovery ? (
        <LocalDraftBanner
          savedAt={recovery.savedAt}
          onRecover={recoverDraft}
          onDiscard={discardDraft}
        />
      ) : null}

      {previewing ? (
        <MarkdownPreview
          title={values.title}
          excerpt={values.excerpt}
          coverImage={values.coverImage}
          content={content}
        />
      ) : (
        <MdxEditorCard
          value={content}
          onChange={setContent}
          ready={Boolean(content)}
          toolbarOpen={toolsOpen}
        />
      )}

      <PostSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        values={values}
        onChange={patch}
      />
    </section>
  );
}

export default function EditPostPage() {
  return (
    <AuthGuard>
      <EditPostForm />
    </AuthGuard>
  );
}
