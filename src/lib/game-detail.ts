import "server-only";

import { getGame } from "./games";
import { IGDB_DETAILS } from "./igdb-detail.generated";
import type { FullGame, GameDetailData } from "./types";

const EMPTY: GameDetailData = {
  summary: null,
  themes: [],
  gameModes: [],
  availability: [],
  stores: [],
  media: [],
  trailer: null,
  releaseDates: [],
  multiplayer: null,
  engines: [],
  perspectives: [],
  similar: [],
  xbox: null,
  nintendo: null,
  playstation: null,
  steam: null,
  gamePassTiers: null,
  playtime: null,
};

/**
 * Joins a game with its long-form IGDB fields. Server-only on purpose: the detail map is
 * ~190KB and would otherwise land in the browser bundle alongside every list page.
 */
export function getFullGame(slug: string): FullGame | undefined {
  const game = getGame(slug);
  if (!game) return undefined;
  return { ...game, ...(IGDB_DETAILS[slug] ?? EMPTY) };
}
