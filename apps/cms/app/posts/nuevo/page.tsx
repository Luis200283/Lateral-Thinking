"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import { MdxEditorCard } from "../../../components/MdxEditorCard";
import { PostFields, type PostFormValues } from "../../../components/PostFields";
import { ActionButton, Alert, PageHeader, Panel, inlineActionClass } from "../../../components/ui";
import { ApiError, createPost, type CmsPostStatus } from "../../../lib/cms-api";

const backLink = (
  <Link href="/posts" className={inlineActionClass}>
    ← Volver a posts
  </Link>
);

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
    <section className="grid gap-6">
      <PageHeader kicker="// NUEVO" title="Nuevo post">
        {backLink}
      </PageHeader>

      <Panel className="grid gap-5">
        <PostFields values={values} onChange={patch} />
      </Panel>

      <MdxEditorCard value={content} onChange={setContent} />

      {error ? (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <ActionButton
          variant="outline"
          disabled={saving}
          onClick={() => void save("DRAFT")}
        >
          {saving ? "Guardando…" : "Guardar borrador"}
        </ActionButton>
        <ActionButton disabled={saving} onClick={() => void save("PUBLISHED")}>
          Publicar
        </ActionButton>
      </div>
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
