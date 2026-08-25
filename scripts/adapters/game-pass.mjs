/**
 * Game Pass catalogue. `catalog.gamepass.com/sigls/v2` returns the product ids in a
 * collection; we intersect those with the Xbox product ids we already resolved, so no
 * extra per-game requests are needed.
 *
 * The sigl payload carries no "date added", so that field is not available from this source.
 */
import { getJson } from "../lib/http.mjs";

const SIGLS = {
  console: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
  pc: "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
  eaPlay: "b8900d09-a491-44cc-916e-32b5acae621b",
};

async function fetchSigl(id) {
  const url = `https://catalog.gamepass.com/sigls/v2?id=${id}&language=en-us&market=US`;
  const body = await getJson(url, { gapMs: 400 });
  return new Set(body.filter((entry) => entry.id).map((entry) => entry.id));
}

/** Returns { console: Set, pc: Set, eaPlay: Set } of Xbox product ids. */
export async function fetchGamePassCatalog() {
  const out = {};
  for (const [key, id] of Object.entries(SIGLS)) {
    try {
      out[key] = await fetchSigl(id);
    } catch (error) {
      // A missing collection should not lose the others.
      console.warn(`  ! Game Pass "${key}" list unavailable: ${error.message}`);
      out[key] = null;
    }
  }
  return out;
}
