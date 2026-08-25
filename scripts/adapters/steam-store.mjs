/**
 * Steam. `store.steampowered.com/api/appdetails` is public, needs no key, and accepts
 * several appids per call when narrowed with `filters=price_overview`.
 *
 * App ids come from the Steam links IGDB already gives us, so there is no search step.
 */
import { getJson } from "../lib/http.mjs";

const ENDPOINT = "https://store.steampowered.com/api/appdetails";

/** `https://store.steampowered.com/app/1245620` → `1245620`. */
export function appIdFrom(url) {
  return /\/app\/(\d+)/.exec(url ?? "")?.[1] ?? null;
}

/** Steam quotes prices in cents. */
const dollars = (cents) => (typeof cents === "number" ? Math.round(cents) / 100 : null);

/** Returns Map<appId, {price, regularPrice, discounted, ...}>. */
export async function fetchSteamPrices(appIds) {
  const out = new Map();
  for (let i = 0; i < appIds.length; i += 12) {
    const batch = appIds.slice(i, i + 12);
    // Steam is stricter than the console stores; pace it and never let one batch abort the run.
    const body = await getJson(`${ENDPOINT}?appids=${batch.join(",")}&cc=us&filters=price_overview`, {
      gapMs: 1500,
    });
    for (const [appId, entry] of Object.entries(body ?? {})) {
      const price = entry?.data?.price_overview;
      if (!entry?.success || !price) continue;
      out.set(appId, {
        appId,
        url: `https://store.steampowered.com/app/${appId}`,
        price: dollars(price.final),
        regularPrice: dollars(price.initial),
        discounted: (price.discount_percent ?? 0) > 0,
        discountPercent: price.discount_percent ?? 0,
        currency: price.currency ?? "USD",
      });
    }
  }
  return out;
}
