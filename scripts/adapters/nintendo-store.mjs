/**
 * Nintendo. Two public, unauthenticated surfaces:
 *
 *  1. the store page, whose `__NEXT_DATA__` Apollo cache carries nsuid, platform
 *     (Switch vs Switch 2), rom sizes, editions and compatibility notes;
 *  2. api.ec.nintendo.com/v1/price, which is the authoritative price and the only place
 *     a discount shows up.
 *
 * The page is the expensive call, so it is cached per game; prices are refreshed in one
 * batched call across every known nsuid.
 */
import { getJson, getText, parseNextData } from "../lib/http.mjs";

const PRICE_ENDPOINT = "https://api.ec.nintendo.com/v1/price";

const PLATFORM_CODES = { HAC: "Nintendo Switch", BEE: "Nintendo Switch 2" };

function productEntities(nextData) {
  const apollo = nextData?.props?.pageProps?.initialApolloState ?? {};
  return Object.values(apollo).filter((v) => v && typeof v === "object" && v.__typename === "Product");
}

/** The page's own product, identified by the nsuid the analytics block names. */
function mainProduct(nextData) {
  const nsuid = nextData?.props?.pageProps?.analytics?.product?.nsuid;
  const products = productEntities(nextData);
  return products.find((p) => p.nsuid === nsuid) ?? products[0] ?? null;
}

function romSizes(product) {
  const sizes = product.softwareDetails?.romSizes ?? [];
  return sizes
    .map((s) => ({
      // Nintendo reports internal console codes here: HAC is Switch, BEE is Switch 2.
      platform: PLATFORM_CODES[s.platform] ?? s.platform ?? "Unknown",
      bytes: Number(s.totalRomSize ?? s.estimatedRomSize ?? 0) || null,
    }))
    .filter((s) => s.bytes);
}

export async function fetchNintendoProduct(storeUrl) {
  const html = await getText(storeUrl, { gapMs: 900, timeoutMs: 30_000 });
  const product = mainProduct(parseNextData(html));
  if (!product?.nsuid) return null;

  const prices = product['prices({"personalized":false})'] ?? null;
  const editions = (product.variations ?? [])
    .filter((v) => v.type === "edition")
    .map((v) => v.label)
    .filter(Boolean);

  return {
    nsuid: product.nsuid,
    sku: product.sku ?? null,
    name: product.name ?? null,
    url: storeUrl,
    platform: product.platform?.label ?? null,
    platforms: (product.platforms ?? []).map((p) => p.label).filter(Boolean),
    // Nintendo's own wording for how the title behaves on the newer console.
    compatibility: product.compatibility
      ? { status: product.compatibility.status, caption: product.compatibility.caption ?? null }
      : null,
    romSizes: romSizes(product),
    editions: [...new Set(editions)].slice(0, 6),
    playModes: (product.playModes ?? []).map((m) => m.label).filter(Boolean),
    price: prices?.finalPrice ?? null,
    regularPrice: prices?.regularPrice ?? null,
    discounted: Boolean(prices?.discounted),
    currency: prices?.currency ?? "USD",
  };
}

/** Refreshes prices for many nsuids at once. Returns Map<nsuid, {price, regularPrice, discounted}>. */
export async function fetchNintendoPrices(nsuids) {
  const out = new Map();
  for (let i = 0; i < nsuids.length; i += 45) {
    const batch = nsuids.slice(i, i + 45);
    const url = `${PRICE_ENDPOINT}?country=US&lang=en&ids=${batch.join(",")}`;
    const body = await getJson(url, { gapMs: 600 });
    for (const entry of body.prices ?? []) {
      const regular = Number(entry.regular_price?.raw_value);
      const discount = entry.discount_price ? Number(entry.discount_price.raw_value) : null;
      out.set(String(entry.title_id), {
        salesStatus: entry.sales_status ?? null,
        regularPrice: Number.isFinite(regular) ? regular : null,
        price: discount ?? (Number.isFinite(regular) ? regular : null),
        discounted: discount !== null,
        currency: entry.regular_price?.currency ?? "USD",
      });
    }
  }
  return out;
}
