/**
 * IGDB — the canonical game database. Every other adapter enriches these records and none
 * of them may introduce a game IGDB does not have; the IGDB game id is the join key
 * throughout.
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CURATED_SLUGS } from "../../src/lib/frame-data.ts";
import { sleep } from "../lib/http.mjs";
import { ROOT } from "../lib/store.mjs";

const TOKEN_CACHE = path.join(ROOT, ".igdb-token.json");

/** Ratings below this are mostly obscure entries with thin metadata. */
const MIN_RATING_COUNT = 60;

/** IGDB platform id → the console FrameCheck groups it under. */
const PLATFORM_OF = { 167: "ps5", 169: "xsx", 130: "switch", 508: "switch" };
/** IGDB platform id → the label shown in "Platform availability". */
const AVAILABILITY = {
  6: "PC",
  48: "PS4",
  49: "Xbox One",
  130: "Switch",
  167: "PS5",
  169: "Xbox Series X|S",
  508: "Switch 2",
};
const DISCOVERY_PLATFORMS = [
  { id: 167, label: "PS5" },
  { id: 169, label: "Xbox Series X|S" },
  { id: 130, label: "Switch" },
  { id: 508, label: "Switch 2" },
];
const STORE_SITES = {
  13: "Steam",
  16: "Epic Games",
  17: "GOG",
  22: "Xbox Store",
  23: "PlayStation Store",
  24: "Nintendo eShop",
};
/** external_games sources that give us a storefront product id. */
const MICROSOFT_SOURCES = new Set([11, 31]);
const PLAYSTATION_SOURCE = 36;

/** IGDB popularity type 3, "Playing" — a far better ranking signal than rating counts. */
const POPULARITY_TYPE = 3;

const GAME_FIELDS = [
  "name",
  "slug",
  "summary",
  "first_release_date",
  "total_rating",
  "total_rating_count",
  "aggregated_rating",
  "aggregated_rating_count",
  "cover.image_id",
  "genres.name",
  "themes.name",
  "platforms.id",
  "game_modes.name",
  "involved_companies.company.name",
  "involved_companies.publisher",
  "involved_companies.developer",
  "age_ratings.rating_category",
  "age_ratings.organization",
  "franchises.name",
  "websites.url",
  "websites.type",
  "external_games.uid",
  "external_games.url",
  "external_games.external_game_source",
  "alternative_names.name",
  "screenshots.image_id",
  "artworks.image_id",
  "videos.video_id",
  "videos.name",
  "release_dates.human",
  "release_dates.date",
  "release_dates.platform",
  "multiplayer_modes.*",
  "similar_games",
  "game_engines.name",
  "player_perspectives.name",
].join(",");

// ── auth ──────────────────────────────────────────────────────────────────────

async function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (existsSync(file)) {
    for (const line of (await readFile(file, "utf8")).split("\n")) {
      const match = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  }
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.local");
  }
  return { id, secret };
}

async function getToken({ id, secret }) {
  if (existsSync(TOKEN_CACHE)) {
    const cached = JSON.parse(await readFile(TOKEN_CACHE, "utf8"));
    if (cached.clientId === id && cached.expiresAt > Date.now() + 60_000) return cached.token;
  }
  const url = `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  await writeFile(
    TOKEN_CACHE,
    JSON.stringify({ clientId: id, token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 }),
  );
  return body.access_token;
}

// ── request plumbing ──────────────────────────────────────────────────────────

/** IGDB allows 4 requests/second; serialise with a small gap and retry on 429. */
let lastRequest = 0;
async function igdb(client, endpoint, query) {
  const gap = 260 - (Date.now() - lastRequest);
  if (gap > 0) await sleep(gap);

  for (let attempt = 0; attempt < 4; attempt++) {
    lastRequest = Date.now();
    const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": client.id,
        Authorization: `Bearer ${client.token}`,
        Accept: "application/json",
      },
      body: query,
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(600 * (attempt + 1));
      continue;
    }
    throw new Error(`IGDB ${endpoint} ${res.status}: ${await res.text()}\nquery: ${query}`);
  }
  throw new Error(`IGDB ${endpoint} failed after retries`);
}

// ── fetching ──────────────────────────────────────────────────────────────────

async function fetchEsrbMap(client) {
  const rows = await igdb(client, "age_rating_categories", "fields id,rating; where organization = 1; limit 30;");
  return new Map(rows.map((r) => [r.id, r.rating]));
}

async function fetchCurated(client) {
  const out = [];
  for (let i = 0; i < CURATED_SLUGS.length; i += 40) {
    const list = CURATED_SLUGS.slice(i, i + 40).map((s) => `"${s}"`).join(",");
    out.push(...(await igdb(client, "games", `fields ${GAME_FIELDS}; where slug = (${list}); limit 50;`)));
  }
  return out;
}

/** IGDB's "Playing" count per game, batched — full coverage on this catalogue. */
async function fetchPopularity(client, ids) {
  const scores = new Map();
  for (let i = 0; i < ids.length; i += 150) {
    const batch = ids.slice(i, i + 150).join(",");
    const rows = await igdb(
      client,
      "popularity_primitives",
      `fields game_id,value; where popularity_type = ${POPULARITY_TYPE} & game_id = (${batch}); limit 500;`,
    );
    // Raw values are tiny floats; scale to a readable integer.
    for (const row of rows) scores.set(row.game_id, Math.round(row.value * 1_000_000));
  }
  return scores;
}

async function fetchPopular(client, perPlatform) {
  const out = [];
  for (const platform of DISCOVERY_PLATFORMS) {
    const rows = await igdb(
      client,
      "games",
      `fields ${GAME_FIELDS}; where platforms = (${platform.id}) & game_type = 0 & cover != null ` +
        `& total_rating_count >= ${MIN_RATING_COUNT}; sort total_rating_count desc; limit ${perPlatform};`,
    );
    console.log(`  ${platform.label}: ${rows.length} popular titles`);
    out.push(...rows);
  }
  return out;
}

// ── shaping ───────────────────────────────────────────────────────────────────

function company(game, role) {
  const match = game.involved_companies?.find((c) => c[role]);
  return match?.company?.name ?? null;
}

function esrbOf(game, esrbMap) {
  const rating = game.age_ratings?.find((r) => r.organization === 1);
  return rating ? (esrbMap.get(rating.rating_category) ?? null) : null;
}

function storesOf(game) {
  const seen = new Map();
  for (const site of game.websites ?? []) {
    const label = STORE_SITES[site.type];
    if (label && site.url && !seen.has(label)) seen.set(label, site.url);
  }
  return [...seen].map(([label, url]) => ({ label, url }));
}

/** Screenshots first, then artworks — both render at t_screenshot_med. */
/** Product ids and store URLs the storefront adapters key off. Never used to create games. */
function linksOf(game) {
  const externals = game.external_games ?? [];
  const microsoft = externals.find((e) => MICROSOFT_SOURCES.has(e.external_game_source));
  const playstation = externals.find((e) => e.external_game_source === PLAYSTATION_SOURCE);
  const site = (type) => (game.websites ?? []).find((w) => w.type === type)?.url ?? null;
  return {
    xboxProductId: microsoft?.uid ?? null,
    playstationUrl: playstation?.url ?? site(23),
    nintendoUrl: site(24),
  };
}

function mediaOf(game) {
  const ids = [
    ...(game.screenshots ?? []).map((s) => s.image_id),
    ...(game.artworks ?? []).map((a) => a.image_id),
  ];
  return [...new Set(ids)].slice(0, 6);
}

function trailerOf(game) {
  const video = game.videos?.[0];
  return video?.video_id ? { id: video.video_id, name: video.name ?? "Trailer" } : null;
}

/** One dated row per store platform we show, earliest date wins. */
function releaseDatesOf(game) {
  const byLabel = new Map();
  for (const entry of game.release_dates ?? []) {
    const label = AVAILABILITY[entry.platform];
    if (!label || !entry.human) continue;
    const existing = byLabel.get(label);
    if (!existing || (entry.date ?? Infinity) < existing.sort) {
      byLabel.set(label, { platform: label, date: entry.human, sort: entry.date ?? Infinity });
    }
  }
  return [...byLabel.values()].sort((a, b) => a.sort - b.sort).map(({ platform, date }) => ({ platform, date }));
}

/**
 * IGDB stores multiplayer modes per platform and coverage is patchy, so prefer a record for
 * a console FrameCheck tracks and fall back to whatever exists.
 */
function multiplayerOf(game) {
  const modes = game.multiplayer_modes ?? [];
  if (modes.length === 0) return null;
  const mode = modes.find((m) => PLATFORM_OF[m.platform]) ?? modes[0];
  const out = {
    onlineMax: mode.onlinemax || null,
    onlineCoopMax: mode.onlinecoopmax || null,
    offlineCoopMax: mode.offlinecoopmax || null,
    splitscreen: Boolean(mode.splitscreen),
    campaignCoop: Boolean(mode.campaigncoop),
  };
  return Object.values(out).some(Boolean) ? out : null;
}

function altNamesOf(game) {
  const title = game.name.toLowerCase();
  const names = (game.alternative_names ?? [])
    .map((n) => n.name)
    .filter((n) => n && n.toLowerCase() !== title);
  return [...new Set(names)].slice(0, 4);
}

function summaryOf(game) {
  const text = game.summary?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= 600) return text;
  const cut = text.slice(0, 600);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function toRecord(game, esrbMap) {
  const platformIds = (game.platforms ?? []).map((p) => p.id);
  const consoles = [...new Set(platformIds.map((id) => PLATFORM_OF[id]).filter(Boolean))];
  const availability = platformIds.map((id) => AVAILABILITY[id]).filter(Boolean);
  const score = game.aggregated_rating ?? game.total_rating ?? null;

  return {
    // Shipped to the browser with every list and search — keep it lean.
    index: {
      igdbId: game.id,
      slug: game.slug,
      title: game.name,
      releaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
      cover: game.cover?.image_id ? { imageId: game.cover.image_id } : null,
      publisher: company(game, "publisher"),
      developer: company(game, "developer"),
      genres: (game.genres ?? []).map((g) => g.name),
      franchise: game.franchises?.[0]?.name ?? null,
      esrb: esrbOf(game, esrbMap),
      score: score === null ? null : Math.round(score),
      ratingCount: game.total_rating_count ?? 0,
      popularity: 0,
      altNames: altNamesOf(game),
      consoles,
    },
    // Only ever imported by the game page, which is a server component.
    detail: {
      summary: summaryOf(game),
      themes: (game.themes ?? []).map((t) => t.name),
      gameModes: (game.game_modes ?? []).map((m) => m.name),
      availability: [...new Set(availability)],
      stores: storesOf(game),
      media: mediaOf(game),
      trailer: trailerOf(game),
      releaseDates: releaseDatesOf(game),
      multiplayer: multiplayerOf(game),
      engines: (game.game_engines ?? []).map((e) => e.name),
      perspectives: (game.player_perspectives ?? []).map((p) => p.name),
      similar: [],
    },
    links: linksOf(game),
    similarIds: game.similar_games ?? [],
  };
}


// ── entry point ───────────────────────────────────────────────────────────────

/**
 * Fetches the catalogue: every curated title by slug, plus the most-rated titles on each
 * console. Returns `{ index, detail, links }` records keyed by IGDB id.
 */
export async function fetchCatalogue({ curatedOnly = false, perPlatform = 70 } = {}) {
  const credentials = await loadEnv();
  const client = { id: credentials.id, token: await getToken(credentials) };
  const esrbMap = await fetchEsrbMap(client);

  const curated = await fetchCurated(client);
  const missing = CURATED_SLUGS.filter((slug) => !curated.some((g) => g.slug === slug));
  if (missing.length) console.warn(`  ! no IGDB match for: ${missing.join(", ")}`);

  const discovered = curatedOnly ? [] : await fetchPopular(client, perPlatform);

  const byId = new Map();
  for (const game of [...curated, ...discovered]) byId.set(game.id, game);

  const records = [...byId.values()]
    .map((g) => toRecord(g, esrbMap))
    // Backwards-compatible titles are listed on IGDB under their original platform, so a
    // curated entry keeps its consoles from frame-data.ts instead.
    .filter(
      (r) => r.index.cover && (r.index.consoles.length > 0 || CURATED_SLUGS.includes(r.index.slug)),
    );

  const popularity = await fetchPopularity(client, records.map((r) => r.index.igdbId));
  const slugById = new Map(records.map((r) => [r.index.igdbId, r.index.slug]));
  for (const record of records) {
    record.index.popularity = popularity.get(record.index.igdbId) ?? 0;
    // IGDB's own "similar games" beats a hand-rolled score, but only for titles we carry.
    record.detail.similar = record.similarIds
      .map((id) => slugById.get(id))
      .filter((slug) => slug && slug !== record.index.slug)
      .slice(0, 8);
    delete record.similarIds;
  }

  return records.sort((a, b) => b.index.popularity - a.index.popularity);
}
