/**
 * PlayStation. There is no public API to enrol in, so this reads the storefront's own
 * server-rendered payload.
 *
 * Ceiling, verified against the live store: the `__NEXT_DATA__` Apollo cache on both the
 * concept and product pages contains only `id`, `name` and `isSearchableOnStore`. Price,
 * editions and download size are fetched client-side through a GraphQL endpoint that
 * rejects any query whose hash is not on Sony's server-side whitelist — a hash computed
 * from the query text comes back "not whitelisted", so those fields are not reachable
 * this way.
 *
 * What we can rely on is the identity data, which is what links a game to the right store
 * page. If Sony restores fields to the SSR payload, `extract()` is the only function that
 * needs to change.
 */
import { getText, parseNextData } from "../lib/http.mjs";

export const CONCEPT_URL = (conceptId) => `https://store.playstation.com/en-us/concept/${conceptId}`;
export const PRODUCT_URL = (productId) => `https://store.playstation.com/en-us/product/${productId}`;

function extract(nextData, sourceUrl) {
  const pageProps = nextData?.props?.pageProps ?? {};
  const apollo = pageProps.apolloState ?? {};
  const concept = Object.entries(apollo).find(([k]) => k.startsWith("Concept:"))?.[1];
  const product = Object.entries(apollo).find(([k]) => k.startsWith("Product:"))?.[1];

  // The Apollo cache is served inconsistently — the same URL returns entities on one
  // request and an empty cache on the next. Fall back to the route props, which always
  // carry the id, so a stripped response still yields a usable store link.
  const productId = product?.id ?? pageProps.productId ?? null;
  const conceptId = concept?.id ?? pageProps.conceptId ?? null;
  if (!productId && !conceptId) return null;

  return {
    productId,
    conceptId,
    name: product?.name ?? concept?.name ?? null,
    url: productId ? PRODUCT_URL(productId) : conceptId ? CONCEPT_URL(conceptId) : sourceUrl,
    isSearchable: concept?.isSearchableOnStore ?? product?.isSearchableOnStore ?? null,
    // Present so consumers can tell "Sony does not expose this" from "not synced yet".
    price: null,
    regularPrice: null,
    editions: [],
    downloadBytes: null,
  };
}

export async function fetchPlaystationProduct(storeUrl) {
  const html = await getText(storeUrl, { gapMs: 1200, timeoutMs: 30_000 });
  return extract(parseNextData(html), storeUrl);
}
