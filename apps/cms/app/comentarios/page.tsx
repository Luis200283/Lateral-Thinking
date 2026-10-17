"use client";

import AuthGuard from "../../components/AuthGuard";
import { CommentsList } from "../../components/CommentsList";
import { Meta, PageHeader } from "../../components/ui";

export default function ComentariosPage() {
  return (
    <AuthGuard>
      <section className="grid gap-6">
        <PageHeader kicker="// COMENTARIOS" title="Comentarios" />

        <Meta className="-mt-5">
          Se publican automáticamente en el blog. Aquí solo puedes eliminarlos.
        </Meta>

        <CommentsList />
      </section>
    </AuthGuard>
  );
}
