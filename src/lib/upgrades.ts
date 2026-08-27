/**
 * Titles that shipped at one frame rate and later ran at a higher one.
 *
 * This is the one question on the site that the catalogue can answer and a news site cannot,
 * because answering it needs the before figure, the after figure and the date of the patch
 * connecting them — three fields that only exist together because enrichment records patches
 * alongside frame rates.
 *
 * It is also a small dataset, and the page built on it says so. Most performance patches are
 * announced without a previous figure to compare against, and a patch with no stated "from"
 * is not evidence of an upgrade.
 */
import { GAMES } from "./games";
import type { Game } from "./types";

export type Upgrade = {
  game: Game;
  previousFps: number;
  newFps: number;
  /** ISO date of the patch that raised it. */
  date: string;
  /** Who the figure was sourced from — publisher, or the outlet that measured it. */
  source: string | null;
  url: string | null;
  /** Days between release and the patch. `null` when the release date is unknown. */
  waitDays: number | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * `previousFps` and `patchIso` are lifted onto a game by src/lib/games.ts from its
 * frame-rate-changing patch, which is the only patch carrying both figures. A game without
 * both is not evidence either way and is skipped rather than assumed unchanged.
 */
function upgradeFor(game: Game): Upgrade | null {
  if (!game.patch || !game.previousFps || !game.patchIso) return null;

  const newFps = game.targets.find((target) => target.primary && target.fps > 0)?.fps ?? 0;
  if (newFps <= game.previousFps) return null;

  const waitDays = game.releaseDate
    ? Math.max(0, Math.round((Date.parse(game.patchIso) - Date.parse(game.releaseDate)) / DAY))
    : null;

  return {
    game,
    previousFps: game.previousFps,
    newFps,
    date: game.patchIso,
    source: game.patch.source || null,
    url: game.patch.url ?? null,
    waitDays: waitDays != null && Number.isFinite(waitDays) ? waitDays : null,
  };
}

export const UPGRADES: Upgrade[] = GAMES.map(upgradeFor)
  .filter((row): row is Upgrade => row !== null)
  .sort((a, b) => b.date.localeCompare(a.date));

/** The subset the "will it get a 60 FPS patch" question actually turns on. */
export const THIRTY_TO_SIXTY: Upgrade[] = UPGRADES.filter(
  (row) => row.previousFps <= 30 && row.newFps >= 60,
);

/** Median wait across upgrades where both dates are known. */
export function medianWaitDays(rows: Upgrade[]): number | null {
  const waits = rows
    .map((row) => row.waitDays)
    .filter((days): days is number => typeof days === "number")
    .sort((a, b) => a - b);
  if (waits.length === 0) return null;
  const mid = Math.floor(waits.length / 2);
  return waits.length % 2 === 0 ? Math.round((waits[mid - 1] + waits[mid]) / 2) : waits[mid];
}

/** "2 yr 4 mo" — the unit the wait is actually felt in. */
export function formatWait(days: number | null) {
  if (days == null) return "Unknown";
  if (days < 45) return `${days} days`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} years` : `${years} yr ${rest} mo`;
}
