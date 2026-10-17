import { Button, cn, type ButtonProps } from "@repo/ui/playground";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Capa de UI del CMS sobre la fundación `@repo/ui/playground`.
 *
 * Misma identidad que la web pública y el portafolio — tokens de
 * packages/ui/src/playground/theme.css (papel/tinta, coral/sun/violet/mint,
 * bordes 1.5px, sombras duras, kickers mono) — pero sin nada decorativo:
 * aquí solo hay contenedores, controles y estados. Paleta y tipografía
 * compartidas; cero animaciones añadidas.
 */

/* ------------------------------------------------------------------ panel -- */

/** Tarjeta: borde tinta 1.5px + sombra dura 3px (lenguaje Playground). */
export function Panel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border-[1.5px] border-ink bg-surface p-5 shadow-[3px_3px_0_var(--color-ink)]",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------- tipografía -- */

/** Kicker mono uppercase: marca de pantalla o de bloque dentro de tarjeta. */
export function Kicker({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted",
        className,
      )}
      {...props}
    />
  );
}

/** Línea meta en mono: ids, slugs, fechas, contadores, avisos. */
export function Meta({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn("font-mono text-xs leading-relaxed text-muted", className)}
      {...props}
    />
  );
}

export function PageHeader({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  /** Acciones de la pantalla (botones), alineadas a la derecha. */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-2 font-display text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.1] tracking-[-0.02em]">
          {title}
        </h1>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ campos -- */

/** Etiqueta + control (+ pista opcional). Envuelve el input: asociación implícita. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="font-mono text-[0.6875rem] leading-relaxed text-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-chip border-[1.5px] border-ink bg-surface px-3 py-2 text-[0.9375rem] text-ink placeholder:text-muted";

export function TextInput({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}

/* --------------------------------------------------------------- avisos -- */

const alertTones = {
  error: "border-coral-ink bg-surface text-coral-ink",
  warn: "border-ink bg-sun text-on-accent",
  info: "border-ink bg-surface text-ink",
} as const;

/** Error/alerta legible sobre paper: `error` usa coral-ink (AA verificado). */
export function Alert({
  tone = "error",
  className,
  ...props
}: ComponentPropsWithoutRef<"p"> & { tone?: keyof typeof alertTones }) {
  return (
    <p
      className={cn(
        "rounded-chip border-[1.5px] px-4 py-3 text-sm",
        alertTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ stats -- */

export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  /** Relleno sun + texto on-accent (resaltada, p. ej. comentarios pendientes). */
  accent?: boolean;
}) {
  return (
    <Panel className={cn("p-4", accent && "bg-sun text-on-accent")}>
      <p className="font-display text-[2rem] font-bold leading-none tracking-[-0.02em]">
        {value}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em]",
          !accent && "text-muted",
        )}
      >
        {label}
      </p>
    </Panel>
  );
}

/* --------------------------------------------------------------- acciones -- */

type ActionVariant = NonNullable<ButtonProps["variant"]>;
type ActionSize = NonNullable<ButtonProps["size"]>;

export type ActionButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className"> & {
  variant?: ActionVariant;
  size?: ActionSize;
  className?: string;
};

/**
 * Botón real (submit/disabled) sobre el `Button` de @repo/ui/playground.
 * Ese contrato está tipado para `<a>` porque es link-driven, así que las
 * props nativas de `<button>` se re-tipan aquí: un único sitio con el cast,
 * y el lenguaje visual sigue saliendo del componente compartido.
 */
export function ActionButton({
  variant,
  size,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      as="button"
      variant={variant}
      size={size}
      className={className}
      {...(props as unknown as ComponentPropsWithoutRef<"a">)}
    />
  );
}

/** Acción en línea para filas densas (tablas/colillas): mismo lenguaje ghost. */
export const inlineActionClass =
  "font-mono text-xs uppercase tracking-[0.1em] text-ink underline decoration-ink/40 decoration-2 underline-offset-4 transition-colors hover:decoration-ink";

/** Acción destructiva: rojo legible sobre paper (coral-ink), también en oscuro. */
export const dangerActionClass =
  "text-coral-ink decoration-coral-ink/60 hover:decoration-coral-ink";
