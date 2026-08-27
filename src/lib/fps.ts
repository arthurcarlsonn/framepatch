import { ENRICHED_FPS, ENRICHED_AT } from "./fps.generated";
import {
  type Evidence,
  type FpsConfidence,
  type FpsMode,
  type FpsRecord,
  type PlatformId,
} from "./types";

export { ENRICHED_AT };

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

// ── the join ──────────────────────────────────────────────────────────────────

/**
 * FramePatch's answer for a title.
 *
 * Every record comes from `pnpm enrich`, which means every figure on the site carries the
 * source that states it. A title the worker established nothing for stays undocumented rather
 * than being assumed to run at 30 FPS.
 */
export function fpsRecordFor(slug: string): FpsRecord | undefined {
  return ENRICHED_FPS[slug];
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
