import { cn } from "./cn";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "solid" | "ghost" | "outline";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold " +
  "tracking-tight transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] " +
  "hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  solid: "ink-border hard-shadow bg-coral text-on-accent hover:shadow-[5px_5px_0]",
  ghost: "text-ink underline decoration-ink/40 decoration-2 underline-offset-4 hover:decoration-ink",
  outline: "ink-border hard-shadow bg-surface text-ink",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-[0.9375rem]",
  lg: "px-6 py-3 text-base",
} as const;

export type ButtonProps = ComponentPropsWithoutRef<"a"> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  /** Renders <a> by default (link-driven). Pass `as="button"` for a real button. */
  as?: "a" | "button";
};

/** Playground pill button: solid by default (coral fill, hard shadow). */
export function Button({
  variant = "solid",
  size = "md",
  as = "a",
  className,
  ...props
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  if (as === "button") {
    // `type` defaults to "button": an action button that lands inside a
    // <form> must not submit it. Pass type="submit" explicitly to opt in.
    return (
      <button
        type="button"
        className={classes}
        {...(props as ComponentPropsWithoutRef<"button">)}
      />
    );
  }
  return <a className={classes} {...(props as ComponentPropsWithoutRef<"a">)} />;
}
