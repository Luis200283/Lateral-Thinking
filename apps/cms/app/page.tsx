"use client";

import { Button, Tag } from "@repo/ui/playground";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "../components/AuthGuard";
import { ActionButton, Alert, Kicker, Meta, PageHeader, Panel, StatCard } from "../components/ui";
import {
  clearToken,
  getApiStatus,
  getStats,
  type CmsStats,
} from "../lib/cms-api";

const TopPostsChart = dynamic(
  () => import("../components/TopPostsChart"),
  { ssr: false, loading: () => <Meta className="uppercase">Cargando gráfica…</Meta> },
);

function Dashboard() {
  const [stats, setStats] = useState<CmsStats | null>(null);
  const [offline, setOffline] = useState(false);
  const { baseUrl, configured } = getApiStatus();

  useEffect(() => {
    let cancelled = false;
    getStats().then((s) => {
      if (cancelled) return;
      if (s === null) {
        // Sin token (401) o API apagada: distinguir para el mensaje.
        // getStats devuelve null en ambos; si hay token asumimos API caída.
        setOffline(true);
      } else {
        setStats(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  return (
    <section className="grid gap-8">
      <PageHeader kicker="// PANEL" title="Dashboard">
        <Meta className="uppercase">
          api {baseUrl}{" "}
          <Tag tone={configured ? "mint" : "plain"} className="align-middle">
            {configured ? "env" : "fallback :4001"}
          </Tag>
        </Meta>
        <ActionButton variant="outline" size="sm" onClick={logout}>
          Salir
        </ActionButton>
      </PageHeader>

      {offline && !stats ? (
        <Alert tone="warn" role="alert">
          No se pudo contactar con la API ({baseUrl}). Comprueba que api-cms
          esté levantada en :4001. (Si tu sesión caducara, te habríamos
          redirigido a <Link href="/login" className="underline">iniciar sesión</Link>.)
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total posts" value={stats?.totalPosts ?? "—"} />
        <StatCard label="Publicados" value={stats?.published ?? "—"} />
        <StatCard label="Borradores" value={stats?.drafts ?? "—"} />
        <StatCard label="Vistas totales" value={stats?.totalViews ?? "—"} />
        <StatCard
          label="Comentarios"
          value={stats?.totalComments ?? "—"}
          accent
        />
      </div>

      <Panel className="p-5 sm:p-6">
        <Kicker>// TOP</Kicker>
        <h2 className="mt-1 font-display text-lg font-bold tracking-[-0.01em]">
          Top posts por vistas
        </h2>
        <div className="mt-4">
          {stats ? (
            <TopPostsChart posts={stats.topPosts} />
          ) : (
            <Meta className="uppercase">
              Sin datos (API apagada o sin sesión).
            </Meta>
          )}
        </div>
      </Panel>

      <nav className="flex flex-wrap gap-3">
        <Button href="/posts" variant="outline" size="sm">
          Ver posts
        </Button>
        <Button href="/comentarios" variant="outline" size="sm">
          Moderar comentarios
        </Button>
      </nav>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
