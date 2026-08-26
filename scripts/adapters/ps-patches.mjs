/**
 * PROSPEROPatches (PS5) and ORBISPatches (PS4) — the patch trigger.
 *
 * Both sites poll Sony's own update servers and publish every version they see, which makes
 * them the cheapest possible answer to "did this game get patched?". Neither says what a patch
 * *did*, so this adapter only detects the event; scripts/enrich.mjs takes it from there.
 *
 * The join key is the PlayStation title id (PPSA… on PS5, CUSA… on PS4), which is embedded in
 * the store product id we already cache — `UP0700-PPSA04609_00-ELDENRING0000000`.
 *
 * Their patch list is loaded over XHR, not rendered into the page: the title page carries a
 * per-title `key`, and `POST /api/internal/loadpatches` returns the versions. Full changelog
 * text sits behind `/changelogs`, which is reCAPTCHA-gated — we do not touch it. The short
 * `changelog_preview` ORBISPatches returns for free is used where it exists.
 */
import { HttpError, getText, request } from "../lib/http.mjs";

const TRACKERS = {
  PPSA: { name: "PROSPEROPatches", base: "https://prosperopatches.com", console: "PS5" },
  CUSA: { name: "ORBISPatches", base: "https://orbispatches.com", console: "PS4" },
  // Japanese and Asian PS4 SKUs, same database.
  PCAS: { name: "ORBISPatches", base: "https://orbispatches.com", console: "PS4" },
  PLAS: { name: "ORBISPatches", base: "https://orbispatches.com", console: "PS4" },
};

/** Polite spacing — this is someone's hobby project, not a commercial API. */
const GAP_MS = 1_500;

/** `UP0700-PPSA04609_00-ELDENRING0000000` → `PPSA04609`. */
export function titleIdFrom(productId) {
  if (!productId) return null;
  return /(?:^|-)((?:PPSA|CUSA|PCAS|PLAS)\d{5})/.exec(productId)?.[1] ?? null;
}

export function trackerFor(titleId) {
  return TRACKERS[titleId?.slice(0, 4)] ?? null;
}

/**
 * The page carries the title id and a per-title key its own script posts back. Two markup
 * shapes are in the wild — PROSPEROPatches puts them on the element, ORBISPatches packs them
 * into a `data-loadparams` object — so accept either.
 */
function paramsFrom(html) {
  const direct = /data-titleid="([^"]+)"\s+data-key="([0-9a-f]+)"/.exec(html);
  if (direct) return { titleid: direct[1], key: direct[2] };

  const packed = /id="dynpatch"[^>]*data-loadparams="\{([^"]+)\}"/.exec(html);
  if (packed) {
    const titleid = /['"]titleid['"]\s*:\s*['"]([A-Z0-9]+)['"]/.exec(packed[1])?.[1];
    const key = /['"]key['"]\s*:\s*['"]([0-9a-f]+)['"]/.exec(packed[1])?.[1];
    if (titleid && key) return { titleid, key };
  }
  return null;
}

/** Their client posts a JSON body under a form content type; the server only accepts that pair. */
async function loadPatches(base, params) {
  const res = await request(`${base}/api/internal/loadpatches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json",
      Referer: `${base}/${params.titleid}`,
    },
    body: JSON.stringify(params),
    gapMs: GAP_MS,
    retries: 2,
  });
  const body = await res.json();
  return body?.success ? (body.patches ?? []) : [];
}

/** The two sites name the same two fields differently. */
function normalize(patch) {
  const version = patch.content_ver ?? patch.version ?? null;
  const raw = patch.import_date ?? patch.creation_date ?? null;
  return {
    version,
    date: raw ? raw.slice(0, 10) : null,
    isLatest: Boolean(patch.is_latest),
    sizeLabel: patch.filesize ?? null,
    requiredFirmware: patch.required_firmware ?? null,
    /** ORBISPatches returns a truncated changelog for free; PROSPEROPatches does not. */
    changelogPreview: patch.changelog_preview?.trim() || null,
  };
}

/**
 * Every patch a tracker knows about for one title, newest first.
 *
 * Returns `null` when the title is not in the tracker's database — that is data, not a
 * failure, and the caller caches it so the title is not retried every run.
 */
export async function fetchPatchHistory(titleId) {
  const tracker = trackerFor(titleId);
  if (!tracker) return null;

  const url = `${tracker.base}/${titleId}`;
  let html;
  try {
    html = await getText(url, { gapMs: GAP_MS, retries: 2 });
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }

  // An unknown title id serves a 200 with a 404 body, so absence of the patch container is
  // "not in the database" — only a container without a key means the markup moved.
  if (!html.includes("dynpatch")) return null;

  const params = paramsFrom(html);
  if (!params) {
    // Loud, because a missed key silently disables patch detection for every title.
    throw new Error(`${tracker.name} markup changed — no titleid/key on ${url}`);
  }

  const patches = (await loadPatches(tracker.base, params))
    .map(normalize)
    .filter((p) => p.version)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  if (patches.length === 0) return null;

  const latest = patches.find((p) => p.isLatest) ?? patches[0];
  return {
    tracker: tracker.name,
    console: tracker.console,
    titleId,
    url,
    latestVersion: latest.version,
    latestDate: latest.date,
    patches: patches.slice(0, 15),
  };
}
