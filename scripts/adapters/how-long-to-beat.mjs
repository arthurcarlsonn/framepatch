/**
 * HowLongToBeat.
 *
 * State of play, verified against the live site: the two unofficial npm wrappers
 * (`howlongtobeat`, `hltb`) were last published in 2022-23 and throw against the current
 * site. HLTB now gates `/api/search/site` behind a session token from
 * `/api/search/site/init` plus an `x-hp-key` / `x-hp-val` fingerprint pair. Requests with
 * no token get 403 "invalid fingerprint"; requests with a valid token but a non-browser
 * client get a 404 HTML page, which is an anti-bot response rather than a real 404.
 *
 * The flow below is the real one the site uses. It is wired into the sync with graceful
 * failure so that if HLTB relaxes the check — or this runs from an environment it trusts —
 * the times start populating with no further work. Until then every game records an error
 * and the site renders without playtimes.
 */
import { getJson, postJson } from "../lib/http.mjs";

const ORIGIN = "https://howlongtobeat.com";

const browserHeaders = {
  Referer: `${ORIGIN}/`,
  Origin: ORIGIN,
  Accept: "*/*",
};

let session = null;

async function getSession(force = false) {
  if (session && !force) return session;
  session = await getJson(`${ORIGIN}/api/search/site/init?t=${Date.now()}`, {
    headers: browserHeaders,
    gapMs: 800,
  });
  return session;
}

function searchBody(terms) {
  return {
    searchType: "games",
    searchTerms: terms,
    searchPage: 1,
    size: 5,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: null, max: null },
        gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
        rangeYear: { min: "", max: "" },
        modifier: "",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
  };
}

/** Seconds → hours, one decimal. HLTB stores every duration in seconds. */
const hours = (seconds) => (seconds > 0 ? Math.round((seconds / 3600) * 10) / 10 : null);

function pickMatch(results, title) {
  const wanted = title.toLowerCase();
  return (
    results.find((r) => r.game_name?.toLowerCase() === wanted) ??
    results.find((r) => r.game_name?.toLowerCase().includes(wanted)) ??
    results[0] ??
    null
  );
}

export async function fetchPlaytimes(title) {
  const terms = title.split(/\s+/).filter(Boolean);

  for (const refresh of [false, true]) {
    const auth = await getSession(refresh);
    try {
      const body = await postJson(`${ORIGIN}/api/search/site`, searchBody(terms), {
        headers: {
          ...browserHeaders,
          "x-auth-token": auth.token,
          "x-hp-key": auth.hpKey,
          "x-hp-val": auth.hpVal,
        },
        gapMs: 1200,
        retries: 1,
      });
      const match = pickMatch(body.data ?? [], title);
      if (!match) return null;
      return {
        id: match.game_id ?? null,
        name: match.game_name ?? null,
        url: match.game_id ? `${ORIGIN}/game/${match.game_id}` : null,
        main: hours(match.comp_main ?? 0),
        mainExtra: hours(match.comp_plus ?? 0),
        completionist: hours(match.comp_100 ?? 0),
      };
    } catch (error) {
      // 403/404 here means the token was rejected; one refresh, then give up for this game.
      if (refresh) throw error;
      session = null;
    }
  }
  return null;
}
