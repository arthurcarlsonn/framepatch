import { fpsChangingPatch, fpsRecordFor, platformsIn, strongest } from "./fps";
import { GTA6_GAME } from "./gta6";
import { DATA_SYNCED_AT, IGDB_GAMES } from "./igdb.generated";
import {
  type AppType,
  type FpsRecord,
  type Game,
  type IgdbGame,
  type PatchEvent,
  type PlatformId,
} from "./types";

export { DATA_SYNCED_AT };

/** Parses a plain `YYYY-MM-DD` date as local time — `new Date(iso)` treats it as UTC and can shift the day. */
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatMonth(iso: string) {
  return parseISO(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatDate(iso: string) {
  return parseISO(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatShortDate(iso: string) {
  return parseISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Sortable integer for a "Mon YYYY" patch label — plain string compare puts Sep before Oct. */
export function monthKey(label: string) {
  const [month, year] = label.split(" ");
  return Number(year) * 100 + Math.max(0, MONTHS.indexOf(month));
}

type ImageSize = "t_cover_small" | "t_cover_big" | "t_720p" | "t_screenshot_med" | "t_screenshot_huge";

/** IGDB image CDN. `t_cover_big` is 264×374, `t_screenshot_med` is 569×320. */
export function imageUrl(imageId: string, size: ImageSize) {
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

/**
 * Patch timeline for a game page: every patch the record carries, newest first, with the
 * game's release added as the closing entry.
 */
function buildHistory(record: FpsRecord, releaseDate: string | null): PatchEvent[] {
  const events = record.patches
    .filter((p) => p.date)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map((p) => ({ date: formatMonth(p.date!), label: p.label, url: p.url }));
  const launch = releaseDate ? formatMonth(releaseDate) : null;
  if (launch && !events.some((e) => e.date === launch)) {
    events.push({ date: launch, label: "Launch", url: null });
  }
  return events;
}

function buildGame(igdb: IgdbGame): Game {
  const record = fpsRecordFor(igdb.slug);

  // Backwards-compatible titles are listed on IGDB under their original platform (Bloodborne
  // is "PS4"), so a frame rate record adds consoles IGDB does not know about — but IGDB's own
  // list still counts, which is how a title can be listed on a console with no verified figure.
  const consoles = [...new Set([...(record ? platformsIn(record) : []), ...igdb.consoles])];

  const appType: Partial<Record<PlatformId, AppType>> = {};
  for (const id of consoles) {
    const entry = record?.entries.find((e) => e.platform === id && e.primary);
    appType[id] = entry?.appType === "native" ? "native" : "backcompat";
  }

  const targets = record?.entries ?? [];
  const patch = record ? fpsChangingPatch(record) : undefined;

  return {
    ...igdb,
    consoles,
    verified: targets.some((t) => t.fps > 0),
    appType,
    targets,
    verdict: record?.verdict ?? null,
    patch: patch
      ? {
          type: patch.label,
          date: patch.date ? formatMonth(patch.date) : "",
          verified: record?.lastVerified ? formatMonth(record.lastVerified) : "",
          source: patch.publisher ?? "Official patch notes",
          url: patch.url,
        }
      : undefined,
    patchIso: patch?.date ?? null,
    previousFps: patch?.previousFps ?? undefined,
    note: record?.note ?? undefined,
    requested: record?.requested,
    history: record ? buildHistory(record, igdb.releaseDate) : [],
    confidence: record ? strongest(targets.map((t) => t.confidence)) : "unknown",
    evidence: record?.evidence ?? [],
    lastVerified: record?.lastVerified ?? null,
  };
}

/**
 * The catalogue.
 *
 * Grand Theft Auto VI is appended by hand because it is not in IGDB or on any storefront yet,
 * and the frame rate question is being asked now. The append is conditional: the moment a
 * sync produces a real `grand-theft-auto-vi` record, that one wins and the hand-written one
 * drops out, so the two can never both be present. See src/lib/gta6.ts.
 */
export const GAMES: Game[] = (() => {
  const synced = IGDB_GAMES.map(buildGame);
  return synced.some((game) => game.slug === GTA6_GAME.slug) ? synced : [...synced, GTA6_GAME];
})();

const BY_SLUG = new Map(GAMES.map((g) => [g.slug, g]));

export function getGame(slug: string) {
  return BY_SLUG.get(slug);
}

export function targetsFor(game: Game, platform: PlatformId) {
  return game.targets.filter((t) => t.platform === platform);
}

/**
 * Frame rate the headline verdict is based on: the platform's flagship model.
 * `0` means FramePatch has no verified figure yet.
 */
export function headlineFps(game: Game, platform: PlatformId) {
  return targetsFor(game, platform).find((t) => t.primary)?.fps ?? 0;
}

export function isOnPlatform(game: Game, platform: PlatformId) {
  return game.consoles.includes(platform);
}

/** Frame data can cover one console and not another — Elden Ring is verified on PS5, not Switch. */
export function verifiedOn(game: Game, platform: PlatformId) {
  return targetsFor(game, platform).some((t) => t.fps > 0);
}

export function appTypeLabel(game: Game, platform: PlatformId) {
  if (!verifiedOn(game, platform)) return "Awaiting verification";
  if (game.appType[platform] === "native") {
    return platform === "switch" ? "Native Switch App" : "Native App";
  }
  return "Backwards Comp.";
}

export function gamesFor(platform: PlatformId) {
  return GAMES.filter((g) => isOnPlatform(g, platform));
}

export function verifiedFor(platform: PlatformId) {
  return gamesFor(platform).filter((g) => verifiedOn(g, platform));
}

/**
 * IGDB's own `similar` list first, topped up with a genre/publisher score — most titles
 * only have one or two similar games that are also in this catalogue.
 */
export function relatedFrom(similar: string[], game: Game, platform: PlatformId, count = 5) {
  const picked: Game[] = [];
  const seen = new Set([game.slug]);
  for (const slug of similar) {
    const match = getGame(slug);
    if (match && !seen.has(slug) && isOnPlatform(match, platform)) {
      picked.push(match);
      seen.add(slug);
    }
  }
  for (const candidate of relatedGames(game, platform, count * 3)) {
    if (picked.length >= count) break;
    if (seen.has(candidate.slug)) continue;
    picked.push(candidate);
    seen.add(candidate.slug);
  }
  return picked.slice(0, count);
}

export function relatedGames(game: Game, platform: PlatformId, count = 5) {
  return gamesFor(platform)
    .filter((g) => g.slug !== game.slug)
    .map((g) => {
      let score = 0;
      if (g.franchise && g.franchise === game.franchise) score += 8;
      if (g.developer && g.developer === game.developer) score += 5;
      if (g.publisher && g.publisher === game.publisher) score += 3;
      score += g.genres.filter((x) => game.genres.includes(x)).length * 2;
      if (verifiedOn(g, platform)) score += 2;
      return { g, score: score + g.popularity / 5000 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.g);
}

export function searchGames(query: string, platform: PlatformId) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return gamesFor(platform)
    .map((g) => {
      const title = g.title.toLowerCase();
      let score = 0;
      if (title === q) score = 100;
      else if (title.startsWith(q)) score = 80;
      else if (title.includes(q)) score = 60;
      else if (g.franchise?.toLowerCase().includes(q)) score = 45;
      else if (g.publisher?.toLowerCase().includes(q) || g.developer?.toLowerCase().includes(q)) score = 40;
      else if (g.altNames.some((n) => n.toLowerCase().includes(q))) score = 35;
      else if (g.genres.some((x) => x.toLowerCase().includes(q))) score = 25;
      if (score === 0) return { g, score: 0 };
      return { g, score: score + (verifiedOn(g, platform) ? 5 : 0) + g.popularity / 5000 };
    })
    .filter((s) => s.score > 1)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.g);
}

export type FilterId =
  | "all"
  | "verified"
  | "60"
  | "120"
  | "30"
  | "patched"
  | "native"
  | "backcompat"
  | "unverified";

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "verified", label: "Verified" },
  { id: "60", label: "60 FPS" },
  { id: "120", label: "120 FPS" },
  { id: "30", label: "30 FPS" },
  { id: "patched", label: "Recently patched" },
  { id: "native", label: "Native app" },
  { id: "backcompat", label: "Backwards compatible" },
  { id: "unverified", label: "Awaiting data" },
];

export function applyFilter(games: Game[], filter: FilterId, platform: PlatformId) {
  switch (filter) {
    case "verified":
      return games.filter((g) => verifiedOn(g, platform));
    case "60":
      return games.filter((g) => headlineFps(g, platform) === 60);
    case "120":
      return games.filter((g) => headlineFps(g, platform) >= 120);
    case "30":
      return games.filter((g) => verifiedOn(g, platform) && headlineFps(g, platform) <= 40);
    case "patched":
      return games.filter((g) => Boolean(g.patch));
    case "native":
      return games.filter((g) => g.appType[platform] === "native");
    case "backcompat":
      return games.filter(
        (g) => verifiedOn(g, platform) && g.appType[platform] === "backcompat",
      );
    case "unverified":
      return games.filter((g) => !verifiedOn(g, platform));
    default:
      return games;
  }
}

const byPopularity = (a: Game, b: Game) => b.popularity - a.popularity || b.ratingCount - a.ratingCount;

export function recentlyUpgraded(platform: PlatformId) {
  return verifiedFor(platform)
    .filter((g) => g.previousFps && headlineFps(g, platform) > g.previousFps)
    .sort((a, b) => (b.patchIso ?? "").localeCompare(a.patchIso ?? ""));
}

export function popularAt(platform: PlatformId, fps: number) {
  return verifiedFor(platform)
    .filter((g) => headlineFps(g, platform) >= fps)
    .sort(byPopularity);
}

export function stillLocked(platform: PlatformId) {
  return verifiedFor(platform)
    .filter((g) => headlineFps(g, platform) <= 40)
    .sort(byPopularity);
}

export function awaitingVerification(platform: PlatformId) {
  return gamesFor(platform)
    .filter((g) => !verifiedOn(g, platform))
    .sort(byPopularity);
}

export function mostPopular(platform: PlatformId) {
  return [...gamesFor(platform)].sort(byPopularity);
}
