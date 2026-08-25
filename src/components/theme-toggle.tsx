"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** The theme is only knowable after hydration; this snapshot flips false → true on mount. */
const subscribeToNothing = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  // Before mount the resolved theme is unknown, so render a neutral, label-free
  // button — anything theme-derived here would mismatch during hydration.
  const isDark = mounted && resolvedTheme === "dark";
  const next = isDark ? "Light mode" : "Dark mode";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-muted-foreground hover:text-foreground"
          aria-label={mounted ? `Switch to ${next.toLowerCase()}` : "Toggle theme"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {mounted ? (
            isDark ? (
              <SunIcon className="size-4.5" />
            ) : (
              <MoonIcon className="size-4.5" />
            )
          ) : (
            <span className="size-4.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{next}</TooltipContent>
    </Tooltip>
  );
}
