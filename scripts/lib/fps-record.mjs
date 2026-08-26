/**
 * Turns one extraction into the record the site reads.
 *
 * This is where the "never infer" rule is enforced in code rather than in a prompt: a mode
 * without a verbatim quote, or one citing a URL that was never supplied, is dropped. Whatever
 * the model claims about confidence is capped at what its sources can actually support, so a
 * figure quoted from a forum cannot present itself as official.
 */
import { CONSOLE_MODEL_NAME, PLATFORMS, PLATFORM_OF_MODEL } from "../../src/lib/types.ts";
import { capConfidence, classify, strongest } from "./evidence.mjs";

/** Flagship model per platform — the row the headline verdict quotes. */
const FLAGSHIP = new Set(PLATFORMS.map((p) => p.models[0].id));

const isPositiveInt = (n) => Number.isInteger(n) && n > 0 && n <= 480;

/**
 * Frame rates that need something other than the retail game on retail hardware.
 *
 * Sources talk about these constantly — a Digital Foundry piece on Red Dead Redemption 2 will
 * mention the 60 FPS unlock mod for exploited consoles in the same breath as the locked 30 the
 * game actually ships at. Taking the higher number there would put "Runs at 60 FPS on PS5" on
 * a page about a game that does not, which is the worst failure this site can have.
 */
const NOT_RETAIL =
  /\b(mod|mods|modded|modding|jailbreak|jailbroken|exploit|exploited|homebrew|emulator|emulation|unofficial|custom firmware|cfw|hypothetical|rumou?red)\b/i;

function cleanMode(mode, allowedUrls) {
  if (!mode?.name) return null;
  // A claim we cannot point at is not a claim.
  if (!mode.quote?.trim() || !allowedUrls.has(mode.sourceUrl)) return null;
  if (NOT_RETAIL.test(`${mode.name} ${mode.note ?? ""} ${mode.quote}`)) return null;
  return {
    name: String(mode.name).slice(0, 60),
    targetFps: isPositiveInt(mode.targetFps) ? mode.targetFps : null,
    resolution: mode.resolution?.trim() || null,
    unlocked: Boolean(mode.unlocked),
    vrr: Boolean(mode.vrr),
    note: mode.note?.trim() || null,
    quote: mode.quote.trim().slice(0, 240),
    sourceUrl: mode.sourceUrl,
  };
}

/** Best stated target across a model's modes. `0` when no mode states one. */
function bestOf(modes) {
  const targets = modes.map((m) => m.targetFps).filter(isPositiveInt);
  return targets.length ? Math.max(...targets) : 0;
}

/** The mode the headline figure comes from — named only when the model offers a choice. */
function headlineMode(modes, fps) {
  if (modes.length < 2) return modes[0]?.name && modes[0].name !== "Default" ? modes[0].name : undefined;
  return modes.find((m) => m.targetFps === fps)?.name;
}

function toEntry(raw, allowedUrls, owners) {
  const platform = PLATFORM_OF_MODEL[raw?.model];
  if (!platform) return null;

  const modes = (raw.modes ?? []).map((m) => cleanMode(m, allowedUrls)).filter(Boolean);
  if (modes.length === 0) return null;

  const fps = bestOf(modes);
  const urls = [...new Set(modes.map((m) => m.sourceUrl))];

  return {
    entry: {
      model: CONSOLE_MODEL_NAME[raw.model],
      modelId: raw.model,
      platform,
      fps,
      mode: headlineMode(modes, fps),
      // Provenance is deliberately dropped here and rebuilt into `evidence`, so a mode row on
      // the site cannot drift from the source list the page renders underneath it.
      modes: modes.map((mode) => ({
        name: mode.name,
        targetFps: mode.targetFps,
        resolution: mode.resolution,
        unlocked: mode.unlocked,
        vrr: mode.vrr,
        note: mode.note,
      })),
      appType: ["native", "backcompat"].includes(raw.appType) ? raw.appType : "unknown",
      confidence: fps > 0 ? capConfidence(raw.confidence ?? "unknown", urls, owners) : "unknown",
      primary: FLAGSHIP.has(raw.model),
    },
    quotes: modes.map((m) => ({ url: m.sourceUrl, quote: m.quote })),
  };
}

function toEvidence(quotes, sources, owners) {
  const byUrl = new Map(sources.map((s) => [s.url, s]));
  const out = new Map();
  for (const { url, quote } of quotes) {
    if (out.has(url)) continue;
    const source = byUrl.get(url);
    const { publisher, tier } = classify(url, owners);
    out.set(url, {
      url,
      title: source?.title ?? null,
      publisher,
      tier,
      date: source?.date ?? null,
      quote,
    });
  }
  return [...out.values()].sort((a, b) => a.tier - b.tier);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isoOr = (value, fallback = null) => (ISO.test(value ?? "") ? value : fallback);

/**
 * Patch timeline: the update that changed the frame rate, plus the most recent versions the
 * patch tracker saw, so a game page shows real dated releases rather than an empty list.
 */
function patchLabel({ previousFps, newFps, version, quote }) {
  const inPatch = version ? ` in patch ${version}` : "";
  if (previousFps && newFps) return `${previousFps} FPS to ${newFps} FPS${inPatch}`;
  if (newFps) return `${newFps} FPS added${inPatch}`;
  return quote.trim().slice(0, 140);
}

/** Community grade. A forum thread may corroborate a patch; it may not assert one. */
const WEAKEST_PATCH_TIER = 5;

function buildPatches(extraction, patchHint, allowedUrls, owners, bestTier) {
  const patches = [];
  const patch = extraction.patch;

  if (patch?.found && patch.quote?.trim()) {
    const previousFps = isPositiveInt(patch.previousFps) ? patch.previousFps : null;
    const newFps = isPositiveInt(patch.newFps) ? patch.newFps : null;
    // Entries are already capped by source tier; patches were not, so "60 FPS added" could
    // reach the homepage on the strength of a YouTube video. The claim is held to the tier of
    // whatever backs it: the linked page if there is one, otherwise the record's best source.
    const patchUrl = allowedUrls.has(patch.url) ? patch.url : null;
    const patchTier = patchUrl ? classify(patchUrl, owners).tier : bestTier;
    const changedFps = Boolean(
      patch.changedFps &&
        newFps &&
        (previousFps === null || newFps > previousFps) &&
        patchTier <= WEAKEST_PATCH_TIER,
    );
    patches.push({
      version: patch.version?.trim() || patchHint?.latestVersion || null,
      date: isoOr(patch.date, patchHint?.latestDate ?? null),
      titleId: patchHint?.titleId ?? null,
      previousFps,
      newFps,
      changedFps,
      // Publishers announce what a patch adds far more often than what it replaced, so the
      // "30 FPS to 60 FPS" phrasing is the best case, not the only one. Quoting the page is
      // the last resort — it tends to catch a heading rather than a sentence.
      label: patchLabel({ previousFps, newFps, version: patch.version, quote: patch.quote }),
      url: patchUrl,
      publisher: patch.publisher?.trim() || (patch.url ? classify(patch.url, owners).publisher : null),
    });
  }

  for (const tracked of (patchHint?.patches ?? []).slice(0, 3)) {
    if (!tracked.date || patches.some((p) => p.version === tracked.version)) continue;
    patches.push({
      version: tracked.version,
      date: tracked.date,
      titleId: patchHint.titleId,
      previousFps: null,
      newFps: null,
      changedFps: false,
      label: `Patch ${tracked.version}${tracked.sizeLabel ? ` · ${tracked.sizeLabel}` : ""}`,
      url: patchHint.url,
      publisher: patchHint.tracker,
    });
  }

  return patches.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/**
 * Assembles the record. Returns `null` when nothing survived verification — which is a normal
 * outcome, and better than a made-up figure.
 */
export function buildRecord({ slug, extraction, sources, patchHint, today, owners = [] }) {
  const allowedUrls = new Set(sources.map((s) => s.url));

  // A figure resting only on community posts is not established — `capConfidence` has already
  // knocked it down to "unknown", and an unestablished figure does not go on the site.
  const built = (extraction.entries ?? [])
    .map((raw) => toEntry(raw, allowedUrls, owners))
    .filter((b) => b && b.entry.confidence !== "unknown");
  const entries = built.map((b) => b.entry);
  const evidence = toEvidence(built.flatMap((b) => b.quotes), sources, owners);
  const bestTier = evidence.length ? Math.min(...evidence.map((e) => e.tier)) : Infinity;

  const patches = buildPatches(extraction, patchHint, allowedUrls, owners, bestTier);
  if (entries.length === 0 && patches.length === 0) return null;

  const documented = entries.filter((e) => e.fps > 0);

  // A flagship stuck at 30 with no frame rate patch on record is what the "still waiting" rails
  // are for. Derived from the entries, never asserted by the extractor.
  const requested =
    documented.some((e) => e.primary && e.fps <= 30) && !patches.some((p) => p.changedFps);

  return {
    slug,
    entries,
    patches,
    verdict: extraction.verdict?.trim() || null,
    note: extraction.note?.trim() || null,
    requested,
    confidence: strongest(documented.map((e) => e.confidence)),
    lastVerified: documented.length ? today : null,
    evidence,
    origin: "enriched",
    patchSeen: patchHint?.latestVersion ?? null,
  };
}
