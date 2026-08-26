/**
 * How much a source is worth.
 *
 * The whole pipeline rests on this: a frame rate is only as good as what states it, so every
 * figure carries the URL it came from and the tier of that URL. A publisher's own patch notes
 * outrank a measurement video, which outranks a news write-up, which outranks a forum post.
 *
 * Tier 1 publisher / developer   2 platform holder   3 Digital Foundry & co
 *      4 capture channels        5 games press       6 community
 */

/** Domain suffix → { publisher, tier }. Longest match wins, so subdomains can override. */
const SOURCES = [
  // 1 — the developer or publisher saying it themselves.
  ["ubisoft.com", "Ubisoft", 1],
  ["2k.com", "2K", 1],
  ["rockstargames.com", "Rockstar Games", 1],
  ["bethesda.net", "Bethesda", 1],
  ["ea.com", "Electronic Arts", 1],
  ["cdprojektred.com", "CD Projekt Red", 1],
  ["cyberpunk.net", "CD Projekt Red", 1],
  ["thewitcher.com", "CD Projekt Red", 1],
  ["fromsoftware.jp", "FromSoftware", 1],
  ["bandainamcoent.com", "Bandai Namco", 1],
  ["square-enix-games.com", "Square Enix", 1],
  ["square-enix.com", "Square Enix", 1],
  ["capcom.com", "Capcom", 1],
  ["sega.com", "SEGA", 1],
  ["larian.com", "Larian Studios", 1],
  ["remedygames.com", "Remedy", 1],
  ["naughtydog.com", "Naughty Dog", 1],
  ["insomniacgames.com", "Insomniac Games", 1],
  ["suckerpunch.com", "Sucker Punch", 1],
  ["housemarque.com", "Housemarque", 1],
  ["guerrilla-games.com", "Guerrilla Games", 1],
  ["santamonicastudio.com", "Santa Monica Studio", 1],
  ["bluepointgames.com", "Bluepoint Games", 1],
  ["respawn.com", "Respawn", 1],
  ["gearboxsoftware.com", "Gearbox", 1],
  ["cdpr.link", "CD Projekt Red", 1],
  ["hogwartslegacy.com", "Warner Bros. Games", 1],
  ["epicgames.com", "Epic Games", 1],
  ["fortnite.com", "Epic Games", 1],
  ["hoyoverse.com", "HoYoverse", 1],
  ["mihoyo.com", "miHoYo", 1],
  ["minecraft.net", "Mojang", 1],
  ["riotgames.com", "Riot Games", 1],
  ["blizzard.com", "Blizzard", 1],
  ["activision.com", "Activision", 1],
  ["take2games.com", "Take-Two", 1],
  ["paradoxplaza.com", "Paradox Interactive", 1],
  ["devolverdigital.com", "Devolver Digital", 1],
  ["teamcherry.com.au", "Team Cherry", 1],
  ["stardewvalley.net", "ConcernedApe", 1],
  ["roblox.com", "Roblox", 1],
  // Official game sites. The publisher heuristic below catches studio domains (epicgames.com);
  // a game's own domain rarely contains the studio's name, and matching on the title instead
  // would promote fan wikis, so these are listed rather than inferred.
  ["nomanssky.com", "Hello Games", 1],
  ["hellogames.org", "Hello Games", 1],
  ["playoverwatch.com", "Blizzard", 1],
  ["destinythegame.com", "Bungie", 1],
  ["fallguys.com", "Epic Games", 1],
  ["rocketleague.com", "Psyonix", 1],
  ["marvelrivals.com", "NetEase Games", 1],
  ["playvalorant.com", "Riot Games", 1],
  ["playapex.com", "Respawn", 1],
  ["callofduty.com", "Activision", 1],
  ["ea.com/games", "Electronic Arts", 1],
  ["wbgames.com", "Warner Bros. Games", 1],
  ["support.rockstargames.com", "Rockstar Support", 1],
  ["halowaypoint.com", "343 Industries", 1],
  ["bungie.net", "Bungie", 1],
  ["playstarwarsjedi.com", "Respawn", 1],

  // 2 — the platform holder's own channels.
  ["blog.playstation.com", "PlayStation Blog", 2],
  ["playstation.com", "PlayStation", 2],
  ["news.xbox.com", "Xbox Wire", 2],
  ["xbox.com", "Xbox", 2],
  ["nintendo.com", "Nintendo", 2],
  ["nintendo.co.uk", "Nintendo", 2],
  ["support.nintendo.com", "Nintendo Support", 2],

  // 2 — patch trackers, but only ever for the changelog text they carry, which is the
  //     publisher's own, served from Sony's update servers. See scripts/adapters/ps-patches.mjs.
  ["prosperopatches.com", "PS5 update servers", 2],
  ["orbispatches.com", "PS4 update servers", 2],

  // 3 — independent technical analysis.
  ["digitalfoundry.net", "Digital Foundry", 3],
  ["eurogamer.net", "Digital Foundry / Eurogamer", 3],

  // 4 — frame rate capture channels. Their numbers are measured, not announced.
  ["vgtech.co.uk", "VG Tech", 4],
  ["elanalistadebits.com", "El Analista De Bits", 4],
  ["nxgamer.com", "NX Gamer", 4],
  ["backwards-compatible.com", "Backwards-Compatible", 4],
  ["psfoundry.com", "PSFoundry", 4],

  // 5 — games press. Usually accurate, usually restating someone else.
  ["pushsquare.com", "Push Square", 5],
  ["purexbox.com", "Pure Xbox", 5],
  ["nintendolife.com", "Nintendo Life", 5],
  ["ign.com", "IGN", 5],
  ["gamespot.com", "GameSpot", 5],
  ["polygon.com", "Polygon", 5],
  ["pcgamer.com", "PC Gamer", 5],
  ["videogameschronicle.com", "VGC", 5],
  ["gamesradar.com", "GamesRadar", 5],
  ["destructoid.com", "Destructoid", 5],
  ["gamingbolt.com", "GamingBolt", 5],
  ["dexerto.com", "Dexerto", 5],
  ["thegamer.com", "TheGamer", 5],
  ["windowscentral.com", "Windows Central", 5],
  ["engadget.com", "Engadget", 5],
  ["theverge.com", "The Verge", 5],

  // 6 — community. Useful as corroboration, never on its own.
  ["reddit.com", "Reddit", 6],
  ["resetera.com", "ResetEra", 6],
  ["neogaf.com", "NeoGAF", 6],
  ["steamcommunity.com", "Steam Community", 6],
  ["gamefaqs.gamespot.com", "GameFAQs", 6],
  ["youtube.com", "YouTube", 6],
];

/**
 * A domain the table has never seen.
 *
 * Press-grade rather than community-grade, deliberately: the table cannot list every games
 * site on the internet, and treating the unknown as community meant a figure from a smaller
 * outlet was thrown away entirely. Actual community sites — Reddit, YouTube, the forums — are
 * listed explicitly at tier 6, so they still cannot carry a figure on their own.
 */
const UNKNOWN_TIER = 5;

/**
 * The domains the trusted pass pins its query to.
 *
 * Deliberately short: this becomes a `site:a OR site:b` group, and a group of forty is both
 * unwieldy and unnecessary — the open pass finds publisher pages perfectly well on its own
 * (a plain query returns Ubisoft's own 60 FPS article for AC Unity). What a search engine
 * will not reliably surface unprompted is the technical-analysis tier, so those are named.
 */
export const SEARCH_SITES = [
  "blog.playstation.com",
  "news.xbox.com",
  "nintendo.com",
  "eurogamer.net",
  "digitalfoundry.net",
  "vgtech.co.uk",
  "elanalistadebits.com",
  "nxgamer.com",
  "backwards-compatible.com",
  "psfoundry.com",
  "pushsquare.com",
  "videogameschronicle.com",
];

export function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const slug = (value) => value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";

/**
 * A game's own publisher or developer, speaking on its own domain, is tier 1 whether or not
 * the table happens to list them. IGDB already tells us who made the game, so `epicgames.com`
 * on a Fortnite page resolves without anyone maintaining a list of every studio.
 */
function ownedBy(host, owners) {
  const token = host.replace(/\.[a-z.]+$/, "").replace(/[^a-z0-9]/g, "");
  return owners
    .map((owner) => [owner, slug(owner)])
    .find(([, id]) => id.length >= 4 && (token.includes(id) || id.includes(token)))?.[0];
}

/**
 * `{ publisher, tier }` for a URL. An explicit table entry wins; then the game's own
 * publisher; then the press-grade default.
 */
export function classify(url, owners = []) {
  const host = hostOf(url);
  if (!host) return { publisher: null, tier: UNKNOWN_TIER };

  let best = null;
  for (const [domain, publisher, tier] of SOURCES) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      if (!best || domain.length > best[0].length) best = [domain, publisher, tier];
    }
  }
  if (best) return { publisher: best[1], tier: best[2] };

  const owner = ownedBy(host, owners.filter(Boolean));
  if (owner) return { publisher: owner, tier: 1 };

  return { publisher: host, tier: UNKNOWN_TIER };
}

/**
 * Tier → the strongest confidence a figure resting on it may claim.
 *
 * This is a ceiling, not a promise: the extractor still has to find a sentence that states the
 * frame rate. A tier-1 page that never mentions FPS produces no figure at all.
 */
export function confidenceFor(tier) {
  if (tier <= 2) return "official";
  if (tier <= 4) return "measured";
  if (tier <= 5) return "reported";
  return "unknown";
}

const RANK = { official: 3, measured: 2, reported: 1, unknown: 0 };

export function strongest(values) {
  return values.reduce((best, next) => (RANK[next] > RANK[best] ? next : best), "unknown");
}

/** Caps a claimed confidence at what its sources can actually support. */
export function capConfidence(claimed, urls, owners = []) {
  const supported = strongest(urls.map((url) => confidenceFor(classify(url, owners).tier)));
  return RANK[claimed] <= RANK[supported] ? claimed : supported;
}
