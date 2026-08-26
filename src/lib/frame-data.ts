import type { PlatformId } from "./types";

/** Frame rate for [flagship model, secondary model] — see PLATFORMS in ./types. */
export type FpsPair = [primary: number, secondary: number];

export type FrameData = {
  fps: Partial<Record<PlatformId, FpsPair>>;
  modes?: Partial<Record<PlatformId, [string?, string?]>>;
  /** Platforms with a native next-gen app; anything else runs via backwards compatibility. */
  native?: PlatformId[];
  /** The sentence under the headline verdict on a game page. */
  verdict: string;
  patch?: { type: string; date: string; verified?: string; source?: string };
  prevFps?: number;
  /** Short line in a card footer. */
  note?: string;
  requested?: boolean;
  history?: { date: string; label: string }[];
};

/**
 * FramePatch's own layer, keyed by IGDB slug.
 *
 * IGDB supplies every other field on a game — title, cover, companies, genres, ratings,
 * store links — but it has no frame rate data, so this is hand-curated and verified.
 * A game IGDB returns that is missing from this map renders as "awaiting verification".
 */
export const FRAME_DATA: Record<string, FrameData> = {
  "mafia-definitive-edition": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    verdict: "Runs at 60 FPS via backwards compatibility patch. Native PS4 version enhanced for PS5. No PS5 native version available.",
    patch: { type: "Patched from 30 FPS to 60 FPS", date: "Aug 2026" },
    prevFps: 30,
    note: "Updated Aug 2026",
    history: [
      { date: "Aug 2026", label: "60 FPS patch added via backwards compatibility update" },
      { date: "Mar 2025", label: "Stability fixes" },
      { date: "Sep 2020", label: "Launch" },
    ],
  },
  "mafia-ii-definitive-edition": {
    fps: { ps5: [60, 60], xsx: [60, 60] },
    verdict: "Backwards compatible PS4 app. Frame rate cap lifted in the September 2026 update.",
    patch: { type: "Patched from 30 FPS to 60 FPS", date: "Sep 2026" },
    prevFps: 30,
    note: "Updated Sep 2026",
  },
  "mafia-iii-definitive-edition": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    verdict: "Unlocked to 60 FPS on current-gen hardware. Series S remains capped at 30 FPS.",
    patch: { type: "Patched from 30 FPS to 60 FPS", date: "Oct 2026" },
    prevFps: 30,
    note: "Updated Oct 2026",
  },
  "assassins-creed-syndicate": {
    fps: { ps5: [60, 60], xsx: [60, 60] },
    verdict: "The 2024 update unlocked 60 FPS on PS5 and Xbox Series consoles via backwards compatibility.",
    patch: { type: "Patched from 30 FPS to 60 FPS", date: "Sep 2026" },
    prevFps: 30,
    note: "Updated Sep 2026",
  },
  "red-dead-redemption": {
    fps: { ps5: [60, 60], xsx: [60, 60], switch: [60, 30] },
    native: ["ps5"],
    verdict: "The next-gen refresh raises the port from 30 FPS to a locked 60 FPS on PS5 and Xbox Series X.",
    patch: { type: "Patched from 30 FPS to 60 FPS", date: "Oct 2026" },
    prevFps: 30,
    note: "Updated Oct 2026",
  },
  "fallout-4": {
    fps: { ps5: [60, 60], xsx: [60, 60] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    verdict: "The next-gen update adds a 60 FPS performance mode alongside a 4K quality mode.",
    patch: { type: "Next-gen update", date: "Apr 2024" },
    prevFps: 30,
    note: "Next-Gen Patch",
  },
  "elden-ring": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    modes: { ps5: ["Performance mode", "Ray tracing off"], xsx: ["Performance mode", "Quality only"] },
    native: ["ps5", "xsx"],
    verdict: "Native current-gen version targets 60 FPS in performance mode. Series S is locked to 30 FPS.",
    note: "Optimized Play",
  },
  "cyberpunk-2077": {
    fps: { ps5: [60, 60], xsx: [60, 30], switch: [40, 30] },
    modes: {
      ps5: ["Performance mode", "Ray tracing performance"],
      switch: ["Handheld 30 / docked 40", "Not available"],
    },
    native: ["ps5", "xsx", "switch"],
    verdict: "Native current-gen build. Performance mode targets 60 FPS; the ray tracing mode drops to 30 FPS.",
    note: "Ray Tracing Performance",
  },
  "marvels-spider-man-2": {
    fps: { ps5: [120, 120] },
    modes: { ps5: ["120Hz VRR performance", "120Hz VRR performance"] },
    native: ["ps5"],
    verdict: "Supports a 120Hz performance mode on compatible displays with VRR enabled.",
    note: "120Hz Supported",
  },
  "the-witcher-3-wild-hunt": {
    fps: { ps5: [60, 60], xsx: [60, 60], switch: [60, 30] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5", "xsx"],
    verdict: "The Complete Edition next-gen patch adds a 60 FPS performance mode on current-gen consoles.",
    patch: { type: "Complete Edition next-gen patch", date: "Dec 2022" },
    prevFps: 30,
    note: "Complete Edition Patch",
  },
  "red-dead-redemption-2": {
    fps: { ps5: [30, 30], xsx: [30, 30] },
    verdict: "Still runs the PS4 Pro / Xbox One X build through backwards compatibility. No 60 FPS patch has been released.",
    note: "No frame rate patch",
    requested: true,
  },
  "bloodborne": {
    fps: { ps5: [30, 30] },
    verdict: "Locked to 30 FPS through backwards compatibility. The most requested frame rate patch on FramePatch.",
    note: "No frame rate patch",
    requested: true,
  },
  "batman-arkham-knight": {
    fps: { ps5: [30, 30], xsx: [30, 30] },
    verdict: "Runs the last-gen build at a locked 30 FPS. No current-gen frame rate update.",
    note: "No frame rate patch",
    requested: true,
  },
  "grand-theft-auto-v": {
    fps: { ps5: [60, 60], xsx: [60, 60] },
    modes: { ps5: ["Performance mode", "Performance RT"] },
    native: ["ps5", "xsx"],
    verdict: "The current-gen edition adds a 60 FPS performance mode and ray traced reflections.",
    note: "Next-Gen Edition",
  },
  "la-noire": {
    fps: { ps5: [60, 60], xsx: [60, 60], switch: [60, 30] },
    verdict: "The remaster runs at 60 FPS on current-gen consoles through backwards compatibility.",
    patch: { type: "Complete Edition patch", date: "Jul 2026" },
    prevFps: 30,
    note: "Complete Edition Patch",
  },
  "horizon-forbidden-west": {
    fps: { ps5: [60, 60] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5"],
    verdict: "Native PS5 app with a 60 FPS performance mode and a 30 FPS resolution mode.",
    note: "Native PS5 App",
  },
  "god-of-war-ragnarok": {
    fps: { ps5: [120, 120] },
    modes: { ps5: ["High frame rate performance", "High frame rate performance"] },
    native: ["ps5"],
    verdict: "Offers a 120Hz high frame rate performance mode on compatible displays.",
    note: "120Hz Supported",
  },
  "the-last-of-us-part-ii": {
    fps: { ps5: [60, 60] },
    verdict: "Remastered edition targets 60 FPS. The PS4 build is unlocked to 60 FPS on PS5.",
    patch: { type: "60 FPS patch", date: "May 2021" },
    prevFps: 30,
    note: "Backwards Compatible",
  },
  "uncharted-legacy-of-thieves-collection": {
    fps: { ps5: [120, 120] },
    modes: { ps5: ["Performance+ 120Hz", "Performance+ 120Hz"] },
    native: ["ps5"],
    verdict: "The Performance+ mode targets 120 FPS at 1080p on compatible displays.",
    note: "Native PS5 App",
  },
  "dishonored-2": {
    fps: { ps5: [30, 30], xsx: [30, 30] },
    verdict: "Still runs the last-gen build at 30 FPS. No current-gen frame rate update announced.",
    note: "No frame rate patch",
    requested: true,
  },
  "starfield": {
    fps: { xsx: [30, 30], ps5: [30, 30] },
    modes: { xsx: ["Visuals mode", "Visuals mode"] },
    native: ["xsx", "ps5"],
    verdict: "Ships locked to 30 FPS in the default visuals mode. A 60 FPS option is available only on Series X with reduced resolution.",
    note: "30 FPS default",
    requested: true,
  },
  "doom-eternal": {
    fps: { ps5: [120, 120], xsx: [120, 120], switch: [60, 30] },
    modes: { ps5: ["120Hz performance", "120Hz performance"] },
    native: ["ps5", "xsx"],
    verdict: "The next-gen update adds 120Hz support alongside ray tracing on current-gen consoles.",
    patch: { type: "Next-gen update", date: "Jun 2021" },
    prevFps: 60,
    note: "120Hz Supported",
  },
  "ghost-of-tsushima": {
    fps: { ps5: [60, 60] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5"],
    verdict: "The Director's Cut adds a native PS5 build with a 60 FPS performance mode.",
    note: "Director's Cut",
  },
  "returnal": {
    fps: { ps5: [60, 60] },
    native: ["ps5"],
    verdict: "Native PS5 app with a locked 60 FPS target at dynamic 4K.",
    note: "Native PS5 App",
  },
  "ratchet-and-clank-rift-apart": {
    fps: { ps5: [120, 120] },
    modes: { ps5: ["Performance RT 120Hz", "Performance RT 120Hz"] },
    native: ["ps5"],
    verdict: "Supports a 120Hz performance mode with ray traced reflections enabled.",
    note: "120Hz Supported",
  },
  "resident-evil-4": {
    fps: { ps5: [120, 120], xsx: [120, 60], switch: [60, 30] },
    modes: { ps5: ["Performance 120Hz", "Performance 120Hz"] },
    native: ["ps5", "xsx", "switch"],
    verdict: "Native current-gen build with 120Hz support on PS5 and Series X.",
    note: "120Hz Supported",
  },
  "baldurs-gate-iii": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    modes: { ps5: ["Performance mode", "Performance mode"], xsx: ["Performance mode", "Split screen 30"] },
    native: ["ps5", "xsx"],
    verdict: "60 FPS in performance mode. Split screen co-op drops the target to 30 FPS.",
    note: "Performance Mode",
  },
  "hogwarts-legacy": {
    fps: { ps5: [60, 60], xsx: [60, 30], switch: [30, 30] },
    native: ["ps5", "xsx"],
    verdict: "Performance mode targets 60 FPS. Switch version is capped at 30 FPS.",
    note: "Performance Mode",
  },
  "final-fantasy-vii-rebirth": {
    fps: { ps5: [60, 60] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5"],
    verdict: "Performance mode targets 60 FPS. Graphics mode runs at 30 FPS with higher resolution.",
    note: "Performance Mode",
  },
  "alan-wake-ii": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5", "xsx"],
    verdict: "Performance mode targets 60 FPS on PS5 and Series X. Series S is 30 FPS only.",
    note: "Performance Mode",
  },
  "silent-hill-2": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    native: ["ps5", "xsx"],
    verdict: "Performance mode targets 60 FPS with occasional drops in the fog-heavy exterior areas.",
    note: "Performance Mode",
  },
  "dragons-dogma-ii": {
    fps: { ps5: [30, 40], xsx: [30, 30] },
    modes: { ps5: ["Uncapped, ~30 in cities", "Uncapped, up to 40"] },
    native: ["ps5", "xsx"],
    verdict: "Frame rate is uncapped but CPU bound. Expect around 30 FPS in busy settlements even after patches.",
    note: "Uncapped, CPU limited",
    requested: true,
  },
  "star-wars-jedi-survivor": {
    fps: { ps5: [60, 60], xsx: [60, 30] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5", "xsx"],
    verdict: "Performance mode reaches 60 FPS after the post-launch optimisation patches.",
    patch: { type: "Performance optimisation patch", date: "Nov 2023" },
    note: "Performance Mode",
  },
  "gotham-knights": {
    fps: { ps5: [30, 30], xsx: [30, 30] },
    native: ["ps5", "xsx"],
    verdict: "Shipped with a 30 FPS cap. A performance mode was added later but still targets 30 FPS in co-op.",
    note: "No 60 FPS mode",
    requested: true,
  },
  "sekiro-shadows-die-twice": {
    fps: { ps5: [60, 60], xsx: [60, 60] },
    verdict: "Runs the last-gen build unlocked to 60 FPS through backwards compatibility.",
    note: "Backwards Compatible",
  },
  "dark-souls-iii": {
    fps: { ps5: [60, 60], xsx: [60, 60] },
    verdict: "The backwards compatibility update lifts the cap from 30 FPS to 60 FPS.",
    patch: { type: "Patched from 30 FPS to 60 FPS", date: "Feb 2026" },
    prevFps: 30,
    note: "Updated Feb 2026",
  },
  "control-ultimate-edition": {
    fps: { ps5: [60, 60], xsx: [60, 30], switch: [30, 30] },
    modes: { ps5: ["Performance mode", "Performance mode"] },
    native: ["ps5", "xsx"],
    verdict: "Performance mode targets 60 FPS. Graphics mode adds ray tracing at 30 FPS.",
    note: "Performance Mode",
  },
  "forza-horizon-5": {
    fps: { xsx: [60, 60], ps5: [60, 60] },
    modes: { xsx: ["Performance mode", "Performance mode"] },
    native: ["xsx", "ps5"],
    verdict: "Performance mode targets a locked 60 FPS on both Series consoles.",
    note: "Performance Mode",
  },
  "halo-infinite": {
    fps: { xsx: [120, 120] },
    modes: { xsx: ["120Hz performance", "120Hz performance"] },
    native: ["xsx"],
    verdict: "Campaign and multiplayer both support a 120Hz performance mode.",
    note: "120Hz Supported",
  },
  "gears-5": {
    fps: { xsx: [120, 120] },
    modes: { xsx: ["120Hz multiplayer", "120Hz multiplayer"] },
    native: ["xsx"],
    verdict: "The Series X|S update adds 120 FPS multiplayer and a 60 FPS campaign at higher settings.",
    patch: { type: "Series X|S optimisation", date: "Nov 2020" },
    prevFps: 60,
    note: "Optimized for Series X|S",
  },
  "the-legend-of-zelda-tears-of-the-kingdom": {
    fps: { switch: [60, 30] },
    modes: { switch: ["Switch 2 Edition", "Original, 30 FPS cap"] },
    native: ["switch"],
    verdict: "The Switch 2 Edition doubles the target to 60 FPS. The original Switch build stays at 30 FPS.",
    patch: { type: "Switch 2 Edition upgrade", date: "Jun 2025" },
    prevFps: 30,
    note: "Switch 2 Edition",
  },
  "metroid-prime-4-beyond": {
    fps: { switch: [120, 60] },
    modes: { switch: ["120Hz performance", "60 FPS on original Switch"] },
    native: ["switch"],
    verdict: "Switch 2 adds a 120Hz performance mode. The original Switch build targets 60 FPS.",
    note: "120Hz Supported",
  },
  "mario-kart-world": {
    fps: { switch: [60, 30] },
    native: ["switch"],
    verdict: "Locked 60 FPS in single player and online. Four player split screen drops to 30 FPS.",
    note: "Native Switch 2 App",
  },
  "super-mario-odyssey": {
    fps: { switch: [60, 60] },
    native: ["switch"],
    verdict: "Runs at a locked 60 FPS on both Switch generations.",
    note: "Locked 60 FPS",
  },
  "pokemon-scarlet": {
    fps: { switch: [30, 30] },
    native: ["switch"],
    verdict: "Targets 30 FPS on both Switch generations with frequent drops in the open world.",
    note: "No frame rate patch",
    requested: true,
  },
  "xenoblade-chronicles-3": {
    fps: { switch: [30, 30] },
    native: ["switch"],
    verdict: "Locked to 30 FPS. No Switch 2 frame rate upgrade has been announced.",
    note: "No frame rate patch",
    requested: true,
  },
};

export const CURATED_SLUGS = Object.keys(FRAME_DATA);
