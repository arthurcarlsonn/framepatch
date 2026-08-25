export type PlatformId = "ps5" | "xsx" | "switch";

export type AppType = "native" | "backcompat";

/** Per-console-model frame rate entry shown in the "Frame rate by console model" table. */
export type ConsoleTarget = {
  model: string;
  platform: PlatformId;
  fps: number;
  /** e.g. "Performance mode", "Quality mode capped" */
  mode?: string;
  /** Primary model for the platform — drives the headline verdict. */
  primary?: boolean;
};

export type PatchEvent = {
  date: string;
  label: string;
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

export type PlaystationListing = StoreListing & { conceptId: string | null };

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
  gamePassTiers: { console: boolean; pc: boolean; eaPlay: boolean } | null;
  playtime: Playtime | null;
};

export type Game = IgdbGame & {
  /** Consoles FrameCheck lists this on — curated frame data wins over IGDB's platform list. */
  consoles: PlatformId[];
  /** True when curated frame rate data exists; false means "awaiting verification". */
  verified: boolean;
  appType: Partial<Record<PlatformId, AppType>>;
  targets: ConsoleTarget[];
  /** FrameCheck's frame rate explanation, distinct from IGDB's `summary`. */
  verdict: string | null;
  patch?: { type: string; date: string; verified: string; source: string };
  previousFps?: number;
  note?: string;
  requested?: boolean;
  history: PatchEvent[];
};

/** A game plus the long-form IGDB fields — only ever built on a game page. */
export type FullGame = Game & GameDetailData;

export const PLATFORMS: {
  id: PlatformId;
  name: string;
  short: string;
  models: string[];
}[] = [
  { id: "ps5", name: "PlayStation 5", short: "PS5", models: ["PlayStation 5", "PlayStation 5 Pro"] },
  { id: "xsx", name: "Xbox Series X", short: "Xbox Series X", models: ["Xbox Series X", "Xbox Series S"] },
  { id: "switch", name: "Nintendo Switch", short: "Nintendo Switch", models: ["Nintendo Switch 2", "Nintendo Switch"] },
];

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  ps5: "PS5",
  xsx: "Xbox Series X",
  switch: "Nintendo Switch",
};
