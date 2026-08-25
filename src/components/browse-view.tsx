"use client";

import { LayoutGridIcon, ListIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { GameCard, GameRow } from "@/components/game-card";
import { usePlatform } from "@/components/platform-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  applyFilter,
  FILTERS,
  gamesFor,
  headlineFps,
  monthKey,
  searchGames,
  type FilterId,
} from "@/lib/games";
import { PLATFORM_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortId = "popular" | "fps" | "title" | "recent";

const SORTS: { id: SortId; label: string }[] = [
  { id: "popular", label: "Most popular" },
  { id: "fps", label: "Highest frame rate" },
  { id: "recent", label: "Recently patched" },
  { id: "title", label: "A–Z" },
];

export function BrowseView() {
  const { platform } = usePlatform();
  const searchParams = useSearchParams();
  const [pickedFilter, setFilter] = useState<FilterId | null>(null);
  const [sort, setSort] = useState<SortId>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  // ?filter= seeds the view; an explicit chip click takes over from there.
  const urlFilter = searchParams.get("filter") as FilterId | null;
  const filter =
    pickedFilter ?? (urlFilter && FILTERS.some((f) => f.id === urlFilter) ? urlFilter : "all");

  const games = useMemo(() => {
    const base = query.trim() ? searchGames(query, platform) : gamesFor(platform);
    const filtered = applyFilter(base, filter, platform);
    const sorted = [...filtered];
    switch (sort) {
      case "fps":
        sorted.sort(
          (a, b) => headlineFps(b, platform) - headlineFps(a, platform) || b.ratingCount - a.ratingCount,
        );
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "recent":
        sorted.sort(
          (a, b) =>
            monthKey(b.patch?.date ?? "") - monthKey(a.patch?.date ?? "") ||
            b.ratingCount - a.ratingCount,
        );
        break;
      default:
        sorted.sort((a, b) => b.ratingCount - a.ratingCount);
    }
    return sorted;
  }, [platform, filter, sort, query]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6">
      <header className="mb-8">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">
          {PLATFORM_LABEL[platform]} library
        </p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          Browse all games
        </h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          {games.length} {games.length === 1 ? "title" : "titles"} indexed from IGDB, with
          FrameCheck frame rate verification layered on top.
        </p>
      </header>

      <div className="bg-background/80 sticky top-16 z-30 -mx-4 mb-6 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-72">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title…"
              aria-label="Filter games"
              className="h-9! pl-9"
            />
          </div>

          <div className="no-scrollbar -mx-1 flex flex-1 gap-2 overflow-x-auto px-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  filter === f.id
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  <SlidersHorizontalIcon data-icon="inline-start" className="size-3.5" />
                  {SORTS.find((s) => s.id === sort)!.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORTS.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => setSort(s.id)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as "grid" | "list")}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGridIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <ListIcon className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="border-border/70 text-muted-foreground rounded-lg border border-dashed py-24 text-center text-sm">
          No games match these filters on {PLATFORM_LABEL[platform]}.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {games.map((game) => (
            <GameCard key={game.slug} game={game} platform={platform} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <GameRow key={game.slug} game={game} platform={platform} />
          ))}
        </div>
      )}
    </div>
  );
}
