"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopPost } from "../lib/cms-api";

/**
 * Paleta del gráfico: coral/sun/violet/mint vía variables CSS de los tokens
 * Playground (nada de hex sueltos), así que sigue al tema claro/oscuro.
 */
const BAR_COLORS = [
  "var(--color-coral)",
  "var(--color-sun)",
  "var(--color-violet)",
  "var(--color-mint)",
] as const;

/** Tope de caracteres en el eje; el título completo se reserva al tooltip. */
const MAX_LABEL = 28;

const AXIS_TICK = {
  fill: "var(--color-muted)",
  fontSize: 12.5,
} as const;

/**
 * Recorta por palabras para no partir una palabra a la mitad. Si el último
 * hueco deja muy poco texto, corta directamente en el tope.
 */
function truncateLabel(title: string) {
  if (title.length <= MAX_LABEL) return title;
  const cut = title.slice(0, MAX_LABEL);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > MAX_LABEL / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

type TooltipEntry = {
  payload?: { title?: string; views?: number };
};

/**
 * Tooltip propio con tokens del Playground. El de recharts usaba colores
 * fijos de texto y en modo oscuro quedaba ilegible; este respeta ambos temas.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum?.title || datum.views === undefined) return null;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-ink)",
        borderRadius: 10,
        boxShadow: "3px 3px 0 var(--color-ink)",
        color: "var(--color-ink)",
        maxWidth: 280,
        padding: "0.45rem 0.65rem",
      }}
    >
      <p
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          lineHeight: 1.35,
          overflowWrap: "break-word",
        }}
      >
        {datum.title}
      </p>
      <p
        style={{
          color: "var(--color-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          marginTop: 2,
        }}
      >
        <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>
          {datum.views.toLocaleString("es-ES")}
        </span>{" "}
        vistas
      </p>
    </div>
  );
}

export default function TopPostsChart({ posts }: { posts: TopPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
        Sin datos de top posts todavía.
      </p>
    );
  }

  // `title` viaja sin recortar para que el tooltip muestre el nombre completo.
  const data = posts.map((p) => ({
    id: p.id,
    name: truncateLabel(p.title),
    title: p.title,
    views: p.views,
  }));

  return (
    <div
      className="w-full"
      style={{ height: Math.max(220, posts.length * 56) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          barCategoryGap="16%"
        >
          <XAxis
            type="number"
            domain={[0, "auto"]}
            allowDecimals={false}
            axisLine={{ stroke: "var(--color-line)" }}
            tickLine={false}
            tick={AXIS_TICK}
          />
          <YAxis
            type="category"
            dataKey="name"
            width="auto"
            interval={0}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={{ fill: "var(--color-line)" }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="views" maxBarSize={24} radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
