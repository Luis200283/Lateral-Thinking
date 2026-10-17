"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "./cn";

/**
 * Reads the theme from the DOM attribute that next-themes manages.
 * Using an external store (not React state in an effect) keeps hydration
 * clean and avoids cascading renders.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.dataset.theme ?? "system";
}

function getServerSnapshot() {
  return "system";
}

/** Playground hard-shadow pill switch. Native button → full keyboard support. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Activate light mode" : "Activate dark mode"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex h-7 w-12 items-center rounded-full border-[1.5px] border-ink bg-ink shadow-[3px_3px_0_var(--color-ink)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] h-4 w-4 rounded-full transition-all duration-200 ease-[cubic-bezier(.22,1,.36,1)]",
          isDark ? "left-[3px] bg-sun" : "right-[3px] bg-violet",
        )}
      />
    </button>
  );
}
