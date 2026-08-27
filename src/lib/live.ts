/**
 * FramePatch Live — frame rate claims as they land, before they are settled.
 *
 * The enrichment pipeline in scripts/enrich.mjs only ever publishes a figure it can quote a
 * source for, and it runs on a schedule. That is right for the catalogue and wrong for the
 * day a developer says a number out loud on a stream: by the time a nightly pass picks it up
 * the question has already been asked and answered somewhere else.
 *
 * Live is the holding area for exactly that case. Every entry carries the same evidence
 * discipline as a catalogue record — who said it, where, when, and the sentence itself — plus
 * one field the catalogue does not need: `status`, which says how settled the claim is. A
 * claim relayed through a third party is `reported`, never `official`, no matter how senior
 * the person quoted. It is promoted into the catalogue when the pipeline can cite it directly.
 */

export type LiveStatus = "official" | "reported" | "measured" | "disputed";

export type LiveSource = {
  label: string;
  url: string;
  /** 1 publisher · 2 platform holder · 3 Digital Foundry · 4 capture channels · 5 press · 6 community. */
  tier: number;
  /** What this source adds that the others do not — shown next to the link. */
  role: string;
};

export type LiveEntry = {
  id: string;
  /** ISO date the claim was made public. Sorts the feed and stamps the article schema. */
  date: string;
  game: string;
  /** Catalogue slug once the title exists in it; null while the game is unreleased. */
  slug: string | null;
  headline: string;
  /** One-sentence summary — the answer, before any of the caveats. */
  standfirst: string;
  status: LiveStatus;
  fps: number | null;
  /** Console names exactly as the claim states them. */
  consoles: string[];
  /** Who originated the statement, as distinct from who published it. */
  attributedTo: string;
  sources: LiveSource[];
  /** Body copy, one string per paragraph. */
  body: string[];
  /** What would move this from `reported` to `official`. */
  whatWouldSettleIt: string;
};

export const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  official: "Official",
  reported: "Reported",
  measured: "Independently measured",
  disputed: "Disputed",
};

export const LIVE_ENTRIES: LiveEntry[] = [
  {
    id: "gta-6-30-fps-all-consoles",
    date: "2026-08-27",
    game: "Grand Theft Auto VI",
    slug: null,
    headline: "GTA 6 runs at 30 FPS on every console, Rockstar's co-director says",
    standfirst:
      "Rob Nelson told a preview group that Grand Theft Auto VI targets 30 FPS across PS5, " +
      "PS5 Pro and Xbox Series X|S alike, with a 60 FPS mode still an open question.",
    status: "reported",
    fps: 30,
    consoles: ["PlayStation 5", "PlayStation 5 Pro", "Xbox Series X", "Xbox Series S"],
    attributedTo: "Rob Nelson, Head of Development and co-director, Rockstar North",
    sources: [
      {
        label: "Flow Games — Exclusivo: GTA 6 rodará em 30 fps em todos os consoles",
        url: "https://flowgames.gg/exclusivo-gta-6-rodara-em-30-fps-em-todos-os-consoles/",
        tier: 5,
        role: "First outlet to publish the figure, 27 August 2026",
      },
      {
        label: "Gameplayrj — Davy Jones, live from the Rockstar North preview",
        url: "https://www.youtube.com/live/NWERtow-CDI",
        tier: 4,
        role: "The stream the claim was relayed on",
      },
    ],
    body: [
      "Rockstar North's Head of Development and co-director Rob Nelson told a small preview " +
        "group visiting the studio in Edinburgh that Grand Theft Auto VI targets 30 frames per " +
        "second on console, and that the target does not change between hardware tiers. PS5, " +
        "PS5 Pro, Xbox Series X and Xbox Series S are all described as running to the same " +
        "figure.",
      "The 60 FPS question was left open rather than closed. Nelson's answer, as relayed, was " +
        "that the technical team still has to be consulted on whether a 60 FPS option arrives " +
        "at launch or later — which is a different statement from ruling one out, and a " +
        "different statement again from promising one.",
      "That pattern is not new for the studio. Grand Theft Auto V shipped at 30 FPS on Xbox " +
        "360 and PlayStation 3 in 2013 and did not get a 60 FPS performance mode on console " +
        "until the current-generation release nearly nine years later. Red Dead Redemption 2 " +
        "has never had one.",
      "FramePatch is carrying this as reported rather than official. The figure originates " +
        "with Rockstar, which is as senior as a source gets — but it reached the public through " +
        "a preview attendee and an outlet, not through anything Rockstar has published itself. " +
        "That distinction is the whole point of the confidence rating, so it holds here even " +
        "though the number is very likely correct.",
    ],
    whatWouldSettleIt:
      "A Rockstar Newswire post, a PlayStation or Xbox store listing naming the graphics modes, " +
      "or a hands-on frame time measurement. Any of the three would move this to official or " +
      "measured and put it in the catalogue proper.",
  },
];

export const LIVE_BY_ID = new Map(LIVE_ENTRIES.map((entry) => [entry.id, entry]));

/** Newest first — the only order the feed is ever read in. */
export function liveFeed() {
  return [...LIVE_ENTRIES].sort((a, b) => b.date.localeCompare(a.date));
}

export function liveEntry(id: string) {
  return LIVE_BY_ID.get(id);
}

/** Entries about one title, for the rail on its game or hub page. */
export function liveFor(game: string) {
  return liveFeed().filter((entry) => entry.game === game);
}

export const LIVE_UPDATED_AT = liveFeed()[0]?.date ?? null;
