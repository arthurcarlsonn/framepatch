export type PlatformId = "ps5" | "xsx" | "switch";

export type AppType = "native" | "backcompat";

/** Every console model FramePatch reports a figure for. Flagship first within a platform. */
export type ConsoleModelId = "ps5" | "ps5-pro" | "series-x" | "series-s" | "switch-2" | "switch";

/**
 * How well established a figure is.
 *
 * `unknown` is a real answer and the default: a PS5 game with no source stating a frame rate
 * is not 30 FPS, it is undocumented. Nothing in the pipeline may infer one.
 */
export type FpsConfidence = "official" | "measured" | "reported" | "unknown";

/** A source behind a figure, ranked so a publisher's own patch notes outrank a forum post. */
export type Evidence = {
  url: string;
  title: string | null;
  /** The outlet, not the domain — "Ubisoft", "PlayStation Blog", "Digital Foundry". */
  publisher: string | null;
  /** 1 publisher · 2 platform holder · 3 Digital Foundry · 4 capture channels · 5 press · 6 community. */
  tier: number;
  date: string | null;
  /** The sentence that establishes the figure, quoted so a reader can check it. */
  quote: string | null;
};

/** One selectable graphics mode on one console model. */
export type FpsMode = {
  name: string;
  /** `null` when a source names the mode but never states its target. Never guessed. */
  targetFps: number | null;
  resolution: string | null;
  /** Uncapped rather than locked — the figure is a ceiling, not a floor. */
  unlocked: boolean;
  vrr: boolean;
  note: string | null;
};

/** Per-console-model frame rate entry shown in the "Frame rate by console model" table. */
export type ConsoleTarget = {
  model: string;
  modelId: ConsoleModelId;
  platform: PlatformId;
  /** Best target across this model's modes. `0` means FramePatch has no verified figure. */
  fps: number;
  /** Headline mode name — e.g. "Performance mode", "Quality mode capped". */
  mode?: string;
  /** Every mode a source documented, in the order the source lists them. */
  modes: FpsMode[];
  appType: AppType | "unknown";
  confidence: FpsConfidence;
  /** Primary model for the platform — drives the headline verdict. */
  primary?: boolean;
};

/** A store patch FramePatch has tied to a frame rate change. */
export type FpsPatch = {
  version: string | null;
  /** ISO date — sortable, unlike the "Aug 2026" labels the UI renders. */
  date: string | null;
  /** PPSA/CUSA title id the patch was detected on, when a patch tracker found it. */
  titleId: string | null;
  previousFps: number | null;
  newFps: number | null;
  changedFps: boolean;
  /** Human line: "30 FPS to 60 FPS via performance mode patch". */
  label: string;
  /** Official patch notes, when one was found. */
  url: string | null;
  publisher: string | null;
};

export type PatchEvent = {
  date: string;
  label: string;
  url?: string | null;
};

/**
 * FramePatch's frame rate answer for one title: one entry per console model, the patches that
 * changed it, and the sources each figure rests on. Written either by hand in ./frame-data.ts
 * or by `pnpm enrich`, never by both — see ./fps.ts.
 */
export type FpsRecord = {
  slug: string;
  entries: ConsoleTarget[];
  patches: FpsPatch[];
  verdict: string | null;
  note: string | null;
  requested: boolean;
  confidence: FpsConfidence;
  /** ISO date of the last pass that confirmed these figures. */
  lastVerified: string | null;
  evidence: Evidence[];
  /** Hand-curated records outrank the worker's; this says which wrote it. */
  origin: "curated" | "enriched";
  /** Latest store patch version seen when this was written — the re-enrichment trigger. */
  patchSeen?: string | null;
};


/**
 * The list-level record for one title, written by `pnpm igdb:sync`. Every game in the
 * catalogue is in the browser bundle, so this stays small — long-form fields live in
 * IgdbDetail and are only read on a game page.
 */
export type IgdbGame = {
  igdbId: number;
  slug: string;
  title: string;
  releaseDate: string | null;
  cover: { imageId: string } | null;
  publisher: string | null;
  developer: string | null;
  genres: string[];
  franchise: string | null;
  esrb: string | null;
  /** Critic score, 0-100. Aggregated critic rating where IGDB has one, else the user rating. */
  score: number | null;
  ratingCount: number;
  /** IGDB "Playing" count, scaled to an integer. Ranks lists better than ratingCount. */
  popularity: number;
  /** Regional and localised titles, so search matches them too. */
  altNames: string[];
  /** Set when the title is in the Game Pass catalogue, so cards can badge it. */
  gamePass: "console" | "pc" | null;
  consoles: PlatformId[];
};

/** Storefront enrichment. Every field is optional — a source that is down leaves nulls. */
export type StoreListing = {
  productId?: string | null;
  url: string;
  price: number | null;
  currency?: string;
  sizeGb: number | null;
};

export type XboxListing = StoreListing & {
  msrp: number | null;
  onSale: boolean;
  editions: string[];
  optimizedFor: string[];
  compatibleWith: string[];
  capabilities: string[];
};

export type NintendoListing = StoreListing & {
  nsuid: string;
  regularPrice: number | null;
  discounted: boolean;
  platforms: string[];
  /** Nintendo's own wording for how the title behaves on Switch 2. */
  compatibility: string | null;
  editions: string[];
};

export type PlaystationListing = StoreListing & {
  conceptId: string | null;
  regularPrice: number | null;
  discounted: boolean;
  /** Included in the PS Plus Game Catalog — Sony's equivalent of Game Pass. */
  plusIncluded: boolean;
  /** PS4 / PS5 split. Only Crawlora exposes this; the store's own API does not. */
  platforms: string[];
  editions: string[];
};

export type SteamListing = StoreListing & {
  appId: string;
  regularPrice: number | null;
  discounted: boolean;
  discountPercent: number;
};

export type Playtime = {
  id: number | null;
  name: string | null;
  url: string | null;
  main: number | null;
  mainExtra: number | null;
  completionist: number | null;
};

/** Fields only a single game page needs. Loaded server-side and passed down as props. */
export type IgdbDetail = {
  summary: string | null;
  themes: string[];
  gameModes: string[];
  availability: string[];
  stores: { label: string; url: string }[];
  /** Screenshot and artwork image ids, screenshots first. */
  media: string[];
  trailer: { id: string; name: string } | null;
  releaseDates: { platform: string; date: string }[];
  /** IGDB records these per platform and coverage is patchy — null for most single-player titles. */
  multiplayer: {
    onlineMax: number | null;
    onlineCoopMax: number | null;
    offlineCoopMax: number | null;
    splitscreen: boolean;
    campaignCoop: boolean;
  } | null;
  engines: string[];
  perspectives: string[];
  /** IGDB's own related titles, narrowed to slugs in this catalogue. */
  similar: string[];
};

/** What a game page gets: IGDB long-form fields plus every storefront that had a match. */
export type GameDetailData = IgdbDetail & {
  xbox: XboxListing | null;
  nintendo: NintendoListing | null;
  playstation: PlaystationListing | null;
  steam: SteamListing | null;
  gamePassTiers: { console: boolean; pc: boolean; eaPlay: boolean } | null;
  playtime: Playtime | null;
};

export type Game = IgdbGame & {
  /** Consoles FramePatch lists this on — curated frame data wins over IGDB's platform list. */
  consoles: PlatformId[];
  /** True when curated frame rate data exists; false means "awaiting verification". */
  verified: boolean;
  appType: Partial<Record<PlatformId, AppType>>;
  targets: ConsoleTarget[];
  /** FramePatch's frame rate explanation, distinct from IGDB's `summary`. */
  verdict: string | null;
  patch?: { type: string; date: string; verified: string; source: string; url?: string | null };
  /** ISO date of the frame-rate-changing patch — what the "recently upgraded" rails sort on. */
  patchIso?: string | null;
  previousFps?: number;
  note?: string;
  requested?: boolean;
  history: PatchEvent[];
  /** Strongest confidence across this title's console models. */
  confidence: FpsConfidence;
  evidence: Evidence[];
  lastVerified: string | null;
};

/** A game plus the long-form IGDB fields — only ever built on a game page. */
export type FullGame = Game & GameDetailData;

export const PLATFORMS: {
  id: PlatformId;
  name: string;
  short: string;
  /** Flagship first — index 0 is the model the headline verdict quotes. */
  models: { id: ConsoleModelId; name: string }[];
}[] = [
  {
    id: "ps5",
    name: "PlayStation 5",
    short: "PS5",
    models: [
      { id: "ps5", name: "PlayStation 5" },
      { id: "ps5-pro", name: "PlayStation 5 Pro" },
    ],
  },
  {
    id: "xsx",
    name: "Xbox Series X",
    short: "Xbox Series X",
    models: [
      { id: "series-x", name: "Xbox Series X" },
      { id: "series-s", name: "Xbox Series S" },
    ],
  },
  {
    id: "switch",
    name: "Nintendo Switch",
    short: "Nintendo Switch",
    models: [
      { id: "switch-2", name: "Nintendo Switch 2" },
      { id: "switch", name: "Nintendo Switch" },
    ],
  },
];

/** Console model → the platform it is grouped under. */
export const PLATFORM_OF_MODEL: Record<ConsoleModelId, PlatformId> = {
  ps5: "ps5",
  "ps5-pro": "ps5",
  "series-x": "xsx",
  "series-s": "xsx",
  "switch-2": "switch",
  switch: "switch",
};

export const CONSOLE_MODEL_NAME: Record<ConsoleModelId, string> = {
  ps5: "PlayStation 5",
  "ps5-pro": "PlayStation 5 Pro",
  "series-x": "Xbox Series X",
  "series-s": "Xbox Series S",
  "switch-2": "Nintendo Switch 2",
  switch: "Nintendo Switch",
};

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  ps5: "PS5",
  xsx: "Xbox Series X",
  switch: "Nintendo Switch",
};
