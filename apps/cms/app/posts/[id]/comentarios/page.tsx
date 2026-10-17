"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "../../../../components/AuthGuard";
import { CommentsList } from "../../../../components/CommentsList";
import {
  Meta,
  PageHeader,
  Panel,
  inlineActionClass,
} from "../../../../components/ui";
import { listPosts, type CmsPostItem } from "../../../../lib/cms-api";

function PostComments() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [post, setPost] = useState<CmsPostItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Mismo patrón que la edición: la API resuelve por slug, así que el :id de
  // la ruta se resuelve contra la lista (match por id o slug).
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
      setPost(found);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <section className="grid gap-6">
        <PageHeader kicker="// COMENTARIOS" title="Post no encontrado" />
        <Panel>
          <Meta>Sin detalle (API apagada o id inexistente).</Meta>
          <div className="mt-4">
            <Link href="/posts" className={inlineActionClass}>
              ← Volver a posts
            </Link>
          </div>
        </Panel>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="grid gap-6">
        <PageHeader kicker="// COMENTARIOS" title="Comentarios del post" />
        <Meta className="uppercase">Cargando post…</Meta>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader kicker="// COMENTARIOS" title="Comentarios del post">
        <Link href="/posts" className={inlineActionClass}>
          ← Volver a posts
        </Link>
        <Link href="/comentarios" className={inlineActionClass}>
          Ver todos los comentarios
        </Link>
      </PageHeader>

      <Meta className="-mt-4">
        <span className="text-ink">{post.title}</span> · /{post.slug}
      </Meta>

      <CommentsList postId={post.id} />
    </section>
  );
}

export default function PostCommentsPage() {
  return (
    <AuthGuard>
      <PostComments />
    </AuthGuard>
  );
}
