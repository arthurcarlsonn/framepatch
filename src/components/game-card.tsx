import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { FpsBadge } from "@/components/fps-badge";
import { GameCover } from "@/components/game-cover";
import { appTypeLabel, headlineFps, verifiedOn } from "@/lib/games";
import { PLATFORM_LABEL, type Game, type PlatformId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GameCard({
  game,
  platform,
  className,
  priority,
}: {
  game: Game;
  platform: PlatformId;
  className?: string;
  priority?: boolean;
}) {
  const fps = headlineFps(game, platform);
  const showPrev = Boolean(game.previousFps && game.previousFps < fps);

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cn(
        "group border-border/70 bg-card focus-visible:ring-ring/60 relative flex flex-col overflow-hidden rounded-lg border transition-colors outline-none",
        "hover:border-primary/45 hover:bg-accent/40 focus-visible:ring-2",
        className,
      )}
    >
      <GameCover game={game} size="card" priority={priority} className="aspect-[3/4] w-full" />

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold tracking-[-0.01em]">
          {game.title}
        </h3>
        <p className="text-muted-foreground text-xs">
          {PLATFORM_LABEL[platform]} <span className="opacity-50">•</span>{" "}
          {appTypeLabel(game, platform)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <FpsBadge fps={fps} size="xs" />
          {showPrev ? (
            <span className="text-muted-foreground text-[11px]">Prev. {game.previousFps} FPS</span>
          ) : game.gamePass ? (
            <span className="text-fps-good bg-fps-good-soft ring-fps-good/20 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset">
              Game Pass
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-border/70 text-muted-foreground group-hover:text-foreground flex items-center justify-between border-t px-3.5 py-2 text-[11px] transition-colors">
        <span className="truncate">{(verifiedOn(game, platform) && game.note) || (verifiedOn(game, platform) ? "View details" : "Help us verify")}</span>
        <ChevronRightIcon className="size-3.5 shrink-0" />
      </div>
    </Link>
  );
}

export function GameRow({ game, platform }: { game: Game; platform: PlatformId }) {
  const fps = headlineFps(game, platform);

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group border-border/70 bg-card hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-ring/60 flex items-center gap-4 rounded-lg border px-3 py-3 transition-colors outline-none focus-visible:ring-2"
    >
      <GameCover game={game} size="thumb" className="h-14 w-10 shrink-0 rounded-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{game.title}</p>
        <p className="text-muted-foreground truncate text-xs">
          {appTypeLabel(game, platform)}
          {game.patch ? ` · Updated ${game.patch.date}` : ""}
        </p>
      </div>
      <FpsBadge fps={fps} size="xs" />
      <ChevronRightIcon className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
