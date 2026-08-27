/**
 * The programmatic page set: every collection, franchise and publisher URL FramePatch
 * publishes, derived from the catalogue rather than hand-listed.
 *
 * The guard that matters is MIN_GAMES. A generated page with three titles on it is a thin
 * page — it competes with the pages that would have ranked, and at scale it is what gets a
 * templated site classified as doorway spam. Everything here is size-gated, so a collection
 * only exists once the data can carry it, and the sitemap only ever lists pages that exist.
 */
import {
  appTypeLabel,
  gamesFor,
  headlineFps,
  verifiedOn,
} from "./games";
import { GAMES } from "./games";
import { PLATFORMS, type Game, type PlatformId } from "./types";

/** Below this a generated page has nothing to say. Raise it, never lower it. */
export const MIN_GAMES = 8;

// ── slugs ─────────────────────────────────────────────────────────────────────

const SLUG_OVERRIDES: Record<string, string> = {
  "Role-playing (RPG)": "rpg",
  "Hack and slash/Beat 'em up": "hack-and-slash",
  "Turn-based strategy (TBS)": "turn-based-strategy",
  "Real Time Strategy (RTS)": "real-time-strategy",
  "Card & Board Game": "card-and-board",
  "Quiz/Trivia": "quiz",
};

/**
 * URL-safe slug. Publisher and franchise names carry curly apostrophes ("Tom Clancy’s"),
 * dots ("S.T.A.L.K.E.R.") and ampersands, all of which have to collapse to something a
 * crawler and a human can both read back.
 */
export function slugify(value: string) {
  return (
    SLUG_OVERRIDES[value] ??
    value
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

// ── collections ───────────────────────────────────────────────────────────────

export type CollectionKind = "fps" | "genre" | "app-type" | "status";

export type Collection = {
  slug: string;
  kind: CollectionKind;
  /** Noun phrase the page headline is built from — "60 FPS games", "RPGs". */
  label: string;
  /** Short line under the H1. `{platform}` is substituted with the console name. */
  blurb: string;
  match: (game: Game, platform: PlatformId) => boolean;
};

const FPS_COLLECTIONS: Collection[] = [
  {
    slug: "120-fps-games",
    kind: "fps",
    label: "120 FPS games",
    blurb:
      "Titles with a documented 120 FPS mode on {platform}. Every one needs a 120Hz display, " +
      "and most trade resolution for the frame rate.",
    match: (game, platform) => headlineFps(game, platform) >= 120,
  },
  {
    slug: "60-fps-games",
    kind: "fps",
    label: "60 FPS games",
    blurb:
      "Titles that hit a 60 FPS target on {platform}, whether natively or through a " +
      "performance mode added after launch.",
    match: (game, platform) => headlineFps(game, platform) === 60,
  },
  {
    slug: "30-fps-games",
    kind: "fps",
    label: "30 FPS games",
    blurb:
      "Titles still capped at 30 FPS on {platform}. These are the ones a performance patch " +
      "would change most, so the list is worth re-reading after a major update.",
    match: (game, platform) => {
      const fps = headlineFps(game, platform);
      return fps > 0 && fps <= 30;
    },
  },
];

const OTHER_COLLECTIONS: Collection[] = [
  {
    slug: "recently-patched-games",
    kind: "status",
    label: "recently patched games",
    blurb:
      "Titles whose frame rate changed in a patch on {platform}, newest first, each tied to " +
      "the update that changed it.",
    match: (game) => Boolean(game.patch),
  },
  {
    slug: "backwards-compatible-games",
    kind: "app-type",
    label: "backwards compatible games",
    blurb:
      "Last-generation titles running on {platform} through backwards compatibility. Several " +
      "run far above their original cap; several do not.",
    match: (game, platform) =>
      verifiedOn(game, platform) && game.appType[platform] === "backcompat",
  },
];

function genreCollections(): Collection[] {
  const genres = new Set<string>();
  for (const game of GAMES) for (const genre of game.genres) genres.add(genre);

  return [...genres].map((genre) => ({
    slug: `${slugify(genre)}-games`,
    kind: "genre" as const,
    label: `${genre} games`,
    blurb: `Frame rate targets for every ${genre} title FramePatch has verified on {platform}.`,
    match: (game: Game) => game.genres.includes(genre),
  }));
}

const ALL_COLLECTIONS: Collection[] = [
  ...FPS_COLLECTIONS,
  ...OTHER_COLLECTIONS,
  ...genreCollections(),
];

/**
 * Games in a collection on one console, ranked the way the page reads: verified first, then
 * by the frame rate itself, then popularity. A collection only contains verified titles —
 * "60 FPS games" is a claim, and an unverified title cannot be in it.
 */
export function collectionGames(collection: Collection, platform: PlatformId): Game[] {
  return gamesFor(platform)
    .filter((game) => verifiedOn(game, platform) && collection.match(game, platform))
    .sort(
      (a, b) =>
        headlineFps(b, platform) - headlineFps(a, platform) ||
        b.popularity - a.popularity ||
        b.ratingCount - a.ratingCount,
    );
}

/** Collections that clear MIN_GAMES on a console — the only ones with a published URL. */
export function collectionsFor(platform: PlatformId): Collection[] {
  return ALL_COLLECTIONS.filter((c) => collectionGames(c, platform).length >= MIN_GAMES);
}

export function findCollection(slug: string): Collection | undefined {
  return ALL_COLLECTIONS.find((c) => c.slug === slug);
}

/** Every (console, collection) pair with a page behind it. Drives routing and the sitemap. */
export function allCollectionRoutes(): { platform: PlatformId; collection: Collection }[] {
  return PLATFORMS.flatMap((p) =>
    collectionsFor(p.id).map((collection) => ({ platform: p.id, collection })),
  );
}

// ── franchises and publishers ─────────────────────────────────────────────────

export type Group = {
  slug: string;
  name: string;
  games: Game[];
};

/** A franchise or publisher is only worth a page once it spans several verified titles. */
const MIN_GROUP_GAMES = 4;

function groupBy(pick: (game: Game) => string | null): Group[] {
  const groups = new Map<string, { name: string; games: Game[] }>();

  for (const game of GAMES) {
    const name = pick(game);
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const existing = groups.get(slug);
    if (existing) existing.games.push(game);
    else groups.set(slug, { name, games: [game] });
  }

  return [...groups]
    .map(([slug, group]) => ({
      slug,
      name: group.name,
      games: group.games.sort((a, b) => b.popularity - a.popularity),
    }))
    .filter(
      (group) =>
        group.games.length >= MIN_GROUP_GAMES &&
        // A page that can only say "awaiting verification" for every row is not a page.
        group.games.some((game) => game.verified),
    )
    .sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name));
}

export const FRANCHISES: Group[] = groupBy((game) => game.franchise);
export const PUBLISHERS: Group[] = groupBy((game) => game.publisher);

export function findGroup(groups: Group[], slug: string) {
  return groups.find((group) => group.slug === slug);
}

// ── per-game console routes ───────────────────────────────────────────────────

/**
 * `/games/[slug]/[platform]` exists only where the console has a verified figure of its own.
 * Without one the page would restate the parent title page with a console name swapped in,
 * which is the duplicate-content shape this whole file is arranged to avoid.
 */
export function gamePlatformRoutes(): { slug: string; platform: PlatformId }[] {
  return GAMES.flatMap((game) =>
    game.consoles
      .filter((platform) => verifiedOn(game, platform))
      .map((platform) => ({ slug: game.slug, platform })),
  );
}

// ── copy helpers ──────────────────────────────────────────────────────────────

/** "Native App" / "Backwards Comp." reads fine in a chip and badly in a sentence. */
export function appTypeSentence(game: Game, platform: PlatformId) {
  const label = appTypeLabel(game, platform);
  if (label === "Backwards Comp.") return "runs through backwards compatibility";
  if (label === "Awaiting verification") return "has no verified build type";
  return "is a native current-generation build";
}

export const PLATFORM_NAME: Record<PlatformId, string> = {
  ps5: "PlayStation 5",
  xsx: "Xbox Series X|S",
  switch: "Nintendo Switch",
};

/** The console the URL segment names — `/consoles/ps5/60-fps-games`. */
export const PLATFORM_SLUG: Record<PlatformId, string> = {
  ps5: "ps5",
  xsx: "xbox-series-x",
  switch: "nintendo-switch",
};

export const PLATFORM_BY_SLUG: Record<string, PlatformId> = Object.fromEntries(
  Object.entries(PLATFORM_SLUG).map(([id, slug]) => [slug, id as PlatformId]),
) as Record<string, PlatformId>;
