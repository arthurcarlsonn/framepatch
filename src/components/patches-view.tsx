"use client";

import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { FpsBadge } from "@/components/fps-badge";
import { GameCover } from "@/components/game-cover";
import { usePlatform } from "@/components/platform-provider";
import { Badge } from "@/components/ui/badge";
import { appTypeLabel, gamesFor, headlineFps, monthKey, verifiedOn } from "@/lib/games";
import { PLATFORM_LABEL, type Game } from "@/lib/types";

export function PatchesView() {
  const { platform } = usePlatform();

  const groups = useMemo(() => {
    // Two guards, both about not contradicting the rest of the site: an undated patch cannot
    // be grouped under a month, and a patch on a title with no verified figure would announce
    // an upgrade on a page that says "awaiting verification".
    const patched = gamesFor(platform).filter((g) => g.patch?.date && verifiedOn(g, platform));
    const map = new Map<string, Game[]>();
    for (const game of patched) {
      const key = game.patch!.date;
      map.set(key, [...(map.get(key) ?? []), game]);
    }
    return [...map.entries()].sort((a, b) => monthKey(b[0]) - monthKey(a[0]));
  }, [platform]);

  const total = groups.reduce((n, [, games]) => n + games.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <header className="mb-10">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">
          {PLATFORM_LABEL[platform]}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          Frame rate patches
        </h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          {total} verified frame rate changes, newest first. Each entry is checked against publisher
          patch notes before it goes live.
        </p>
      </header>

      <div className="space-y-10">
        {groups.map(([month, games]) => (
          <section key={month}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-heading text-sm font-semibold tracking-[0.04em] uppercase">
                {month}
              </h2>
              <span className="bg-border h-px flex-1" />
              <Badge variant="secondary" className="rounded-full text-[11px]">
                {games.length} {games.length === 1 ? "patch" : "patches"}
              </Badge>
            </div>

            <div className="space-y-2">
              {games.map((game) => {
                const fps = headlineFps(game, platform);
                return (
                  <Link
                    key={game.slug}
                    href={`/games/${game.slug}`}
                    className="group border-border/70 bg-card hover:border-primary/40 flex items-center gap-4 rounded-lg border p-3 transition-colors"
                  >
                    <GameCover game={game} size="thumb" className="h-14 w-10 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{game.title}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {game.patch!.type} · {appTypeLabel(game, platform)}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      {game.previousFps && game.previousFps < fps ? (
                        <>
                          <FpsBadge fps={game.previousFps} size="xs" label={`${game.previousFps} FPS`} />
                          <ArrowRightIcon className="text-muted-foreground size-3.5" />
                        </>
                      ) : null}
                      <FpsBadge fps={fps} size="xs" />
                    </div>
                    <ChevronRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
