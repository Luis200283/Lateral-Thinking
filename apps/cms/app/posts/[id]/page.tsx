"use client";

import { Tag } from "@repo/ui/playground";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
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
} from "../../../lib/cms-api";

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

  function patch(next: Partial<PostFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  // La API resuelve GET por :slug y muta por :id. Esta página recibe el :id
  // estable: lo resolvemos a slug vía la lista y luego pedimos el detalle.
  useEffect(() => {
    let cancelled = false;
    async function load() {
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
      setPost(detail);
      setValues({
        title: detail.title,
        slug: detail.slug,
        excerpt: detail.excerpt ?? "",
        coverImage: detail.coverImage ?? "",
        tags: detail.tags?.map((t) => t.name).join(", ") ?? "",
      });
      setContent(detail.content);
      setStatus(detail.status);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
      const updated = await updatePost(post.id, {
        title: values.title.trim(),
        // Solo cambia la URL pública si el slug difiere del actual.
        slug:
          values.slug.trim() && values.slug.trim() !== post.slug
            ? values.slug.trim()
            : undefined,
        content,
        excerpt: values.excerpt.trim() || null,
        coverImage: values.coverImage.trim() || null,
        status: nextStatus,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setPost(updated);
      setStatus(updated.status);
      setValues((prev) => ({ ...prev, slug: updated.slug }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? `No se pudo guardar (${err.message}).` : "Error inesperado.");
    } finally {
      setSaving(false);
    }
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
      {/* Barra de documento: sticky bajo el SiteNav (h-16, ver app/layout.tsx). */}
      <div className="sticky top-16 z-30 -mx-6 border-b-[1.5px] border-ink bg-surface/95 backdrop-blur-md sm:-mx-10">
        <div className="flex h-16 items-center gap-3 overflow-x-auto px-6 sm:px-10">
          <Link href="/posts" className={`${inlineActionClass} shrink-0`}>
            ← Volver a posts
          </Link>

          <input
            aria-label="Título del post"
            value={values.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Título del post"
            className="min-w-[9rem] flex-1 bg-transparent font-display text-xl font-bold tracking-tight text-ink outline-none placeholder:text-muted/60 sm:text-2xl"
          />

          <Tag tone={status === "PUBLISHED" ? "mint" : "sun"} className="shrink-0">
            {status === "PUBLISHED" ? "Publicado" : "Borrador"}
          </Tag>

          <ActionButton
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setSettingsOpen(true)}
          >
            Configuración
          </ActionButton>

          <div className="flex shrink-0 overflow-hidden rounded-full border-[1.5px] border-ink">
            <button
              type="button"
              aria-pressed={!previewing}
              onClick={() => setPreviewing(false)}
              className={`px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] transition-colors ${
                previewing ? "bg-surface text-ink" : "bg-ink text-paper"
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              aria-pressed={previewing}
              onClick={() => setPreviewing(true)}
              className={`px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] transition-colors ${
                previewing ? "bg-ink text-paper" : "bg-surface text-ink"
              }`}
            >
              Vista previa
            </button>
          </div>

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
              Guardar y publicar
            </ActionButton>
          ) : null}
        </div>
      </div>

      <Meta className="mt-6">
        id estable <code>{post.id}</code> · slug público <code>/{post.slug}</code>
      </Meta>

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
