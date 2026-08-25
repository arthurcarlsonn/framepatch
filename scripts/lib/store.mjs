/**
 * The local cache that the site is generated from — our own source of truth.
 *
 * One JSON file per source under data/, each keyed by IGDB game id. A sync run merges
 * into whatever is already there, so a storefront that changes shape or goes down leaves
 * the previous values intact and the site keeps building. Nothing here is fetched at
 * request time; `pnpm generate` turns these files into the committed TypeScript the app
 * imports.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA_DIR = path.join(ROOT, "data");

function fileFor(source) {
  return path.join(DATA_DIR, `${source}.json`);
}

export async function readSource(source) {
  try {
    const raw = await readFile(fileFor(source), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return { source, syncedAt: null, entries: {} };
    throw error;
  }
}

export async function writeSource(source, table) {
  await mkdir(DATA_DIR, { recursive: true });
  const sorted = Object.fromEntries(
    Object.entries(table.entries).sort(([a], [b]) => Number(a) - Number(b)),
  );
  await writeFile(
    fileFor(source),
    `${JSON.stringify({ ...table, entries: sorted }, null, 2)}\n`,
  );
}

/**
 * Runs `task` for each game and folds the results into the cached table.
 *
 * A task may return a record (stored), `null` (this source has nothing for the game —
 * remembered so we do not retry it every run), or throw (kept as an error, previous data
 * preserved). One failing game never fails the run.
 */
export async function syncEntries(source, games, task, { force = false, maxAgeDays = 7, onProgress } = {}) {
  const table = await readSource(source);
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const stats = { ok: 0, skipped: 0, empty: 0, failed: 0 };

  for (const game of games) {
    const key = String(game.igdbId);
    const existing = table.entries[key];
    const fresh = existing?.fetchedAt && now - Date.parse(existing.fetchedAt) < maxAge;
    if (!force && fresh) {
      stats.skipped++;
      continue;
    }

    try {
      const data = await task(game);
      table.entries[key] = {
        slug: game.slug,
        fetchedAt: new Date(now).toISOString(),
        data: data ?? null,
      };
      if (data) stats.ok++;
      else stats.empty++;
    } catch (error) {
      // Keep whatever we had. A storefront redesign degrades the data, never the build.
      table.entries[key] = {
        ...(existing ?? { slug: game.slug, data: null }),
        slug: game.slug,
        lastError: `${error.message}`.slice(0, 200),
        lastErrorAt: new Date(now).toISOString(),
      };
      stats.failed++;
    }
    onProgress?.(stats);
  }

  table.source = source;
  table.syncedAt = new Date().toISOString();
  await writeSource(source, table);
  return stats;
}

/** Entries that carry usable data, keyed by IGDB id. Errored and empty entries drop out. */
export async function loadData(source) {
  const table = await readSource(source);
  const out = new Map();
  for (const [id, entry] of Object.entries(table.entries)) {
    if (entry.data) out.set(Number(id), entry.data);
  }
  return out;
}
