"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import { MdxEditorCard } from "../../../components/MdxEditorCard";
import { PostFields, type PostFormValues } from "../../../components/PostFields";
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
    <section className="grid gap-6">
      <PageHeader kicker="// EDITAR" title="Editar post">
        <Link href="/posts" className={inlineActionClass}>
          ← Volver a posts
        </Link>
      </PageHeader>

      <Meta className="-mt-4">
        id estable <code>{post.id}</code> · slug público <code>/{post.slug}</code>
      </Meta>

      <Panel className="grid gap-5">
        <PostFields values={values} onChange={patch} />
      </Panel>

      <MdxEditorCard
        value={content}
        onChange={setContent}
        ready={Boolean(content)}
      />

      {error ? (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      ) : null}
      {saved ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-mint-ink">
          Guardado.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <ActionButton
          variant="outline"
          disabled={saving}
          onClick={() => void save(status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")}
        >
          {saving ? "Guardando…" : "Guardar"}
        </ActionButton>
        {status !== "PUBLISHED" ? (
          <ActionButton disabled={saving} onClick={() => void save("PUBLISHED")}>
            Guardar y publicar
          </ActionButton>
        ) : null}
      </div>
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
