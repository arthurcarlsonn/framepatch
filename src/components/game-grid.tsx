import Link from "next/link";

import { FpsBadge } from "@/components/fps-badge";
import { GameCover } from "@/components/game-cover";
import { appTypeLabel, headlineFps } from "@/lib/games";
import { PLATFORM_LABEL, type Game, type PlatformId } from "@/lib/types";

/**
 * The list body of every generated collection page.
 *
 * Deliberately a server component, unlike GameCard's consumers: these pages are the ones
 * crawlers read, so the markup has to be in the HTML rather than assembled after hydration.
 * It also means the frame rate is rendered for the page's own console rather than whichever
 * one the visitor last picked in the switcher.
 */
export function GameGrid({ games, platform }: { games: Game[]; platform: PlatformId }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {games.map((game, i) => {
        const fps = headlineFps(game, platform);
        return (
          <li key={game.slug} className="contents">
            <Link
              href={`/games/${game.slug}`}
              className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 focus-visible:ring-ring/60 flex flex-col overflow-hidden rounded-lg border transition-colors outline-none focus-visible:ring-2"
            >
              <GameCover
                game={game}
                size="card"
                priority={i < 5}
                className="aspect-[3/4] w-full"
              />
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <h3 className="line-clamp-2 text-sm leading-snug font-semibold tracking-[-0.01em]">
                  {game.title}
                </h3>
                <p className="text-muted-foreground text-xs">
                  {PLATFORM_LABEL[platform]} <span className="opacity-50">•</span>{" "}
                  {appTypeLabel(game, platform)}
                </p>
                <div className="mt-auto pt-1">
                  <FpsBadge fps={fps} size="xs" check />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact linked list for the "see also" rails that tie the generated pages together. */
export function LinkRail({
  links,
}: {
  links: { href: string; label: string; count?: number }[];
}) {
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="border-border/70 text-muted-foreground hover:text-foreground hover:border-border inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
          >
            {link.label}
            {link.count != null ? (
              <span className="text-muted-foreground/70 tabular-nums">{link.count}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
