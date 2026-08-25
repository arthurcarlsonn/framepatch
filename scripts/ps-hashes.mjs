/**
 * Prints how to re-capture the PlayStation Store persisted-query hashes.
 *
 * Sony allowlists these hashes server-side and does not ship them in the page bundle —
 * the client computes them at runtime — so they cannot be derived offline. They have to
 * be read off the store's own network requests, which takes a browser.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { currentBuildId } from "./adapters/playstation-store.mjs";
import { ROOT } from "./lib/store.mjs";

const file = path.join(ROOT, "data/playstation-queries.json");
const cached = JSON.parse(await readFile(file, "utf8"));

let live = null;
try {
  live = await currentBuildId();
} catch (error) {
  console.warn(`Could not read the live build id: ${error.message}\n`);
}

console.log(`cached build : ${cached.buildId} (captured ${cached.capturedAt})`);
console.log(`live build   : ${live ?? "unknown"}`);

if (live && live === cached.buildId) {
  console.log("\nHashes are current — nothing to do.");
  process.exit(0);
}

console.log(`
The store has redeployed, so the hashes may no longer be allowlisted. To refresh:

  1. Open a PlayStation Store product page in a browser, e.g.
     https://store.playstation.com/en-us/product/UP0700-PPSA04610_00-ELDENRING0000000
     then open a concept page too:
     https://store.playstation.com/en-us/concept/10000333

  2. Run this in the devtools console on each page:

     JSON.stringify(Object.fromEntries(
       performance.getEntriesByType('resource')
         .filter(e => e.name.includes('graphql'))
         .map(e => { const u = new URL(e.name);
           return [u.searchParams.get('operationName'),
                   JSON.parse(u.searchParams.get('extensions')).persistedQuery.sha256Hash]; })))

  3. Copy these four operations into data/playstation-queries.json and set
     "buildId": "${live}" and today's date:

       productRetrieveForCtasWithPrice
       conceptRetrieveForCtasWithPrice
       wcaProductEditionsRetrive
       wcaConceptEditionsRetrive

  4. pnpm sync --only=playstationStore

Until then the sync keeps serving the last prices that synced.`);
