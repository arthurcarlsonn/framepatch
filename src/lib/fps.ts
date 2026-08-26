import { FRAME_DATA, type FrameData } from "./frame-data";
import { ENRICHED_FPS, ENRICHED_AT } from "./fps.generated";
import {
  PLATFORMS,
  type ConsoleTarget,
  type Evidence,
  type FpsConfidence,
  type FpsMode,
  type FpsPatch,
  type FpsRecord,
  type PlatformId,
} from "./types";

export { ENRICHED_AT };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "Aug 2026" → "2026-08-01". Curated entries were written as month labels; every generated
 * record carries a real ISO date, and the whole app sorts on ISO.
 */
export function monthLabelToIso(label: string | null | undefined) {
  if (!label) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;
  const [month, year] = label.split(" ");
  const index = MONTHS.indexOf(month);
  if (index < 0 || !/^\d{4}$/.test(year ?? "")) return null;
  return `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

const CONFIDENCE_RANK: Record<FpsConfidence, number> = {
  official: 3,
  measured: 2,
  reported: 1,
  unknown: 0,
};

export function strongest(values: FpsConfidence[]): FpsConfidence {
  return values.reduce<FpsConfidence>(
    (best, next) => (CONFIDENCE_RANK[next] > CONFIDENCE_RANK[best] ? next : best),
    "unknown",
  );
}

export const CONFIDENCE_LABEL: Record<FpsConfidence, string> = {
  official: "Official source",
  measured: "Independently measured",
  reported: "Reported",
  unknown: "Not established",
};

/** Best target across a set of modes. `0` when no mode states one — never inferred. */
export function bestOf(modes: FpsMode[]) {
  const targets = modes.map((m) => m.targetFps).filter((n): n is number => typeof n === "number");
  return targets.length ? Math.max(...targets) : 0;
}

// ── curated records ───────────────────────────────────────────────────────────

/**
 * Lifts a hand-written FRAME_DATA entry into the same shape the worker produces, so the app
 * only ever reads one type. Curated entries are treated as `official`: a human checked them.
 */
function fromCurated(slug: string, frame: FrameData): FpsRecord {
  const entries: ConsoleTarget[] = [];

  for (const platform of PLATFORMS) {
    const pair = frame.fps[platform.id];
    if (!pair) continue;
    const modeNames = frame.modes?.[platform.id];
    platform.models.forEach((model, i) => {
      const fps = pair[i];
      const name = modeNames?.[i] ?? "Default";
      entries.push({
        model: model.name,
        modelId: model.id,
        platform: platform.id,
        fps,
        mode: modeNames?.[i],
        modes: [{ name, targetFps: fps, resolution: null, unlocked: false, vrr: false, note: null }],
        appType: frame.native?.includes(platform.id) ? "native" : "backcompat",
        confidence: "official",
        primary: i === 0,
      });
    });
  }

  const patches: FpsPatch[] = [];
  if (frame.patch) {
    const best = Math.max(0, ...entries.filter((e) => e.primary).map((e) => e.fps));
    patches.push({
      version: null,
      date: monthLabelToIso(frame.patch.date),
      titleId: null,
      previousFps: frame.prevFps ?? null,
      newFps: best || null,
      changedFps: Boolean(frame.prevFps && best > frame.prevFps),
      // The curated `type` is already written as a sentence ("Patched from 30 FPS to 60 FPS");
      // the numbers travel in previousFps/newFps rather than being spliced back into it.
      label: frame.patch.type,
      url: null,
      publisher: frame.patch.source ?? "Official patch notes",
    });
  }
  for (const event of frame.history ?? []) {
    if (patches.some((p) => p.date === monthLabelToIso(event.date))) continue;
    patches.push({
      version: null,
      date: monthLabelToIso(event.date),
      titleId: null,
      previousFps: null,
      newFps: null,
      changedFps: false,
      label: event.label,
      url: null,
      publisher: null,
    });
  }

  return {
    slug,
    entries,
    patches,
    verdict: frame.verdict,
    note: frame.note ?? null,
    requested: Boolean(frame.requested),
    confidence: "official",
    lastVerified: monthLabelToIso(frame.patch?.verified ?? frame.patch?.date) ?? null,
    evidence: [],
    origin: "curated",
  };
}

const CURATED = new Map<string, FpsRecord>(
  Object.entries(FRAME_DATA).map(([slug, frame]) => [slug, fromCurated(slug, frame)]),
);

// ── the join ──────────────────────────────────────────────────────────────────

/**
 * FramePatch's answer for a title.
 *
 * A hand-curated entry always wins: it was checked by a person and the worker must never
 * quietly overwrite it. Everything else comes from `pnpm enrich`, and a title neither has an
 * entry for stays undocumented rather than being assumed to run at 30 FPS.
 */
export function fpsRecordFor(slug: string): FpsRecord | undefined {
  return CURATED.get(slug) ?? ENRICHED_FPS[slug];
}

/** Every model row a record documents on one platform, flagship first. */
export function entriesOn(record: FpsRecord, platform: PlatformId) {
  return record.entries.filter((e) => e.platform === platform);
}

/** Platforms a record carries a figure for — adds consoles IGDB does not list the game on. */
export function platformsIn(record: FpsRecord): PlatformId[] {
  return [...new Set(record.entries.map((e) => e.platform))];
}

/** Sources behind a record, strongest first, de-duplicated by URL. */
export function rankedEvidence(record: FpsRecord): Evidence[] {
  const seen = new Map<string, Evidence>();
  for (const source of record.evidence) {
    const existing = seen.get(source.url);
    if (!existing || source.tier < existing.tier) seen.set(source.url, source);
  }
  return [...seen.values()].sort((a, b) => a.tier - b.tier);
}

/** The patch that actually changed the frame rate, newest first. */
export function fpsChangingPatch(record: FpsRecord) {
  return record.patches
    .filter((p) => p.changedFps)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
}
