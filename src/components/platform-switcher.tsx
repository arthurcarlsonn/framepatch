"use client";

import { usePlatform } from "@/components/platform-provider";
import { PLATFORMS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlatformSwitcher({ className }: { className?: string }) {
  const { platform, setPlatform } = usePlatform();

  return (
    <div
      role="tablist"
      aria-label="Console"
      className={cn(
        "bg-muted/70 ring-border/60 inline-flex items-center gap-0.5 rounded-lg p-0.5 ring-1 ring-inset",
        className,
      )}
    >
      {PLATFORMS.map((p) => {
        const active = p.id === platform;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={active}
            onClick={() => setPlatform(p.id)}
            className={cn(
              "focus-visible:ring-ring/60 rounded-[7px] px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.short}
          </button>
        );
      })}
    </div>
  );
}
