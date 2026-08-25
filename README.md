# FrameCheck

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
| **HowLongToBeat** | main / main+extra / completionist times | none |
| **FrameCheck** | frame rate per console model, modes, patch history, verification source | — |

Download sizes come from the storefronts, never from us — the previously hand-entered
`fileSizeGb` values were sample data and have been removed.

FrameCheck's own database stays the source of truth for everything frame-rate related:
FPS targets, console model, quality/performance modes, patch version and date, performance
notes and verification URLs. No external source is consulted for any of it.

Coverage from the last sync, out of 208 titles: Xbox 146, Game Pass 56, Nintendo 101,
PlayStation 161, Steam 162, HowLongToBeat 0. 184 titles have a price on at least one store.

Platform availability is a merge, not a copy. IGDB's platform list misses consoles a
storefront confirms — 42 titles are sold on Series X\|S with IGDB listing only Xbox One —
so where a platform's own catalogue names a console, it wins. PlayStation exposes no
PS4/PS5 split on any of its operations, so that side stays IGDB-sourced.

### Known ceilings

- **PlayStation query hashes rotate.** The store's GraphQL endpoint allowlists persisted
  query hashes server-side, and the client computes them at runtime rather than shipping
  them, so a hash cannot be derived offline — reproducing one from the query text in the
  bundle does not match, with or without Apollo's `__typename` injection. The four hashes
  we need live in `data/playstation-queries.json`, captured from the store's own requests,
  alongside the `buildId` they came from. A sync compares that against the live build and
  warns before the run; `pnpm ps:hashes` checks staleness and prints the capture steps.
  Requests also need an `apollo-require-preflight` header or the endpoint refuses them as
  CSRF. Download size and the PS4/PS5 split are not exposed by any operation.

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
pnpm generate                    # regenerate from the cache without fetching
```

IGDB needs `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env.local` (gitignored) from
<https://dev.twitch.tv/console/apps>. Nothing else needs credentials.

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

### Adding a frame rate

Add an entry to `FRAME_DATA` in `src/lib/frame-data.ts`, keyed by IGDB slug:

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

### The generated split

`igdb.generated.ts` is the lean list index that ships to the browser — only what lists,
search and ranking need. `igdb-detail.generated.ts` holds summaries, screenshots and all
storefront data, and is reachable only through `src/lib/game-detail.ts`, which is marked
`server-only`. Merging the two would put several hundred KB of unused data in every page
load.

## Layout

```
scripts/sync.mjs        orchestrator: refresh every source, then generate
scripts/generate.mjs    data/*.json → src/lib/*.generated.ts
scripts/adapters/       igdb, xboxStore, gamePass, nintendoStore, playstationStore, howLongToBeat
scripts/lib/            http (retry, pacing) and store (the data/ cache)
data/                   the committed cache, one file per source
src/lib/types.ts        Domain types + the console/model map
src/lib/frame-data.ts   Curated frame rates, keyed by IGDB slug
src/lib/games.ts        The join, plus every query helper (search, filters, rails)
src/lib/game-detail.ts  server-only join with the long-form IGDB fields
src/components/         Feature components; ui/ holds the shadcn primitives
src/app/                /, /browse, /patches, /submit, /games/[slug]
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
