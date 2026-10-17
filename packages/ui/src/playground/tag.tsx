import { cn } from "./cn";
import type { HTMLAttributes } from "react";

type Tone = "sun" | "coral" | "violet" | "mint" | "plain";

const tones: Record<Tone, string> = {
  sun: "bg-sun text-on-accent",
  coral: "bg-coral text-on-accent",
  violet: "bg-violet text-on-accent",
  mint: "bg-mint text-on-accent",
  plain: "bg-surface text-ink",
};

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

/** Terminal-first chip: ink border, mono uppercase, coloured fill. */
export function Tag({ className, tone = "sun", ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip border-[1.5px] border-ink px-2.5 py-1",
        "font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
