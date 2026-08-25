/**
 * PlayStation. There is no public API to enrol in, so this uses the storefront's own
 * GraphQL endpoint the way the store does.
 *
 * Two things are needed to talk to it:
 *
 *  1. A persisted-query hash. Sony allowlists these server-side — a hash computed from the
 *     query text is refused with "not whitelisted" — so they are captured from the store's
 *     own requests and kept in data/playstation-queries.json. They rotate when the store
 *     redeploys, which is what `buildId` in that file tracks.
 *  2. An `apollo-require-preflight` header, or the endpoint rejects the call as CSRF.
 *
 * With both, price, discount and editions come back cleanly. Download size and the
 * PS4/PS5 split are not exposed by any of the store's operations, so those stay null and
 * platform availability for PlayStation continues to come from IGDB.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getJson, getText, parseNextData } from "../lib/http.mjs";
import { ROOT } from "../lib/store.mjs";

const GRAPHQL = "https://web.np.playstation.com/api/graphql/v1/op";
const QUERY_FILE = path.join(ROOT, "data/playstation-queries.json");

export const CONCEPT_URL = (conceptId) => `https://store.playstation.com/en-us/concept/${conceptId}`;
export const PRODUCT_URL = (productId) => `https://store.playstation.com/en-us/product/${productId}`;

let queries = null;

async function loadQueries() {
  if (queries) return queries;
  queries = JSON.parse(await readFile(QUERY_FILE, "utf8"));
  return queries;
}

export class StaleHashError extends Error {
  constructor(operation) {
    super(
      `PlayStation rejected "${operation}" — the store redeployed and the query hashes in ` +
        `data/playstation-queries.json are stale. Re-capture them with \`pnpm ps:hashes\`.`,
    );
  }
}

async function callGraphql(operation, variables) {
  const { operations } = await loadQueries();
  const hash = operations[operation];
  if (!hash) throw new Error(`No cached hash for "${operation}"`);

  const url =
    `${GRAPHQL}?operationName=${operation}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }))}`;

  const body = await getJson(url, {
    headers: {
      "x-psn-store-locale-override": "en-US",
      Referer: "https://store.playstation.com/",
      // Without this the endpoint refuses the request as a possible CSRF.
      "apollo-require-preflight": "true",
    },
    gapMs: 700,
  });

  if (body.errors?.some((e) => /not whitelisted/i.test(e.message ?? ""))) {
    throw new StaleHashError(operation);
  }
  return body.data ?? null;
}

/** The store quotes prices in cents on `*Value` fields; the formatted ones are display only. */
const dollars = (cents) => (typeof cents === "number" ? Math.round(cents) / 100 : null);

/**
 * A product carries several CTAs and only one of them is the purchase price. The others
 * are upsells — most commonly "included with PS Plus", which quotes a discountedValue of
 * 0 and would otherwise read as a free game.
 */
function priceFromCtas(product) {
  const ctas = product?.webctas ?? [];
  const applicable = ctas.filter((c) => c?.price?.applicability === "APPLICABLE");
  // A genuinely free-to-play title has no paid CTA at all; a demo or trial sitting next to
  // the real listing does, so prefer a priced one before falling back.
  const purchase =
    applicable.find((c) => !c.price.isFree && c.price.basePriceValue > 0) ??
    applicable.find((c) => !c.price.isFree) ??
    applicable[0];

  // Sony's equivalent of Game Pass, surfaced as an upsell rather than a catalogue flag.
  const plusIncluded = ctas.some((c) =>
    (c?.price?.serviceBranding ?? []).includes("PS_PLUS") || /PS_PLUS/.test(c?.type ?? ""),
  );

  if (!purchase) return plusIncluded ? { plusIncluded } : null;

  const price = purchase.price;
  const base = dollars(price.basePriceValue);
  const now = dollars(price.discountedValue);
  return {
    price: now ?? base,
    regularPrice: base,
    discounted: base !== null && now !== null && now < base,
    currency: price.currencyCode ?? "USD",
    saleEnds: price.endTime ?? null,
    isFree: Boolean(price.isFree),
    plusIncluded,
  };
}

async function fetchPricing({ productId, conceptId }) {
  if (productId) {
    const data = await callGraphql("productRetrieveForCtasWithPrice", { productId });
    const priced = priceFromCtas(data?.productRetrieve);
    if (priced) return { ...priced, name: data?.productRetrieve?.name ?? null };
  }
  if (conceptId) {
    const data = await callGraphql("conceptRetrieveForCtasWithPrice", { conceptId });
    const product = data?.conceptRetrieve?.defaultProduct;
    const priced = priceFromCtas(product);
    if (priced) return { ...priced, name: product?.name ?? null, productId: product?.id ?? null };
  }
  return null;
}

async function fetchEditions({ productId, conceptId }) {
  try {
    const data = productId
      ? await callGraphql("wcaProductEditionsRetrive", { productId })
      : await callGraphql("wcaConceptEditionsRetrive", { conceptId });
    const list = data?.editionSelectionsRetrieve ?? [];
    return [...new Set(list.map((p) => p.edition?.name).filter(Boolean))].slice(0, 6);
  } catch {
    // Editions are a nice-to-have; never let them cost us the price.
    return [];
  }
}

function identity(nextData, sourceUrl) {
  const pageProps = nextData?.props?.pageProps ?? {};
  const apollo = pageProps.apolloState ?? {};
  const concept = Object.entries(apollo).find(([k]) => k.startsWith("Concept:"))?.[1];
  const product = Object.entries(apollo).find(([k]) => k.startsWith("Product:"))?.[1];

  // The Apollo cache is served inconsistently — the same URL returns entities on one
  // request and an empty cache on the next — so fall back to the route props for the id.
  return {
    productId: product?.id ?? pageProps.productId ?? null,
    conceptId: concept?.id ?? pageProps.conceptId ?? null,
    name: product?.name ?? concept?.name ?? null,
    sourceUrl,
  };
}

export async function fetchPlaystationProduct(storeUrl) {
  const html = await getText(storeUrl, { gapMs: 1200, timeoutMs: 30_000 });
  const base = identity(parseNextData(html), storeUrl);
  if (!base.productId && !base.conceptId) return null;

  // Price first: the concept query resolves the default product id, which is what the
  // editions query actually keys off.
  const pricing = await fetchPricing(base);
  const productId = pricing?.productId ?? base.productId;
  const editions = await fetchEditions({ productId, conceptId: base.conceptId });

  return {
    productId,
    conceptId: base.conceptId,
    name: pricing?.name ?? base.name,
    url: productId ? PRODUCT_URL(productId) : base.conceptId ? CONCEPT_URL(base.conceptId) : storeUrl,
    price: pricing?.price ?? null,
    regularPrice: pricing?.regularPrice ?? null,
    discounted: pricing?.discounted ?? false,
    currency: pricing?.currency ?? "USD",
    saleEnds: pricing?.saleEnds ?? null,
    plusIncluded: pricing?.plusIncluded ?? false,
    editions,
    // Not exposed by any store operation — PlayStation availability stays IGDB-sourced.
    downloadBytes: null,
  };
}

/**
 * Refreshes prices for entries we already identified, without refetching the store page.
 * This is the call that runs on every sync.
 */
export async function refreshPlaystationPrice(entry) {
  const pricing = await fetchPricing({ productId: entry.productId, conceptId: entry.conceptId });
  return pricing ? { ...entry, ...pricing } : entry;
}

/** Returns the store's current buildId so a sync can tell when the hashes went stale. */
export async function currentBuildId() {
  const html = await getText(CONCEPT_URL("10000333"), { gapMs: 500, timeoutMs: 30_000 });
  return parseNextData(html)?.buildId ?? null;
}
