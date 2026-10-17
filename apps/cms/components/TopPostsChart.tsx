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

const AXIS = {
  stroke: "var(--color-line)",
  tick: { fill: "var(--color-muted)", fontSize: 11 },
} as const;

const TOOLTIP_STYLE = {
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-ink)",
  borderRadius: 10,
  boxShadow: "3px 3px 0 var(--color-ink)",
  color: "var(--color-ink)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
} as const;

export default function TopPostsChart({ posts }: { posts: TopPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
        Sin datos de top posts todavía.
      </p>
    );
  }
  const data = posts.map((p) => ({
    name: p.title.length > 24 ? `${p.title.slice(0, 24)}…` : p.title,
    views: p.views,
  }));
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="name"
            interval={0}
            angle={-18}
            dy={10}
            stroke={AXIS.stroke}
            tick={AXIS.tick}
          />
          <YAxis
            allowDecimals={false}
            stroke={AXIS.stroke}
            tick={AXIS.tick}
          />
          <Tooltip
            cursor={{ fill: "var(--color-line)" }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Bar dataKey="views" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
