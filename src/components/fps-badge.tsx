import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type FpsTier = "high" | "good" | "mid" | "low" | "unknown";

/** `0` FPS means FrameCheck has no verified figure for this title yet. */
export function fpsTier(fps: number): FpsTier {
  if (fps === 0) return "unknown";
  if (fps >= 120) return "high";
  if (fps >= 60) return "good";
  if (fps >= 40) return "mid";
  return "low";
}

export function fpsLabel(fps: number) {
  if (fps === 0) return "Unverified";
  return fps <= 30 ? "30 FPS Only" : `${fps} FPS`;
}

const TIER_CLASS: Record<FpsTier, string> = {
  high: "text-fps-high bg-fps-high-soft ring-fps-high/25",
  good: "text-fps-good bg-fps-good-soft ring-fps-good/25",
  mid: "text-fps-mid bg-fps-mid-soft ring-fps-mid/25",
  low: "text-fps-low bg-fps-low-soft ring-fps-low/20",
  unknown: "text-muted-foreground bg-transparent ring-border",
};

export function FpsBadge({
  fps,
  className,
  size = "sm",
  check = false,
  label,
}: {
  fps: number;
  className?: string;
  size?: "xs" | "sm" | "md";
  check?: boolean;
  label?: string;
}) {
  const tier = fpsTier(fps);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium ring-1 ring-inset tabular-nums",
        size === "xs" && "px-1.5 py-0.5 text-[11px]",
        size === "sm" && "px-2 py-1 text-xs",
        size === "md" && "px-2.5 py-1.5 text-sm",
        TIER_CLASS[tier],
        className,
      )}
    >
      {check && (tier === "good" || tier === "high" || tier === "mid") ? (
        <CheckIcon className="size-3.5" strokeWidth={2.5} />
      ) : null}
      {label ?? fpsLabel(fps)}
    </span>
  );
}
