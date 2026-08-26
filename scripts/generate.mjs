/**
 * Turns the cached data/ files into the TypeScript the app imports. Runs at the end of
 * `pnpm sync`, or on its own with `pnpm generate` after editing the cache.
 *
 * Output is split deliberately: the index ships to the browser with every list and search,
 * the detail map is server-only. See src/lib/game-detail.ts.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { loadData, readSource, ROOT } from "./lib/store.mjs";

const INDEX_FILE = path.join(ROOT, "src/lib/igdb.generated.ts");
const DETAIL_FILE = path.join(ROOT, "src/lib/igdb-detail.generated.ts");
const FPS_FILE = path.join(ROOT, "src/lib/fps.generated.ts");

const GB = 1024 ** 3;
const toGb = (bytes) => (bytes ? Math.round((bytes / GB) * 10) / 10 : null);

/** Xbox reports console generations as ConsoleGen8/9; the UI wants console names. */
const GEN_LABEL = { ConsoleGen8: "Xbox One", ConsoleGen9: "Xbox Series X|S" };

function xboxOf(record) {
  if (!record) return null;
  return {
    productId: record.productId,
    url: record.url,
    price: record.price,
    msrp: record.msrp,
    onSale: record.onSale,
    currency: record.currency,
    sizeGb: toGb(record.installBytes ?? record.downloadBytes),
    editions: record.editions,
    optimizedFor: (record.optimizedFor ?? []).map((g) => GEN_LABEL[g] ?? g),
    compatibleWith: (record.compatibleWith ?? []).map((g) => GEN_LABEL[g] ?? g),
    capabilities: record.capabilities ?? [],
  };
}

function nintendoOf(record) {
  if (!record) return null;
  const biggest = (record.romSizes ?? []).reduce((max, s) => (s.bytes > (max?.bytes ?? 0) ? s : max), null);
  return {
    nsuid: record.nsuid,
    url: record.url,
    price: record.price,
    regularPrice: record.regularPrice,
    discounted: Boolean(record.discounted),
    currency: record.currency ?? "USD",
    sizeGb: toGb(biggest?.bytes),
    platforms: record.platforms?.length ? record.platforms : record.platform ? [record.platform] : [],
    compatibility: record.compatibility?.caption ?? null,
    editions: record.editions ?? [],
  };
}

function playstationOf(record, crawlora) {
  if (!record && !crawlora) return null;
  record = record ?? {};
  return {
    productId: record.productId,
    conceptId: record.conceptId,
    url: record.url,
    // The store's own GraphQL is refreshed every run, so it wins on price; Crawlora
    // carries the value when the query hashes have gone stale.
    price: record.price ?? crawlora?.price ?? null,
    regularPrice: record.regularPrice ?? crawlora?.regularPrice ?? null,
    discounted: Boolean(record.price != null ? record.discounted : crawlora?.discounted),
    currency: record.currency ?? crawlora?.currency ?? "USD",
    // Only the store's CTAs reveal PS Plus Game Catalog membership.
    plusIncluded: Boolean(record.plusIncluded),
    /** PS4/PS5 split — Crawlora only; no store operation exposes it. */
    platforms: crawlora?.platforms ?? [],
    editions: record.editions?.length ? record.editions : (crawlora?.editions ?? []),
    // Neither source exposes a download size for PlayStation.
    sizeGb: record.downloadBytes ? toGb(record.downloadBytes) : null,
  };
}

function steamOf(record) {
  if (!record) return null;
  return {
    appId: record.appId,
    url: record.url,
    price: record.price ?? null,
    regularPrice: record.regularPrice ?? null,
    discounted: Boolean(record.discounted),
    discountPercent: record.discountPercent ?? 0,
    currency: record.currency ?? "USD",
    sizeGb: null,
  };
}

/** Nintendo console label → the short form used in the availability chips. */
const NINTENDO_LABEL = { "Nintendo Switch": "Switch", "Nintendo Switch 2": "Switch 2" };

/**
 * IGDB's platform list misses consoles that a storefront confirms — 42 titles are sold on
 * Series X|S with IGDB listing only Xbox One. Where a platform's own catalogue names a
 * console, it wins.
 */
function mergeAvailability(igdbList, xbox, nintendo, playstation) {
  const merged = new Set(igdbList);
  for (const platform of playstation?.platforms ?? []) merged.add(platform);
  for (const gen of xbox?.compatibleWith ?? []) merged.add(GEN_LABEL[gen] ?? gen);
  for (const gen of xbox?.optimizedFor ?? []) merged.add(GEN_LABEL[gen] ?? gen);
  for (const platform of nintendo?.platforms ?? []) {
    merged.add(NINTENDO_LABEL[platform] ?? platform);
  }
  return [...merged];
}

function render(header, imports, body) {
  return `${header}${imports}\n\n${body}\n`;
}

/**
 * The enrichment worker's output, keyed by slug so src/lib/fps.ts can join it against the
 * hand-curated entries. Records that established nothing are dropped rather than shipped as
 * empty rows — a title with no verified figure is simply absent, and renders as awaiting
 * verification.
 */
async function writeFpsRecords() {
  const table = await readSource("fpsRecords");
  const records = Object.values(table.entries)
    .map((entry) => entry.data)
    .filter((record) => record?.slug && (record.entries.length > 0 || record.patches.length > 0))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const verified = records.filter((r) => r.entries.some((e) => e.fps > 0)).length;
  const syncedAt = table.syncedAt ? table.syncedAt.slice(0, 10) : null;

  await writeFile(
    FPS_FILE,
    render(
      `// GENERATED by \`pnpm enrich\` — do not edit by hand.\n` +
        `// ${records.length} records, ${verified} with a verified figure. Curated entries in\n` +
        `// ./frame-data.ts outrank anything here; see ./fps.ts for the join.\n`,
      `import type { FpsRecord } from "./types";\n\nexport const ENRICHED_AT: string | null = ${JSON.stringify(syncedAt)};`,
      `export const ENRICHED_FPS: Record<string, FpsRecord> = {${records
        .map((record) => `\n  ${JSON.stringify(record.slug)}: ${JSON.stringify(record)},`)
        .join("")}\n};`,
    ),
  );

  return { count: records.length, verified };
}

export async function generate() {
  const igdb = await readSource("igdb");
  const records = Object.values(igdb.entries).map((e) => e.data).filter(Boolean);
  if (records.length === 0) throw new Error("data/igdb.json is empty — run `pnpm sync` first");

  const [xbox, gamePass, nintendo, playstation, hltb, steam, crawlora] = await Promise.all([
    loadData("xboxStore"),
    loadData("gamePass"),
    loadData("nintendoStore"),
    loadData("playstationStore"),
    loadData("howLongToBeat"),
    loadData("steamStore"),
    loadData("crawlora"),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  const sources = [
    `IGDB ${records.length}`,
    `Xbox ${xbox.size}`,
    `Game Pass ${gamePass.size}`,
    `Nintendo ${nintendo.size}`,
    `PlayStation ${playstation.size}`,
    `Steam ${steam.size}`,
    `Crawlora ${crawlora.size}`,
    `HLTB ${hltb.size}`,
  ].join(" · ");

  const head = (note) =>
    `// GENERATED by \`pnpm sync\` on ${date} — do not edit by hand.\n` +
    `// ${sources}\n// ${note}\n`;

  const index = [];
  const detail = [];

  for (const record of records.sort((a, b) => b.index.popularity - a.index.popularity)) {
    const id = record.index.igdbId;
    const pass = gamePass.get(id);
    index.push({ ...record.index, gamePass: pass ? (pass.console ? "console" : "pc") : null });

    const xboxListing = xboxOf(xbox.get(id));
    const nintendoListing = nintendoOf(nintendo.get(id));
    const store = {
      xbox: xboxListing,
      nintendo: nintendoListing,
      playstation: playstationOf(playstation.get(id), crawlora.get(id)),
      steam: steamOf(steam.get(id)),
      gamePassTiers: pass ?? null,
      playtime: hltb.get(id) ?? null,
    };
    detail.push([
      record.index.slug,
      {
        ...record.detail,
        availability: mergeAvailability(
          record.detail.availability,
          xboxListing,
          nintendoListing,
          store.playstation,
        ),
        ...store,
      },
    ]);
  }

  await writeFile(
    INDEX_FILE,
    render(
      head("List index — shipped to the browser. Frame rates live in ./frame-data.ts."),
      'import type { IgdbGame } from "./types";\n\nexport const DATA_SYNCED_AT = "' + date + '";',
      `export const IGDB_GAMES: IgdbGame[] = [\n${index
        .map((r) => JSON.stringify(r, null, 2).split("\n").map((l) => `  ${l}`).join("\n"))
        .join(",\n")},\n];`,
    ),
  );

  await writeFile(
    DETAIL_FILE,
    render(
      head("Long-form fields and storefront data. Import from server components only."),
      'import type { GameDetailData } from "./types";',
      `export const IGDB_DETAILS: Record<string, GameDetailData> = {\n${detail
        .map(([slug, value]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(value)}`)
        .join(",\n")},\n};`,
    ),
  );

  const fps = await writeFpsRecords();
  console.log(`  wrote ${index.length} titles — ${sources}`);
  console.log(`  wrote ${fps.count} frame rate records — ${fps.verified} with a verified figure`);
}

// Allow `node scripts/generate.mjs` on its own.
if (import.meta.url === `file://${process.argv[1]}`) await generate();
