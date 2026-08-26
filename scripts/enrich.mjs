/**
 * The frame rate enrichment worker — how FramePatch answers its only real question.
 *
 * There is no API that will tell you whether a game runs at 60 FPS on a PS5, so this builds
 * the answer out of sources that do exist:
 *
 *   PS Store product id  →  PPSA/CUSA title id
 *                        →  PROSPEROPatches / ORBISPatches: was it patched, and to what version
 *                        →  Tavily: what did that patch change, and what do the analyses say
 *                        →  extractor: turn those pages into structured, quoted figures
 *                        →  data/fpsRecords.json  →  src/lib/fps.generated.ts
 *
 * Two properties matter more than coverage:
 *
 *   Nothing is inferred. A title no source documents stays undocumented. "Awaiting
 *   verification" is a correct answer; "30 FPS" guessed from a release year is not.
 *
 *   A patch re-opens a title. The version a tracker reports is stored on the record, so the
 *   next run notices a game that shipped an update and re-verifies only that game.
 *
 * Usage:
 *   pnpm enrich                          top titles by popularity, within the credit budget
 *   pnpm enrich --only=elden-ring        one or more slugs
 *   pnpm enrich --max=25                 cap how many titles are enriched
 *   pnpm enrich --budget=50              cap Tavily credits for this run
 *   pnpm enrich --patches-only           refresh patch detection, spend nothing on search
 *   pnpm enrich --dry-run                print the work list and stop
 *   pnpm enrich --force                  re-verify even titles that are still fresh
 */
import { CURATED_SLUGS } from "../src/lib/frame-data.ts";
import {
  ExtractorAuthError,
  dollarsSpent,
  ensureExtractor,
  extractFps,
  extractorModel,
} from "./adapters/fps-extract.mjs";
import { fetchPatchHistory, titleIdFrom } from "./adapters/ps-patches.mjs";
import {
  SearchAuthError,
  SearchBudgetError,
  creditsSpent,
  hasSearchKey,
  remainingCredits,
  search,
  searchBudgetLeft,
  setSearchBudget,
  siteFilter,
} from "./adapters/web-search.mjs";
import { generate } from "./generate.mjs";
import { pacingState } from "./lib/http.mjs";
import { loadEnv } from "./lib/env.mjs";
import { SEARCH_SITES, classify } from "./lib/evidence.mjs";
import { buildRecord } from "./lib/fps-record.mjs";
import { loadData, readSource, syncEntries } from "./lib/store.mjs";

await loadEnv();

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const patchesOnly = args.includes("--patches-only");
const skipPatches = args.includes("--skip-patches");
const only = flag("only")?.split(",").map((s) => s.trim());
const max = Number(flag("max") ?? 60);
/** Firecrawl bills per search plus per page scraped. A ceiling stops one run eating the month. */
const budget = Number(flag("budget") ?? 1_500);
/** Re-verify a title at most this often unless its patch version moves. */
const maxAgeDays = Number(flag("max-age") ?? 45);
/**
 * Titles in flight at once. Each one runs three searches, so this multiplies by three at the
 * search layer — raise it and watch for 429s in the failed count rather than guessing.
 */
const concurrency = Number(flag("concurrency") ?? 4);

setSearchBudget(budget);

const TODAY = new Date().toISOString().slice(0, 10);

// ── the catalogue ─────────────────────────────────────────────────────────────

const igdb = await readSource("igdb");
const catalogue = Object.values(igdb.entries)
  .map((entry) => entry.data)
  .filter(Boolean)
  .map((record) => ({
    igdbId: record.index.igdbId,
    slug: record.index.slug,
    title: record.index.title,
    releaseDate: record.index.releaseDate,
    consoles: record.index.consoles,
    popularity: record.index.popularity,
    // Who made it, so a page on their own domain ranks as the publisher speaking.
    owners: [record.index.publisher, record.index.developer].filter(Boolean),
  }));

if (catalogue.length === 0) {
  console.error("No cached IGDB catalogue. Run `pnpm sync` first.");
  process.exit(1);
}

/** Hand-curated titles are already answered by a person; spending credits on them is waste. */
const curated = new Set(CURATED_SLUGS);

// ── stage 1: which titles were patched ────────────────────────────────────────

/**
 * The PlayStation title id, from whichever storefront record has a product id. Xbox and
 * Nintendo publish no equivalent patch feed, so those titles are re-verified on age alone.
 */
async function titleIds() {
  const [playstation, crawlora] = await Promise.all([loadData("playstationStore"), loadData("crawlora")]);
  const out = new Map();
  for (const game of catalogue) {
    const productId = playstation.get(game.igdbId)?.productId ?? crawlora.get(game.igdbId)?.productId;
    const titleId = titleIdFrom(productId);
    if (titleId) out.set(game.igdbId, titleId);
  }
  return out;
}

const ids = await titleIds();
console.log(`${catalogue.length} titles in the catalogue · ${ids.size} with a PlayStation title id\n`);

if (!skipPatches) {
  console.log("psPatches — PROSPEROPatches / ORBISPatches…");
  const targets = catalogue.filter((g) => ids.has(g.igdbId));
  const stats = await syncEntries(
    "psPatches",
    targets,
    async (game) => fetchPatchHistory(ids.get(game.igdbId)),
    // Patches land daily; this is the trigger for everything downstream, so keep it warm.
    { force, maxAgeDays: 1 },
  );
  console.log(
    `  ${Object.entries(stats).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to do"}`,
  );
}

const patchTable = await readSource("psPatches");
const patchOf = (igdbId) => patchTable.entries[String(igdbId)]?.data ?? null;

if (patchesOnly) {
  const month = TODAY.slice(0, 7);
  const fresh = Object.values(patchTable.entries).filter((e) => e.data?.latestDate?.startsWith(month));
  console.log(`\n${fresh.length} titles patched this month.`);
  console.log("\nGenerating src/lib/fps.generated.ts…");
  await generate();
  process.exit(0);
}

// ── stage 2: what those patches did ───────────────────────────────────────────

/**
 * Two passes per title: one pinned to the technical-analysis and platform-holder domains, one
 * open. A title with a freshly detected patch gets a third naming the version, which is what
 * surfaces a publisher's patch-notes page rather than a launch review.
 */
function queriesFor(game, patch) {
  const quoted = `"${game.title}"`;
  const consoles = game.consoles
    .map((id) => ({ ps5: "PS5", xsx: "Xbox Series X", switch: "Nintendo Switch 2" })[id])
    .filter(Boolean)
    .join(" ");

  const queries = [
    { query: `${quoted} ${consoles} frame rate 60 FPS performance mode${siteFilter(SEARCH_SITES)}`, limit: 5 },
    { query: `${quoted} ${consoles} performance mode frame rate patch notes`, limit: 6 },
  ];

  if (patch?.latestVersion) {
    queries.push({ query: `${quoted} patch ${patch.latestVersion} update 60 FPS performance`, limit: 4 });
  }
  return queries;
}

/**
 * The changelog the tracker got straight off Sony's update servers. Free, already fetched, and
 * frequently the only place a "performance improvements" line is written down.
 */
function changelogSource(patch) {
  const text = (patch?.patches ?? [])
    .filter((p) => p.changelogPreview)
    .slice(0, 3)
    .map((p) => `Patch ${p.version} (${p.date ?? "date unknown"}): ${p.changelogPreview}`)
    .join("\n\n");
  if (!text) return null;
  return {
    url: patch.url,
    title: `${patch.titleId} patch notes`,
    snippet: text,
    text,
    date: patch.latestDate ?? null,
  };
}

/** De-duplicate by URL, then rank by source tier before the engine's own ordering. */
function rank(results, owners) {
  const byUrl = new Map();
  for (const result of results) {
    if (!result?.url || byUrl.has(result.url)) continue;
    const { publisher, tier } = classify(result.url, owners);
    byUrl.set(result.url, { ...result, publisher, tier });
  }
  return [...byUrl.values()].sort((a, b) => a.tier - b.tier || b.score - a.score).slice(0, 8);
}

async function enrich(game) {
  const patch = patchOf(game.igdbId);

  if (searchBudgetLeft() <= 0) throw new SearchBudgetError("search budget spent");

  // The passes are independent, and Firecrawl spends most of a call scraping server-side, so
  // running them together turns three round trips into roughly one. The per-host pacing in
  // lib/http.mjs still keeps the requests themselves polite.
  const passes = await Promise.all(
    queriesFor(game, patch).map(({ query, limit }) => search(query, { limit })),
  );
  const hits = passes.flat();

  const sources = rank([changelogSource(patch), ...hits].filter(Boolean), game.owners);
  if (sources.length === 0) return null;

  const extraction = await extractFps({
    title: game.title,
    releaseYear: game.releaseDate?.slice(0, 4) ?? null,
    consoles: game.consoles,
    sources,
    patchHint: patch,
  });
  if (!extraction) return null;

  return buildRecord({
    slug: game.slug,
    extraction,
    sources,
    patchHint: patch,
    today: TODAY,
    owners: game.owners,
  });
}

const recordTable = await readSource("fpsRecords");
const recordOf = (igdbId) => recordTable.entries[String(igdbId)];

/** A title whose store patch moved since we last verified it has to be looked at again. */
function patchMoved(existing, game) {
  const latest = patchOf(game.igdbId)?.latestVersion ?? null;
  return Boolean(latest) && existing?.data?.patchSeen !== latest;
}

/**
 * Work order, because the budget truncates the list and popularity alone would bury the one
 * thing this pipeline exists to catch:
 *
 *   0  verified before, and patched since — the frame rate may have just changed
 *   1  never verified
 *   2  everything else, refreshed on age
 */
function priority(game) {
  const existing = recordOf(game.igdbId);
  if (!existing) return 1;
  return patchMoved(existing, game) ? 0 : 2;
}

/**
 * Worst case per title: three passes of 5 + 6 + 4 results, each search costing a credit and
 * each scraped page one more. Rounded up, because running out mid-run is worse than stopping
 * a few titles early.
 */
const CREDITS_PER_TITLE = 20;

const work = catalogue
  .filter((g) => (only ? only.includes(g.slug) : !curated.has(g.slug)))
  .sort((a, b) => priority(a) - priority(b) || b.popularity - a.popularity)
  // Sizing the list to the budget beats discovering it mid-run and leaving a trail of errors.
  .slice(0, Math.min(max, Math.floor(budget / CREDITS_PER_TITLE)));


if (dryRun) {
  const REASON = ["patched since verified", "never verified", "refresh on age"];
  console.log(`\nWould enrich ${work.length} titles, budget ${budget} credits:\n`);
  for (const game of work) {
    const patch = patchOf(game.igdbId);
    console.log(
      `  ${game.slug.padEnd(42)} ${REASON[priority(game)].padEnd(24)} ` +
        `${patch ? `${patch.latestVersion} (${patch.latestDate})` : "no patch data"}`,
    );
  }
  process.exit(0);
}

if (!hasSearchKey()) {
  console.error(
    "\nFIRECRAWL_API_KEY is not set in .env.local — the search layer is what turns a detected\n" +
      "patch into a sourced figure, so enrichment cannot run without it. Patch detection above\n" +
      "still ran and is cached; get a key at https://firecrawl.dev.",
  );
  process.exit(1);
}

// Checked before the first search, so a missing key costs nothing rather than a run's credits.
try {
  ensureExtractor();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}

const balance = await remainingCredits();
console.log(
  `\nfpsRecords — ${work.length} titles · ${extractorModel()} · ${concurrency} at a time · budget ${budget} credits` +
    `${balance === null ? "" : ` of ${balance} left on the plan`}…`,
);

let stats;
try {
  let done = 0;
  stats = await syncEntries("fpsRecords", work, enrich, {
    force,
    maxAgeDays,
    isStale: patchMoved,
    checkpointEvery: 5,
    concurrency,
    onProgress: (s) => {
      const seen = s.ok + s.empty + s.failed;
      if (seen === done) return;
      done = seen;
      process.stdout.write(
        `\r  ${done}/${work.length} · ${s.ok} verified · ${s.empty} nothing found · ${s.failed} failed · ` +
          `${creditsSpent()} credits  `,
      );
    },
  });
  process.stdout.write("\n");
} catch (error) {
  if (error instanceof SearchBudgetError) console.warn(`  ! stopped: ${error.message}`);
  else if (error instanceof SearchAuthError || error instanceof ExtractorAuthError) {
    console.error(`  ! ${error.message}`);
    process.exit(1);
  } else throw error;
}

if (stats) {
  console.log(
    `  ${Object.entries(stats).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to do"}`,
  );
}
console.log(
  `  ${creditsSpent()} search credits and ${dollarsSpent().toFixed(4)} of extraction spent this run`,
);
// A multiplier above 1 means a host pushed back and the client slowed itself down; it is the
// honest record of what rate this run actually sustained.
const pacing = pacingState();
if (Object.keys(pacing).length) console.log(`  pacing settled at`, pacing);

console.log("\nGenerating src/lib/fps.generated.ts…");
await generate();
