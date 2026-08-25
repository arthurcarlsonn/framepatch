/**
 * Refreshes the local cache under data/ from every source, then regenerates the
 * TypeScript the app imports.
 *
 *   pnpm sync                      every source, skipping entries synced in the last week
 *   pnpm sync --only=xboxStore     one adapter
 *   pnpm sync --skip=howLongToBeat leave one out
 *   pnpm sync --force              refetch even fresh entries
 *   pnpm sync --max=5              stop after 5 games, for probing a source
 *   pnpm sync --per-platform=100   widen IGDB discovery
 *
 * Each source is independent: one that fails or changes shape leaves its previous cached
 * values in place and the remaining sources still run.
 */
import { fetchCatalogue } from "./adapters/igdb.mjs";
import { fetchGamePassCatalog } from "./adapters/game-pass.mjs";
import { fetchPlaytimes } from "./adapters/how-long-to-beat.mjs";
import { fetchNintendoPrices, fetchNintendoProduct } from "./adapters/nintendo-store.mjs";
import {
  currentBuildId,
  fetchPlaystationProduct,
  refreshPlaystationPrice,
} from "./adapters/playstation-store.mjs";
import { appIdFrom, fetchSteamPrices } from "./adapters/steam-store.mjs";
import { fetchXboxProducts } from "./adapters/xbox-store.mjs";
import { readFile } from "node:fs/promises";

import { loadData, readSource, syncEntries, writeSource } from "./lib/store.mjs";
import { generate } from "./generate.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const force = args.includes("--force");
const only = flag("only")?.split(",");
const skip = flag("skip")?.split(",") ?? [];
const perPlatform = Number(flag("per-platform") ?? 70);
const curatedOnly = args.includes("--curated-only");
/** Cap how many games an adapter touches — handy for probing a source without a full run. */
const max = Number(flag("max") ?? Infinity);

const wanted = (name) => (only ? only.includes(name) : true) && !skip.includes(name);

function report(name, stats) {
  const parts = Object.entries(stats)
    .filter(([, v]) => v)
    .map(([k, v]) => `${v} ${k}`);
  console.log(`  ${name}: ${parts.join(", ") || "nothing to do"}`);
}

// ── igdb ──────────────────────────────────────────────────────────────────────

let games = [];

if (wanted("igdb")) {
  console.log("igdb — fetching catalogue…");
  const records = await fetchCatalogue({ curatedOnly, perPlatform });
  const table = { source: "igdb", syncedAt: new Date().toISOString(), entries: {} };
  for (const record of records) {
    table.entries[String(record.index.igdbId)] = {
      slug: record.index.slug,
      fetchedAt: table.syncedAt,
      data: record,
    };
  }
  await writeSource("igdb", table);
  console.log(`  igdb: ${records.length} titles`);
} else {
  console.log("igdb — skipped, using cached catalogue");
}

const igdbTable = await readSource("igdb");
games = Object.values(igdbTable.entries)
  .map((entry) => entry.data)
  .filter(Boolean)
  .map((record) => ({ igdbId: record.index.igdbId, slug: record.index.slug, title: record.index.title, links: record.links }));

if (games.length === 0) {
  console.error("No cached IGDB catalogue. Run `pnpm sync` without --skip=igdb first.");
  process.exit(1);
}
console.log(`\n${games.length} games in the catalogue.\n`);

const limit = (list) => (Number.isFinite(max) ? list.slice(0, max) : list);

// ── xbox + game pass ──────────────────────────────────────────────────────────

if (wanted("xboxStore")) {
  console.log("xboxStore — Microsoft DisplayCatalog…");
  const withIds = limit(games.filter((g) => g.links?.xboxProductId));
  try {
    const products = await fetchXboxProducts([...new Set(withIds.map((g) => g.links.xboxProductId))]);
    const stats = await syncEntries(
      "xboxStore",
      withIds,
      async (game) => products.get(game.links.xboxProductId) ?? null,
      { force, maxAgeDays: 0 },
    );
    report("xboxStore", stats);
  } catch (error) {
    console.warn(`  ! xboxStore unavailable, keeping cached data: ${error.message}`);
  }
}

if (wanted("gamePass")) {
  console.log("gamePass — catalog.gamepass.com…");
  try {
    const lists = await fetchGamePassCatalog();
    const stats = await syncEntries(
      "gamePass",
      limit(games.filter((g) => g.links?.xboxProductId)),
      async (game) => {
        const id = game.links.xboxProductId;
        const entry = {
          console: lists.console?.has(id) ?? false,
          pc: lists.pc?.has(id) ?? false,
          eaPlay: lists.eaPlay?.has(id) ?? false,
        };
        return entry.console || entry.pc || entry.eaPlay ? entry : null;
      },
      { force, maxAgeDays: 0 },
    );
    report("gamePass", stats);
  } catch (error) {
    console.warn(`  ! gamePass unavailable, keeping cached data: ${error.message}`);
  }
}

// ── nintendo ──────────────────────────────────────────────────────────────────

if (wanted("nintendoStore")) {
  console.log("nintendoStore — store pages…");
  const withUrls = limit(games.filter((g) => g.links?.nintendoUrl));
  const stats = await syncEntries(
    "nintendoStore",
    withUrls,
    async (game) => fetchNintendoProduct(game.links.nintendoUrl),
    { force, maxAgeDays: 30 },
  );
  report("nintendoStore", stats);

  // Prices move independently of the page, so refresh them every run in one batch.
  const cached = await loadData("nintendoStore");
  const nsuids = [...cached.values()].map((d) => d.nsuid).filter(Boolean);
  if (nsuids.length) {
    try {
      const prices = await fetchNintendoPrices(nsuids);
      const table = await readSource("nintendoStore");
      let updated = 0;
      for (const entry of Object.values(table.entries)) {
        const price = entry.data?.nsuid ? prices.get(entry.data.nsuid) : null;
        if (price) {
          Object.assign(entry.data, price);
          updated++;
        }
      }
      table.syncedAt = new Date().toISOString();
      await writeSource("nintendoStore", table);
      console.log(`  nintendoStore: ${updated} prices refreshed`);
    } catch (error) {
      console.warn(`  ! Nintendo price API unavailable, keeping cached prices: ${error.message}`);
    }
  }
}

// ── playstation ───────────────────────────────────────────────────────────────

if (wanted("playstationStore")) {
  console.log("playstationStore — storefront payload…");

  // The query hashes are tied to a store deploy; say so loudly before a run wastes time.
  try {
    const queries = JSON.parse(await readFile(new URL("../data/playstation-queries.json", import.meta.url), "utf8"));
    const live = await currentBuildId();
    if (live && live !== queries.buildId) {
      console.warn(
        `  ! PlayStation store is on build ${live}, hashes were captured on ${queries.buildId}.` +
          "\n    If prices come back empty, re-capture with `pnpm ps:hashes`.",
      );
    }
  } catch {
    // A failed check is not a reason to skip the sync.
  }

  const withUrls = limit(games.filter((g) => g.links?.playstationUrl));
  const stats = await syncEntries(
    "playstationStore",
    withUrls,
    async (game) => fetchPlaystationProduct(game.links.playstationUrl),
    { force, maxAgeDays: 30 },
  );
  report("playstationStore", stats);

  // Identity is stable; prices are not. Refresh them for everything already identified.
  const table = await readSource("playstationStore");
  let refreshed = 0;
  let priceFailures = 0;
  for (const entry of Object.values(table.entries)) {
    if (!entry.data?.productId && !entry.data?.conceptId) continue;
    try {
      entry.data = await refreshPlaystationPrice(entry.data);
      refreshed++;
    } catch (error) {
      priceFailures++;
      if (priceFailures === 1) console.warn(`  ! ${error.message}`);
    }
  }
  table.syncedAt = new Date().toISOString();
  await writeSource("playstationStore", table);
  console.log(`  playstationStore: ${refreshed} prices refreshed${priceFailures ? `, ${priceFailures} failed` : ""}`);
}

// ── steam ─────────────────────────────────────────────────────────────────────

if (wanted("steamStore")) {
  console.log("steamStore — appdetails…");
  const withApps = limit(
    games
      .map((g) => ({ ...g, appId: appIdFrom(g.links?.steamUrl) }))
      .filter((g) => g.appId),
  );
  try {
    const prices = await fetchSteamPrices([...new Set(withApps.map((g) => g.appId))]);
    const stats = await syncEntries(
      "steamStore",
      withApps,
      async (game) => prices.get(game.appId) ?? null,
      { force, maxAgeDays: 0 },
    );
    report("steamStore", stats);
  } catch (error) {
    console.warn(`  ! steamStore unavailable, keeping cached data: ${error.message}`);
  }
}

// ── howlongtobeat ─────────────────────────────────────────────────────────────

if (wanted("howLongToBeat")) {
  console.log("howLongToBeat — playtimes…");
  const stats = await syncEntries("howLongToBeat", limit(games), async (game) => fetchPlaytimes(game.title), {
    force,
    maxAgeDays: 30,
  });
  report("howLongToBeat", stats);
  if (stats.failed && !stats.ok) {
    console.warn("  ! HowLongToBeat rejected every request — see the note in its adapter.");
  }
}

// ── generate ──────────────────────────────────────────────────────────────────

console.log("\nGenerating src/lib/*.generated.ts…");
await generate();
