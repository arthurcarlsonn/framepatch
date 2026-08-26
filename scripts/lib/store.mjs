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
 * Pass `isStale(existing, game)` to invalidate a single cached entry regardless of its age,
 * `checkpointEvery` to flush the table mid-run so a long pass survives an interruption, and
 * `concurrency` to run several games at once. Concurrency defaults to 1: the storefront
 * adapters are deliberately paced, and only the enrichment worker is slow enough to want it.
 *
 * A task may return a record (stored), `null` (this source has nothing for the game —
 * remembered so we do not retry it every run), or throw (kept as an error, previous data
 * preserved). One failing game never fails the run.
 */
export async function syncEntries(
  source,
  games,
  task,
  { force = false, maxAgeDays = 7, onProgress, isStale, checkpointEvery = 0, concurrency = 1 } = {},
) {
  const table = await readSource(source);
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const stats = { ok: 0, skipped: 0, empty: 0, failed: 0 };

  // Freshness is decided up front so the workers only ever see real work.
  const pending = [];
  for (const game of games) {
    const key = String(game.igdbId);
    const existing = table.entries[key];
    const fresh =
      existing?.fetchedAt &&
      now - Date.parse(existing.fetchedAt) < maxAge &&
      // An age check alone cannot see a game that shipped a patch yesterday. `isStale` lets a
      // caller invalidate one entry on its own terms — see scripts/enrich.mjs.
      !isStale?.(existing, game);
    if (!force && fresh) {
      stats.skipped++;
      continue;
    }
    pending.push({ game, key, existing });
  }

  let settled = 0;
  let writing = false;

  // Two checkpoints must not overlap: they serialise the same table, and a half-written
  // cache is worse than a slightly older one. Skipping is safe — the next one catches up.
  const checkpoint = async () => {
    if (writing) return;
    writing = true;
    try {
      table.source = source;
      table.syncedAt = new Date().toISOString();
      await writeSource(source, table);
    } finally {
      writing = false;
    }
  };

  const runOne = async ({ game, key, existing }) => {
    try {
      const data = await task(game);
      table.entries[key] = {
        slug: game.slug,
        fetchedAt: new Date().toISOString(),
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
        lastErrorAt: new Date().toISOString(),
      };
      stats.failed++;
    }

    settled++;
    onProgress?.(stats);
    if (checkpointEvery && settled % checkpointEvery === 0) await checkpoint();
  };

  // A fixed pool rather than a chunked barrier, so a slow game never idles the others.
  let cursor = 0;
  const workers = Math.max(1, Math.min(concurrency, pending.length));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (cursor < pending.length) await runOne(pending[cursor++]);
    }),
  );

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
