# FramePatch

Frame rate performance verification for console libraries — search a game, get a
straight answer about whether it runs at 30, 40, 60 or 120 FPS on your console.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4 with shadcn/ui (`radix-nova` preset, Radix primitives)
- Game metadata from [IGDB](https://www.igdb.com) via the Twitch API
- `next-themes` for light/dark, Outfit for type, `sonner` for toasts

## Running it

```bash
pnpm install
pnpm dev
```

## Where the data comes from

IGDB is the canonical game database and the join key everywhere is the **IGDB game id**.
Every other source only enriches an existing IGDB record — no adapter may introduce a game
IGDB does not have.

| Source | Supplies | Auth |
| --- | --- | --- |
| **IGDB** | title, cover, screenshots, trailer, companies, genres, ESRB, critic score, popularity, per-platform release dates, alternative names, similar games, storefront ids | Twitch client id/secret |
| **Xbox** (`displaycatalog.mp.microsoft.com`) | price, sale price, download size, editions, Series X\|S / One compatibility, 4K/HDR/VRR capabilities | none |
| **Game Pass** (`catalog.gamepass.com`) | console / PC / EA Play availability | none |
| **Nintendo** (store page + `api.ec.nintendo.com`) | price, sale price, NSUID, rom size, Switch vs Switch 2, compatibility note, editions | none |
| **PlayStation** (storefront payload + store GraphQL) | price, sale price, PS Plus Game Catalog membership, editions, product id, concept id, store URL | none |
| **Steam** (`appdetails`) | price, sale price, discount percent | none |
| **Crawlora** (`api.crawlora.net`) | PS4/PS5 split, editions, PlayStation price fallback | API key |
| **HowLongToBeat** | main / main+extra / completionist times | none |
| **PROSPEROPatches** | PS5 patch versions and dates, per title id | none |
| **ORBISPatches** | PS4 patch versions, dates, and short changelogs | none |
| **Firecrawl** | web discovery: searches and scrapes in one call, returning pages as markdown | API key |
| **OpenRouter** | the extractor model that turns those pages into structured, quoted figures | API key |
| **FramePatch** | the frame rate record itself — per console model, modes, patches, evidence | — |

Download sizes come from the storefronts, never from us — the previously hand-entered
`fileSizeGb` values were sample data and have been removed.

FramePatch's own record stays the source of truth for everything frame-rate related: FPS
targets per console model, quality/performance modes, patch version and date, performance
notes and the URLs each figure was read from. It is assembled by `pnpm enrich` — see
**How a frame rate gets verified** below — and hand-written entries always outrank it.

Coverage from the last sync, out of 769 titles: Xbox 519, Game Pass 126, Nintendo 441,
PlayStation 617, Steam 623, HowLongToBeat 0.

Patch detection resolves a PlayStation title id for 598 of them and finds a patch history for
**534** — 303 on PROSPEROPatches, 231 on ORBISPatches — of which 173 shipped an update in 2026
and 223 carry changelog text the trackers expose for free.

Verification has covered the 723 titles with no hand-written entry and produced **248 verified
titles / 487 console-model rows**: 21 established by an official source, 94 by independent
measurement, 133 by press. It found **30 patches that changed a frame rate**, including
Assassin's Creed Unity's 1.6 update, sourced to Ubisoft's own page.

The remaining titles came back with nothing established and render as "awaiting verification".
That share grows as the catalogue reaches past the popular tail — roughly 46% of well-known
titles verify, against 18% of the obscure ones — because obscure games genuinely have no
published frame rate figures, and inventing one is the failure this pipeline exists to avoid.

Platform availability is a merge, not a copy. IGDB's platform list misses consoles a
storefront confirms — 42 titles are sold on Series X\|S with IGDB listing only Xbox One —
so where a platform's own catalogue names a console, it wins. Xbox contributes through
`XboxConsoleGenCompatible`, Nintendo through its `platforms` field, and PlayStation through
Crawlora's `platforms`.

### Why PlayStation has two adapters

`playstationStore` talks to the store's own GraphQL endpoint: free, refreshed every run,
and the only source for PS Plus Game Catalog membership — but it needs persisted-query
hashes that rotate on every store deploy, and it exposes no PS4/PS5 split.

`crawlora` is a managed scraping API that needs no hashes and returns `platforms`
outright, which closes the last gap in platform availability. It is metered, so it is used
sparingly: platforms and editions barely change, so they are cached for 30 days while the
free GraphQL pass keeps prices current. Crawlora's price is kept as the fallback for when
the hashes go stale.

Observed limits on this plan: **2 credits per call, 500/day, 2000 total, ~5 calls a
minute** — so a full PlayStation pass is ~320 credits and takes about half an hour. That
pacing is deliberate; do not lower `GAP_MS` in the adapter.

Two alternatives were tested and rejected:

- **Chihiro** (`store/api/chihiro/…`, the legacy PS Store REST API) is still up and needs
  no auth, but reports list prices and misses every active discount — six of six sale
  titles came back at full price — knows only 129 of our 159 products, and its
  `playable_platform` is per-SKU, so Ghost of Tsushima Director's Cut reads as PS4-only.
- **RAWG, PlatPrices, NTPrices** and anything requiring manual approval are out of scope.

### Known ceilings

- **PlayStation query hashes rotate.** The store's GraphQL endpoint allowlists persisted
  query hashes server-side, and the client computes them at runtime rather than shipping
  them, so a hash cannot be derived offline — reproducing one from the query text in the
  bundle does not match, with or without Apollo's `__typename` injection. The four hashes
  we need live in `data/playstation-queries.json`, captured from the store's own requests,
  alongside the `buildId` they came from. A sync compares that against the live build and
  warns before the run; `pnpm ps:hashes` checks staleness and prints the capture steps.
  Requests also need an `apollo-require-preflight` header or the endpoint refuses them as
  CSRF. Download size is not exposed by any operation, and the PS4/PS5 split comes from
  Crawlora rather than the store itself.

  Note the price lives on the right CTA, not the first one: a title in the PS Plus Game
  Catalog leads with an upsell CTA quoting `discountedValue: 0`, which reads as free. The
  adapter picks the applicable, non-free, priced CTA and treats the upsell as the PS Plus
  flag instead.
- **HowLongToBeat** — both npm wrappers (`howlongtobeat`, `hltb`) were last published in
  2022-23 and throw against the current site. HLTB now gates `/api/search/site` behind a
  session token plus an `x-hp-key`/`x-hp-val` fingerprint; requests without it get 403
  "invalid fingerprint", and requests with a valid token but a non-browser client get an
  HTML 404. The adapter implements the real flow and fails gracefully — `data/howLongToBeat.json`
  records the rejection per game and the site renders without playtimes — so times populate
  with no further work if that check relaxes.

### Syncing

```bash
pnpm sync                        # every source, then regenerate
pnpm sync --only=nintendoStore   # one adapter
pnpm sync --skip=howLongToBeat   # leave one out
pnpm sync --force                # refetch entries that are still fresh
pnpm enrich                      # verify frame rates (see below)
pnpm enrich:patches              # detect PlayStation patches only, no credits spent
pnpm generate                    # regenerate from the cache without fetching
```

IGDB needs `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env.local` (gitignored) from
<https://dev.twitch.tv/console/apps>, and Crawlora needs `CRAWLORA_API_KEY`. `pnpm enrich`
needs `FIRECRAWL_API_KEY` and `OPENROUTER_API_KEY`, both checked before a single credit is
spent; without them patch detection still runs and caches, and nothing else in the sync is
affected. Every other source needs no credentials.

### The cache is the source of truth

`data/<source>.json` holds one entry per IGDB id with a `fetchedAt` stamp, and it is
committed. A sync **merges** into it:

- a game that succeeds is replaced;
- a game that returns nothing records `data: null` so it is not retried every run;
- a game that throws keeps its previous `data` and records `lastError`.

So a storefront that changes shape or goes down degrades that field for that game and
nothing else — the remaining sources still run, the build still succeeds, and the site
serves the last values that synced. Nothing is fetched during a page request: the app
imports only the generated TypeScript.

Page fetches are cached for 30 days; prices refresh on every run (Xbox in batches of 20,
Nintendo through one batched price call across all NSUIDs).

## How a frame rate gets verified

This is the part of FramePatch that does not exist anywhere else, so it is worth reading.

There is no API that answers "does this run at 60 FPS on a PS5". The answer is assembled:

```
PS Store product id      UP0700-PPSA04609_00-ELDENRING0000000
        ↓                parse the PlayStation title id
PPSA04609 / CUSA01633
        ↓                PROSPEROPatches (PS5) · ORBISPatches (PS4)
was it patched, to what version, on what date
        ↓                Firecrawl — one search pinned to trusted domains, one open,
                         one naming the new patch version; each result scraped to markdown
candidate pages, already readable
        ↓                extractor on OpenRouter: strict JSON schema, every figure quoted
data/fpsRecords.json  →  src/lib/fps.generated.ts  →  the site
```

### Nothing is inferred

A title no source documents stays undocumented. "Awaiting verification" is a correct answer;
"30 FPS" guessed from a release year is not. A PS5 game with no 60 FPS source might be 30, 40,
unlocked 30-60, dynamic, 120, or simply undocumented — so the pipeline refuses to pick.

The rule is enforced in three places, not one:

- the extractor is told to report only what a page states, and to emit nothing for a console
  model no source names — and to ignore mods, jailbroken consoles, emulators and PC builds,
  which sources discuss constantly;
- `scripts/lib/fps-record.mjs` drops any mode without a verbatim quote, and any quote citing a
  URL that was never supplied to the model;
- confidence is capped at what the sources can support, so a figure resting only on forum posts
  comes back `unknown` and never reaches the site.

A figure is also never carried across console models. "60 FPS on PS5" says nothing about PS5
Pro, and the record has a row per model precisely so it cannot pretend otherwise.

The retail-only rule earned its place on the first live run: asked about Red Dead Redemption 2,
the extractor correctly found Digital Foundry's locked 30 FPS *and* a 60 FPS unlock mod for
exploited consoles, and the best-of-modes rule turned that into a 60 FPS headline. A deny-list
in `fps-record.mjs` now drops any mode whose name, note or quote mentions mods, jailbreaks,
homebrew, emulation or custom firmware, so the page reads 30 FPS again.

### Source ranking

Every URL is classified in `scripts/lib/evidence.mjs`, and the tier caps how strong a claim
resting on it may be:

| Tier | Source | Best confidence |
| --- | --- | --- |
| 1 | Publisher / developer patch notes | `official` |
| 2 | PlayStation Blog, Xbox Wire, Nintendo, and the changelogs the patch trackers pull off Sony's update servers | `official` |
| 3 | Digital Foundry, Eurogamer | `measured` |
| 4 | VG Tech, NX Gamer, El Analista De Bits, Backwards-Compatible, PSFoundry | `measured` |
| 5 | Push Square, IGN, GameSpot and other press | `reported` |
| 6 | Reddit, ResetEra, YouTube, anything unrecognised | `unknown` — never on its own |

The first search of each pass is pinned to a short list of tier 2-5 domains with `site:`
operators — the technical-analysis outlets a plain query will not reliably surface. The open
pass finds publisher pages on its own; it returns Ubisoft's own 60 FPS article for AC Unity as
the third result.

Two rules keep the table honest without having to list every studio on the internet:

- **A game's own publisher is tier 1 wherever it speaks.** IGDB already tells us who made the
  game, so `epicgames.com` on a Fortnite page resolves to tier 1 with no table entry.
- **An unrecognised domain is tier 5, not tier 6.** Treating the unknown as community-grade
  threw away figures from smaller outlets entirely. The actual community sites are listed
  explicitly, so they still cannot carry a figure alone.

### A patch re-opens a title

The version a tracker reports is stored on the record as `patchSeen`. The next run compares it
against the live latest version and re-verifies only the titles that moved — that is the
`isStale` hook on `syncEntries`. So a game that ships a 60 FPS patch on a Tuesday is picked up
on the next run without re-verifying the other 200 titles, and the homepage's "recently
upgraded" rail fills itself.

Xbox and Nintendo publish no equivalent patch feed, so titles on those consoles are re-verified
on age alone (`--max-age`, 45 days by default).

### What it costs

Measured over live runs: **~11 Firecrawl credits and ~$0.002 of extraction per title**
(`openai/gpt-5.6-luna` — 1M context, strict structured outputs, and cheap enough that the
search layer is the only meaningful cost). A run is capped at **1,500 credits by default** —
raise it with `--budget`. Hand-curated titles are skipped outright, because a person already
answered them.

The model is a config line, not a rewrite — set `FRAMEPATCH_EXTRACT_MODEL` to any OpenRouter
id that supports strict structured outputs.

A long pass checkpoints every five titles, so an interrupted run keeps what it verified.

### The rate limit is the ceiling, not the credit balance

Firecrawl scrapes every result it returns, and **each scraped page counts against the
requests-per-minute limit**, not just the search itself. At ~11 pages per title against a
57/min plan limit, the arithmetic is fixed:

    ~11 units per title ÷ 57 units per minute = ~5 titles per minute, at best

So a full pass over 700 titles takes hours no matter how it is parallelised, and raising
concurrency changes nothing — with the pacing in `lib/http.mjs` reserving send slots, the
request *rate* is set by the gap alone. Two things follow, both learned the expensive way:

- **Ask for only what you read.** `rank()` keeps eight sources and the extractor caps at
  eight, so requesting fifteen bought seven scrapes per title that nothing ever read. The
  limits are now 4 + 4 + 3.
- **Let the client find the real limit.** The published number and the enforced one differ, a
  burst leaves an account in a cooldown far longer than the window suggests, and a 429 absorbed
  by a retry never shows up as a failure. `lib/http.mjs` widens its own gap by 1.6× per 429
  and eases back after 25 clean requests, and a run prints where pacing settled.

```bash
pnpm enrich                     # top titles by popularity, within the credit budget
pnpm enrich --only=elden-ring   # one or more slugs
pnpm enrich --max=25            # cap how many titles are enriched
pnpm enrich --budget=500        # cap Firecrawl credits for this run
pnpm enrich --patches-only      # refresh patch detection only, spend nothing
pnpm enrich --skip-patches      # go straight to verification with cached patch data
pnpm enrich --dry-run           # print the work list and stop (needs no keys)
pnpm enrich --force             # re-verify even titles that are still fresh
```

Work is ordered by what actually changed, because the budget truncates the list: titles
verified before and patched since come first, then titles never verified, then everything else
on age.

### Known ceilings on the patch trackers

Both sites load their patch list over XHR: the title page carries a per-title key, and
`POST /api/internal/loadpatches` returns the versions. Full changelog text sits behind
`/changelogs`, which is reCAPTCHA-gated — we do not touch it, and the pipeline gets patch-note
content from the search layer instead. ORBISPatches returns a short `changelog_preview` for
free, and that *is* used, because the text is the publisher's own.

An unknown title id serves HTTP 200 with a 404 body, so the adapter treats a missing patch
container as "not in the database" and a container without a key as "the markup moved" — the
second throws loudly, because a silent miss would disable patch detection for every title.

### Adding a frame rate by hand

A hand-written entry always wins over the worker's, and is never overwritten by it. Add one to
`FRAME_DATA` in `src/lib/frame-data.ts`, keyed by IGDB slug:

```ts
"cyberpunk-2077": {
  fps: { ps5: [60, 60], xsx: [60, 30], switch: [40, 30] },   // [flagship model, secondary]
  modes: { ps5: ["Performance mode", "Ray tracing performance"] },
  native: ["ps5", "xsx", "switch"],
  verdict: "Native current-gen build. Performance mode targets 60 FPS…",
},
```

Backwards-compatible titles are listed on IGDB under their original platform — Bloodborne
is "PS4" — so curated `fps` keys *add* consoles IGDB does not know about. IGDB's own
platform list still counts, which is how a game can be listed on a console with no verified
figure.

`src/lib/fps.ts` lifts these entries into the same `FpsRecord` shape the worker produces, so
the app only ever reads one type and never has to know which source answered.

### The generated split

`igdb.generated.ts` is the lean list index that ships to the browser — only what lists,
search and ranking need. `igdb-detail.generated.ts` holds summaries, screenshots and all
storefront data, and is reachable only through `src/lib/game-detail.ts`, which is marked
`server-only`. Merging the two would put several hundred KB of unused data in every page
load.

## Layout

```
scripts/sync.mjs          orchestrator: refresh every source, then generate
scripts/enrich.mjs        the frame rate worker: patches → search → extract → record
scripts/generate.mjs      data/*.json → src/lib/*.generated.ts
scripts/adapters/         igdb, xboxStore, gamePass, nintendoStore, playstationStore,
                          crawlora, steamStore, howLongToBeat, ps-patches,
                          web-search (Firecrawl), fps-extract (OpenRouter)
scripts/lib/              http (retry, pacing), store (the data/ cache), env,
                          evidence (source ranking), fps-record (verification rules)
data/                     the committed cache, one file per source
src/lib/types.ts          Domain types + the console/model map
src/lib/frame-data.ts     Hand-written frame rates, keyed by IGDB slug
src/lib/fps.generated.ts  The worker's records, written by `pnpm enrich`
src/lib/fps.ts            The precedence join: curated beats enriched
src/lib/games.ts          The IGDB join, plus every query helper (search, filters, rails)
src/lib/game-detail.ts    server-only join with the long-form IGDB fields
src/components/           Feature components; ui/ holds the shadcn primitives
src/app/                  /, /browse, /patches, /submit, /games/[slug]
```

### Console selection

The selected console is not a route — it lives in `localStorage` and is read through
`useSyncExternalStore` in `platform-provider.tsx`, so every list and verdict re-derives
instantly when it changes, and the choice survives reloads.

### Design notes

- 8px radius throughout (`--radius: 0.5rem`); cards, buttons and inputs all match.
- No decorative gradients anywhere, including hover states.
- Frame rates use a semantic colour scale (`--fps-high/good/mid/low`) defined for both
  themes rather than raw Tailwind colours.
