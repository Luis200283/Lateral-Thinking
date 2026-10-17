import { cn } from "./cn";
import type { ReactNode } from "react";

export type SectionHeadingProps = {
  kicker: string;
  /** Placed on the <h2> so sections can use aria-labelledby. */
  id?: string;
  children: ReactNode;
  className?: string;
};

/** Mono kicker + display heading. Used by every section for consistent rhythm. */
export function SectionHeading({
  kicker,
  id,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <header className={cn("max-w-3xl", className)}>
      <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted">
        {kicker}
      </p>
      <h2
        id={id}
        className="text-balance font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]"
      >
        {children}
      </h2>
    </header>
  );
}
