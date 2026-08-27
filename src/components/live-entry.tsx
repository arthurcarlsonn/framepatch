import { ExternalLinkIcon } from "lucide-react";

import { LIVE_STATUS_LABEL, type LiveSource, type LiveStatus } from "@/lib/live";
import { cn } from "@/lib/utils";

/**
 * How settled a Live claim is. Deliberately loud: the difference between "official" and
 * "reported" is the only thing standing between this feed and a rumour mill, so it is never
 * rendered as small grey text next to something more eye-catching.
 */
const STATUS_CLASS: Record<LiveStatus, string> = {
  official: "text-fps-good bg-fps-good-soft ring-fps-good/25",
  measured: "text-fps-high bg-fps-high-soft ring-fps-high/25",
  reported: "text-fps-mid bg-fps-mid-soft ring-fps-mid/25",
  disputed: "text-fps-low bg-fps-low-soft ring-fps-low/20",
};

export function StatusPill({ status, className }: { status: LiveStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_CLASS[status],
        className,
      )}
    >
      {LIVE_STATUS_LABEL[status]}
    </span>
  );
}

/** Sources behind a Live entry, strongest tier first. */
export function LiveSources({ sources }: { sources: LiveSource[] }) {
  return (
    <ul className="space-y-2">
      {[...sources]
        .sort((a, b) => a.tier - b.tier)
        .map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 flex items-start gap-3 rounded-lg border p-3.5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="group-hover:text-primary text-sm font-medium transition-colors">
                  {source.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">{source.role}</p>
              </div>
              <ExternalLinkIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
            </a>
          </li>
        ))}
    </ul>
  );
}
