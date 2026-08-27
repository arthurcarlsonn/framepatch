/**
 * Titles the catalogue is always seeded with, by IGDB slug.
 *
 * IGDB discovery pulls the most-rated titles per console, which misses games that are
 * interesting to FramePatch for reasons ratings do not capture — a flagship still stuck at 30,
 * a backwards-compatible title IGDB files under its original platform. These are fetched by
 * slug on every sync and kept even when IGDB lists no current-gen console for them.
 *
 * This is a coverage list, not a data source. Frame rates come from `pnpm enrich` for every
 * title alike; nothing here is exempt from having to cite a source.
 */
export const SEED_SLUGS = [
  "mafia-definitive-edition",
  "fallout-4",
  "elden-ring",
  "cyberpunk-2077",
  "the-witcher-3-wild-hunt",
  "red-dead-redemption-2",
  "bloodborne",
  "batman-arkham-knight",
  "grand-theft-auto-v",
  "la-noire",
  "horizon-forbidden-west",
  "god-of-war-ragnarok",
  "the-last-of-us-part-ii",
  "uncharted-legacy-of-thieves-collection",
  "dishonored-2",
  "doom-eternal",
  "ghost-of-tsushima",
  "returnal",
  "resident-evil-4",
  "baldurs-gate-iii",
  "hogwarts-legacy",
  "final-fantasy-vii-rebirth",
  "alan-wake-ii",
  "silent-hill-2",
  "dragons-dogma-ii",
  "star-wars-jedi-survivor",
  "gotham-knights",
  "sekiro-shadows-die-twice",
  "dark-souls-iii",
  "control-ultimate-edition",
  "forza-horizon-5",
  "halo-infinite",
  "gears-5",
  "the-legend-of-zelda-tears-of-the-kingdom",
  "metroid-prime-4-beyond",
  "mario-kart-world",
  "super-mario-odyssey",
  "pokemon-scarlet",
  "xenoblade-chronicles-3",
  // Unreleased, so IGDB carries no console list and no storefront has a listing yet. Seeded
  // anyway: the moment either appears, the catalogue picks the title up and /gta-6 can start
  // linking to a real record instead of standing alone. See src/lib/gta6.ts.
  "grand-theft-auto-vi",
];
