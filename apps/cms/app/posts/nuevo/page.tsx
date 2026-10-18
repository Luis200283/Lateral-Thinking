"use client";

import { Tag } from "@repo/ui/playground";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import {
  ArrowLeftIcon,
  EyeIcon,
  GearIcon,
  PencilIcon,
} from "../../../components/icons";
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
  const [toolsOpen, setToolsOpen] = useState(false);

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
      {/* Barra de documento a todo el ancho, sticky bajo el SiteNav (h-16,
          ver app/layout.tsx). En < lg se parte en dos filas compactas. */}
      <div className="cms-docbar sticky top-16 z-30 border-b-[1.5px] border-ink bg-surface/95 backdrop-blur-md">
        {/* Móvil/tablet: flecha, título y publicar. */}
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

          <Tag tone="sun" className="hidden shrink-0 sm:inline-flex">
            Borrador
          </Tag>

          <ActionButton
            size="sm"
            className="shrink-0"
            disabled={saving}
            onClick={() => void save("PUBLISHED")}
          >
            {saving ? "…" : "Publicar"}
          </ActionButton>
        </div>

        {/* Móvil/tablet: formato, ajustes, vista y guardar borrador. */}
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

            <ActionButton
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={saving}
              title="Guardar borrador"
              onClick={() => void save("DRAFT")}
            >
              Guardar borrador
            </ActionButton>
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

          <Tag tone="sun" className="shrink-0">
            Borrador
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
        <MdxEditorCard
          value={content}
          onChange={setContent}
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

export default function NewPostPage() {
  return (
    <AuthGuard>
      <NewPostForm />
    </AuthGuard>
  );
}
