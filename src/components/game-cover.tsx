import Image from "next/image";

import { imageUrl } from "@/lib/games";
import type { Game } from "@/lib/types";
import { cn } from "@/lib/utils";

type Size = "thumb" | "card" | "hero";

const SRC_SIZE = {
  thumb: "t_cover_small",
  card: "t_cover_big",
  hero: "t_720p",
} as const;

const SIZES = {
  thumb: "48px",
  card: "(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw",
  hero: "(min-width: 1024px) 300px, 100vw",
} as const;

/** Stable fallback tint for the handful of titles IGDB has no cover for. */
function tintOf(slug: string) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function GameCover({
  game,
  size = "card",
  className,
  priority,
}: {
  game: Pick<Game, "slug" | "title" | "cover">;
  size?: Size;
  className?: string;
  priority?: boolean;
}) {
  if (!game.cover) {
    return (
      <div
        className={cn("relative isolate flex items-end overflow-hidden p-2", className)}
        style={{ backgroundColor: `oklch(0.5 0.15 ${tintOf(game.slug)})` }}
        role="img"
        aria-label={`${game.title} — no cover art`}
      >
        {size !== "thumb" ? (
          <span className="font-heading line-clamp-3 text-xs font-semibold tracking-[0.1em] text-white uppercase">
            {game.title}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("bg-muted relative isolate overflow-hidden", className)}>
      <Image
        src={imageUrl(game.cover.imageId, SRC_SIZE[size])}
        alt={`${game.title} cover art`}
        fill
        sizes={SIZES[size]}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
