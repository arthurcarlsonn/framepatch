/**
 * Crawlora — a managed scraping API that fronts the PlayStation Store.
 *
 * Why this exists alongside the direct GraphQL adapter: the store's own endpoint needs
 * persisted-query hashes that rotate on every deploy, and it exposes no PS4/PS5 split.
 * Crawlora needs no hashes and returns `platforms` outright, which is the last piece of
 * platform availability we were missing.
 *
 * It is metered, so it is used sparingly: identity, platforms and editions barely change,
 * so those are cached for a month, while the free GraphQL call keeps prices fresh on every
 * sync. Crawlora's price is kept as the fallback for when the hashes go stale.
 *
 * Limits observed on this plan: 2 credits per call, 500 credits/day, 2000 total, and about
 * five calls a minute — hence the deliberately slow pacing.
 */
import { HttpError, request } from "../lib/http.mjs";

const BASE = "https://api.crawlora.net/api/v1/playstation";
/** ~5 requests/minute; leave headroom so a run does not trip the limiter. */
const GAP_MS = 13_000;

let creditsRemaining = null;

export function creditsLeft() {
  return creditsRemaining;
}

export class CrawloraAuthError extends Error {}

async function call(path, params) {
  const key = process.env.CRAWLORA_API_KEY;
  if (!key) throw new CrawloraAuthError("CRAWLORA_API_KEY is not set in .env.local");

  const query = new URLSearchParams({ ...params, cc: "us", l: "en" });
  let res;
  try {
    res = await request(`${BASE}/${path}?${query}`, {
      headers: { "x-api-key": key },
      gapMs: GAP_MS,
      timeoutMs: 45_000,
      retries: 2,
    });
  } catch (error) {
    // A 404 means this id is not in the US catalogue, which is data, not a failure.
    if (error instanceof HttpError && error.status === 404) return null;
    if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
      throw new CrawloraAuthError(`Crawlora rejected the API key (HTTP ${error.status})`);
    }
    throw error;
  }

  const daily = res.headers.get("x-daily-credits-remaining");
  if (daily !== null) creditsRemaining = Number(daily);

  const body = await res.json();
  return body?.code === 200 ? (body.data ?? null) : null;
}

function priceOf(price) {
  if (!price) return null;
  const base = typeof price.base_price_value === "number" ? price.base_price_value / 100 : null;
  const now = typeof price.discounted_value === "number" ? price.discounted_value / 100 : null;
  return {
    price: now ?? base,
    regularPrice: base,
    discounted: base !== null && now !== null && now < base,
    currency: price.currency_code ?? "USD",
    isFree: Boolean(price.is_free),
    // Milliseconds since epoch when the store is quoting a sale end.
    saleEnds: price.end_time ? Number(price.end_time) : null,
  };
}

function normalize(data, { conceptId = null, productId = null } = {}) {
  if (!data) return null;
  const pricing = priceOf(data.price);
  return {
    productId: data.default_product_id ?? data.id ?? productId,
    conceptId: data.concept_id ?? conceptId ?? (data.default_product_id ? data.id : null),
    name: data.name ?? null,
    url: data.source_url ?? null,
    /** The PS4/PS5 split — the reason this adapter exists. */
    platforms: data.platforms ?? [],
    publisher: data.publisher ?? null,
    releaseDate: data.release_date ?? null,
    editions: (data.editions ?? [])
      .map((e) => e.edition_name ?? e.name)
      .filter(Boolean)
      .slice(0, 6),
    ...(pricing ?? {}),
  };
}

/** Concept first: it resolves the default product and survives region-specific product ids. */
export async function fetchPlaystation({ conceptId, productId }) {
  if (conceptId) {
    const data = await call("concept", { id: conceptId });
    if (data) return normalize(data, { conceptId });
  }
  if (productId) {
    const data = await call("product", { id: productId });
    if (data) return normalize(data, { productId });
  }
  return null;
}
