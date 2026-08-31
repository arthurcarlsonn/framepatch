"use client";

import { CornerDownLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { FpsBadge } from "@/components/fps-badge";
import { GameCover } from "@/components/game-cover";
import { usePlatform } from "@/components/platform-provider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { appTypeLabel, gamesFor, headlineFps, searchGames } from "@/lib/games";
import { PLATFORM_LABEL } from "@/lib/types";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { platform } = usePlatform();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const list = query.trim()
      ? searchGames(query, platform)
      : [...gamesFor(platform)].sort((a, b) => b.ratingCount - a.ratingCount);
    return list.slice(0, 8);
  }, [query, platform]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setQuery("");
      onOpenChange(next);
    },
    [onOpenChange],
  );

  function go(slug: string) {
    handleOpenChange(false);
    router.push(`/games/${slug}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search games"
      description={`Search frame rate data for ${PLATFORM_LABEL[platform]}`}
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={`Search ${PLATFORM_LABEL[platform]} games…`}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-96 p-1">
          <CommandEmpty className="py-10 text-center text-sm">
            No frame rate data for “{query}”.
          </CommandEmpty>
          <CommandGroup heading={query.trim() ? "Results" : "Most searched"}>
            {results.map((game) => (
              <CommandItem
                key={game.slug}
                value={game.slug}
                onSelect={() => go(game.slug)}
                className="gap-3 py-2"
              >
                <GameCover game={game} size="thumb" className="h-12 w-9 shrink-0 rounded-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{game.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {appTypeLabel(game, platform)}
                    {game.patch ? ` · ${game.patch.date} update` : ""}
                  </p>
                </div>
                <FpsBadge fps={headlineFps(game, platform)} size="xs" />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="border-border/70 text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-[11px]">
          <span>Frame rate answers for {PLATFORM_LABEL[platform]}</span>
          <span className="flex items-center gap-1">
            <CornerDownLeftIcon className="size-3" /> to open
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
