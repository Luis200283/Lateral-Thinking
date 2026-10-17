"use client";

import { Tag } from "@repo/ui/playground";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import { MarkdownPreview } from "../../../components/MarkdownPreview";
import { MdxEditorCard } from "../../../components/MdxEditorCard";
import { PostSettingsModal } from "../../../components/PostSettingsModal";
import { type PostFormValues } from "../../../components/PostFields";
import { ActionButton, Alert, inlineActionClass } from "../../../components/ui";
import { ApiError, createPost, type CmsPostStatus } from "../../../lib/cms-api";

/**
 * Pantalla de edición tipo documento: barra superior sticky (volver, título,
 * estado, configuración, vista previa y guardado) y una hoja grande solo para
 * escribir. Los campos del post viven en PostSettingsModal.
 */
function NewPostForm() {
  const router = useRouter();
  const [values, setValues] = useState<PostFormValues>({
    title: "",
    slug: "",
    excerpt: "",
    coverImage: "",
    tags: "",
  });
  const [content, setContent] = useState("# Nuevo post\n\nEscribe aquí…");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  function patch(next: Partial<PostFormValues>) {
    setValues((prev) => ({ ...prev, ...next }));
  }

  async function save(status: CmsPostStatus) {
    setError(null);
    if (!values.title.trim() || !content.trim()) {
      setError("Título y contenido son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await createPost({
        title: values.title.trim(),
        slug: values.slug.trim() || undefined,
        content,
        excerpt: values.excerpt.trim() || undefined,
        coverImage: values.coverImage.trim() || undefined,
        status,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      router.replace("/posts");
    } catch (err) {
      setError(err instanceof ApiError ? `No se pudo guardar (${err.message}).` : "Error inesperado.");
    } finally {
      setSaving(false);
    }
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

          <Tag tone="sun" className="shrink-0">
            Borrador
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
            onClick={() => void save("DRAFT")}
          >
            {saving ? "Guardando…" : "Guardar borrador"}
          </ActionButton>
          <ActionButton
            size="sm"
            className="shrink-0"
            disabled={saving}
            onClick={() => void save("PUBLISHED")}
          >
            Publicar
          </ActionButton>
        </div>
      </div>

      {error ? (
        <Alert tone="error" role="alert" className="mt-6">
          {error}
        </Alert>
      ) : null}

      {previewing ? (
        <MarkdownPreview
          title={values.title}
          excerpt={values.excerpt}
          coverImage={values.coverImage}
          content={content}
        />
      ) : (
        <MdxEditorCard value={content} onChange={setContent} />
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

export default function NewPostPage() {
  return (
    <AuthGuard>
      <NewPostForm />
    </AuthGuard>
  );
}
