/**
 * Microsoft DisplayCatalog — the public endpoint the Xbox store front-end itself calls.
 * No key, no approval. We already hold the product id from IGDB's external_games
 * (source 11 Microsoft / 31 Xbox Marketplace), so no search step is needed.
 */
import { getJson } from "../lib/http.mjs";

const ENDPOINT = "https://displaycatalog.mp.microsoft.com/v7.0/products";
const MARKET = "US";
/** DisplayCatalog wants a correlation vector header; any well-formed value works. */
const MS_CV = "DGU1mcuYo0WMMp+F.1";

/** Attributes worth surfacing on a frame rate site. */
const NOTABLE = new Set(["Capability4k", "CapabilityHDR", "ConsoleGen9Optimized", "ConsoleCrossGen", "CapabilityVRR", "Capability120fps"]);

export const XBOX_STORE_URL = (productId) => `https://www.xbox.com/en-US/games/store/_/${productId}`;

function normalize(product) {
  const localized = product.LocalizedProperties?.[0] ?? {};
  const props = product.Properties ?? {};
  const skus = product.DisplaySkuAvailabilities ?? [];

  let price = null;
  let msrp = null;
  let downloadBytes = null;
  let installBytes = null;
  const editions = [];

  for (const entry of skus) {
    const sku = entry.Sku ?? {};
    const availability = entry.Availabilities?.[0];
    const skuPrice = availability?.OrderManagementData?.Price;
    const title = sku.LocalizedProperties?.[0]?.SkuTitle;

    if (skuPrice && skuPrice.MSRP > 0) {
      // Cheapest purchasable SKU is the headline price; extra SKUs are trials/bundles.
      if (price === null || skuPrice.ListPrice < price) {
        price = skuPrice.ListPrice;
        msrp = skuPrice.MSRP;
      }
      if (title && !editions.includes(title)) editions.push(title);
    }

    const pkg = sku.Properties?.Packages?.[0];
    if (pkg?.MaxDownloadSizeInBytes) {
      downloadBytes = Math.max(downloadBytes ?? 0, Number(pkg.MaxDownloadSizeInBytes));
    }
    if (pkg?.MaxInstallSizeInBytes) {
      installBytes = Math.max(installBytes ?? 0, Number(pkg.MaxInstallSizeInBytes));
    }
  }

  return {
    productId: product.ProductId,
    title: localized.ProductTitle ?? null,
    url: XBOX_STORE_URL(product.ProductId),
    price,
    msrp,
    onSale: price !== null && msrp !== null && price < msrp,
    currency: "USD",
    downloadBytes,
    installBytes,
    editions: editions.slice(0, 6),
    optimizedFor: props.XboxConsoleGenOptimized ?? [],
    compatibleWith: props.XboxConsoleGenCompatible ?? [],
    capabilities: (props.Attributes ?? []).map((a) => a.Name).filter((n) => NOTABLE.has(n)),
  };
}

/**
 * Fetches up to 20 products per call. Returns a Map of productId → record; a product the
 * catalog does not know about is simply absent.
 */
export async function fetchXboxProducts(productIds) {
  const out = new Map();
  for (let i = 0; i < productIds.length; i += 20) {
    const batch = productIds.slice(i, i + 20);
    const url = `${ENDPOINT}?bigIds=${batch.join(",")}&market=${MARKET}&languages=en-us&MS-CV=${encodeURIComponent(MS_CV)}`;
    const body = await getJson(url, { gapMs: 400 });
    for (const product of body.Products ?? []) {
      out.set(product.ProductId, normalize(product));
    }
  }
  return out;
}
