"use client";

import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { GameCard, GameRow } from "@/components/game-card";
import { usePlatform } from "@/components/platform-provider";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  awaitingVerification,
  FILTERS,
  gamesFor,
  mostPopular,
  popularAt,
  recentlyUpgraded,
  searchGames,
  stillLocked,
  verifiedFor,
} from "@/lib/games";
import { PLATFORM_LABEL } from "@/lib/types";

/** Cards per rail — matches the 5-column grid at lg and up. */
const RAIL = 5;

export function HomeView() {
  const { platform } = usePlatform();
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const upgraded = recentlyUpgraded(platform);
    return {
      total: gamesFor(platform).length,
      verifiedCount: verifiedFor(platform).length,
      upgraded: upgraded.slice(0, RAIL),
      upgradedCount: upgraded.length,
      popular: popularAt(platform, 60).slice(0, RAIL),
      locked: stillLocked(platform).slice(0, RAIL),
      awaiting: awaitingVerification(platform).slice(0, RAIL),
      browse: mostPopular(platform).slice(0, 6),
    };
  }, [platform]);

  const results = useMemo(
    () => (query.trim() ? searchGames(query, platform) : []),
    [query, platform],
  );

  const label = PLATFORM_LABEL[platform];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="grid-veil pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1280px] px-4 pt-16 pb-10 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge
              variant="outline"
              className="bg-background/60 mb-5 rounded-full py-1 pr-3 pl-1.5 backdrop-blur"
            >
              <span className="bg-fps-good mr-2 inline-block size-1.5 rounded-full" />
              <span className="text-muted-foreground text-xs font-normal">
                {data.verifiedCount} verified · {data.total} titles indexed
              </span>
            </Badge>

            <h1 className="font-heading text-4xl font-bold tracking-[-0.035em] text-balance sm:text-5xl">
              Find games that run at{" "}
              <span className="text-fps-good whitespace-nowrap">60 FPS</span>{" "}
              <span className="whitespace-nowrap">on {label}</span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-[15px] text-balance">
              Instant frame rate performance verification for console libraries.
            </p>

            <div className="relative mx-auto mt-8 max-w-xl">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games…"
                aria-label="Search games"
                className="bg-card h-13! rounded-lg! pr-12 pl-11 text-base!"
              />
              {query ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear search"
                  className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => setQuery("")}
                >
                  <XIcon className="size-4" />
                </Button>
              ) : (
                <kbd className="text-muted-foreground border-border/70 bg-muted/60 absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border px-1.5 py-0.5 font-mono text-[11px] sm:block">
                  ⌘K
                </kbd>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {FILTERS.filter((f) => f.id !== "all").map((f) => (
                <Link
                  key={f.id}
                  href={`/browse?filter=${f.id}`}
                  className="border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-full border px-3.5 py-1.5 text-[13px] font-medium backdrop-blur transition-colors"
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 pb-4 sm:px-6">
        {query.trim() ? (
          <SearchResults query={query} count={results.length}>
            {results.map((game) => (
              <GameRow key={game.slug} game={game} platform={platform} />
            ))}
          </SearchResults>
        ) : (
          <div className="space-y-14 pt-6">
            <HubStrip />

            <section>
              <SectionHeader
                title={`Recently upgraded to 60 FPS`}
                tag={`${data.upgradedCount} new patches`}
                href="/patches"
              />
              <CardGrid>
                {data.upgraded.map((game, i) => (
                  <GameCard key={game.slug} game={game} platform={platform} priority={i < 5} />
                ))}
              </CardGrid>
            </section>

            <section>
              <SectionHeader title="Popular at 60 FPS" href="/browse?filter=60" />
              <CardGrid>
                {data.popular.map((game) => (
                  <GameCard key={game.slug} game={game} platform={platform} />
                ))}
              </CardGrid>
            </section>

            <section>
              <SectionHeader title="Still 30 FPS" tag="Highly Requested" href="/browse?filter=30" />
              <CardGrid>
                {data.locked.map((game) => (
                  <GameCard key={game.slug} game={game} platform={platform} />
                ))}
              </CardGrid>
            </section>

            <section>
              <SectionHeader
                title="Awaiting verification"
                tag={`${data.total - data.verifiedCount} titles`}
                href="/browse?filter=unverified"
              />
              <CardGrid>
                {data.awaiting.map((game) => (
                  <GameCard key={game.slug} game={game} platform={platform} />
                ))}
              </CardGrid>
            </section>

            <section>
              <SectionHeader
                title="Browse all games"
                tag={`${data.total} listed`}
                href="/browse"
              />
              <div className="space-y-2">
                {data.browse.map((game) => (
                  <GameRow key={game.slug} game={game} platform={platform} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
  );
}

function SearchResults({
  query,
  count,
  children,
}: {
  query: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-4 pb-10">
      <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
        Frame rate answers for “{query}”
      </p>
      {count === 0 ? (
        <div className="border-border/70 text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
          Nothing indexed for “{query}” on this console yet.
          <br />
          <Link href="/submit" className="text-primary mt-2 inline-block font-medium">
            Submit frame rate info →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

/**
 * Entry points into the generated hubs.
 *
 * The rails below this are console-specific and rebuilt from client state, which makes them
 * useless as crawl paths — every one of them points back into /browse. This strip is the
 * home page's only static internal linking, and without it the whole generated architecture
 * hangs off the sitemap alone.
 */
const HUBS: { href: string; label: string; blurb: string }[] = [
  {
    href: "/gta-6",
    label: "GTA 6 frame rate",
    blurb: "Reported 30 FPS on every console. Every source, tracked.",
  },
  {
    href: "/live",
    label: "FramePatch Live",
    blurb: "Frame rate claims as they land, with how settled each one is.",
  },
  {
    href: "/upgraded-to-60-fps",
    label: "30 FPS games that reached 60",
    blurb: "Every documented upgrade, and how long each one took.",
  },
  {
    href: "/consoles",
    label: "Browse by console",
    blurb: "PS5, Xbox Series X|S and Switch, split by frame rate and genre.",
  },
];

function HubStrip() {
  return (
    <section aria-label="Frame rate hubs">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HUBS.map((hub) => (
          <Link
            key={hub.href}
            href={hub.href}
            className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 flex flex-col gap-1.5 rounded-lg border p-4 transition-colors"
          >
            <span className="group-hover:text-primary text-sm font-semibold transition-colors">
              {hub.label}
            </span>
            <span className="text-muted-foreground text-xs leading-relaxed">{hub.blurb}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
