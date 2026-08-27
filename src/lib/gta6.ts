/**
 * The Grand Theft Auto VI performance hub.
 *
 * This is the one title FramePatch carries a page for before it is in the catalogue. IGDB has
 * no usable record for an unreleased Rockstar game and the storefronts have no listing, so
 * the enrichment pipeline has nothing to work with — but the frame rate question is being
 * asked now, and answering it is the entire purpose of the site.
 *
 * The content here is hand-written and hand-sourced for that reason. Everything it asserts
 * traces to src/lib/live.ts, which holds the claim, the person it came from and the outlets
 * that carried it. When `grand-theft-auto-vi` lands in the catalogue (it is already in
 * SEED_SLUGS) these pages should cross-link to the record rather than restate it.
 */
import { liveFor } from "./live";

export const GTA6_TITLE = "Grand Theft Auto VI";
export const GTA6_SHORT = "GTA 6";

/** The figure every page on the hub is built around, with its standing. */
export const GTA6_FPS = 30;
export const GTA6_STATUS = "reported" as const;
export const GTA6_ATTRIBUTION = "Rob Nelson, co-director, Rockstar North";

export function gta6Live() {
  return liveFor(GTA6_TITLE);
}

/**
 * One page per question that has a genuinely different answer.
 *
 * The temptation on a title this heavily searched is to mint a page per keyword. That is the
 * doorway pattern, and it is why the list below is short: a console only gets a page where
 * the answer for that console differs from the others, and the two questions that are really
 * one question ("60 FPS mode" and "performance mode") share a page.
 */
export type Gta6Topic = {
  slug: string;
  /** H1 and <title> stem — phrased as the question people type. */
  heading: string;
  title: string;
  description: string;
  /** The one-line answer, rendered above the fold and reused as the FAQ answer. */
  answer: string;
  body: string[];
  faq: { question: string; answer: string }[];
};

const SETTLED_NOTE =
  "Rockstar has published nothing about frame rate itself. FramePatch will move this from " +
  "reported to official the moment it does, or to measured when the retail build can be tested.";

export const GTA6_TOPICS: Gta6Topic[] = [
  {
    slug: "ps5",
    heading: "Does GTA 6 run at 60 FPS on PS5?",
    title: "GTA 6 PS5 frame rate",
    description:
      "Grand Theft Auto VI targets 30 FPS on PlayStation 5, according to Rockstar North's " +
      "co-director. Whether a 60 FPS performance mode arrives is still open.",
    answer:
      "No. GTA 6 targets 30 FPS on PlayStation 5, and a 60 FPS performance mode has not been " +
      "committed to for launch.",
    body: [
      "The figure comes from Rob Nelson, Rockstar North's Head of Development and a co-director " +
        "on the game, speaking to a preview group at the studio in Edinburgh. He gave 30 FPS as " +
        "the console target and did not carve out an exception for PlayStation 5.",
      "The 60 FPS question was answered separately and less firmly: the technical team still " +
        "has to be consulted on whether a performance mode ships at launch or later. That is an " +
        "open question, not a denial — but it is also not a commitment, and treating it as one " +
        "is how a rumour becomes a fact nobody can trace.",
      "For scale, FramePatch has verified a 60 FPS or better target on a large majority of the " +
        "PlayStation 5 titles in its catalogue. A 30 FPS flagship in 2026 is the exception on " +
        "this hardware, not the norm — which is exactly why the claim travelled as fast as it did.",
      SETTLED_NOTE,
    ],
    faq: [
      {
        question: "Is GTA 6 30 FPS on PS5?",
        answer:
          "Rockstar North co-director Rob Nelson has been reported as giving 30 FPS as the " +
          "console target for Grand Theft Auto VI, PlayStation 5 included. Rockstar has not " +
          "published the figure itself, so FramePatch lists it as reported rather than official.",
      },
      {
        question: "Will GTA 6 get a 60 FPS patch on PS5?",
        answer:
          "It has not been ruled out. Nelson said the technical team would need to be consulted " +
          "on whether a 60 FPS option arrives at launch or in a later update. Grand Theft Auto V " +
          "took until its current-generation re-release to get one.",
      },
    ],
  },
  {
    slug: "ps5-pro",
    heading: "Does GTA 6 run at 60 FPS on PS5 Pro?",
    title: "GTA 6 PS5 Pro frame rate",
    description:
      "GTA 6 is reported to target the same 30 FPS on PS5 Pro as on a base PS5 — the mid-gen " +
      "hardware does not buy a higher frame rate.",
    answer:
      "No. The reported 30 FPS target does not change on PS5 Pro. The extra hardware is not " +
      "being spent on frame rate.",
    body: [
      "This is the detail worth stopping on. The claim as relayed is that the target is the same " +
        "across every console tier — PlayStation 5, PlayStation 5 Pro and both Xbox Series " +
        "machines. A PS5 Pro buyer is not being promised a frame rate a base PS5 owner does not get.",
      "That is a defensible engineering choice rather than an odd one. Mid-generation hardware " +
        "is usually spent on resolution, reconstruction quality and stability rather than on " +
        "doubling a frame rate, because doubling the frame rate means halving the frame budget " +
        "for a simulation that was built around the original one. What the Pro does with the " +
        "headroom instead has not been detailed.",
      "Nothing has been said about PSSR, resolution targets or ray tracing behaviour on Pro " +
        "specifically. FramePatch is not going to guess at them: the site's rule is that an " +
        "unstated figure is undocumented, not inferred from the hardware.",
      SETTLED_NOTE,
    ],
    faq: [
      {
        question: "Is GTA 6 60 FPS on PS5 Pro?",
        answer:
          "No. The reported target is 30 FPS on PS5 Pro, the same as on a base PlayStation 5. " +
          "No console tier has been given a higher frame rate target.",
      },
      {
        question: "What does the PS5 Pro improve in GTA 6?",
        answer:
          "Nothing specific has been stated. Rockstar has not detailed resolution, PSSR use or " +
          "ray tracing behaviour on PS5 Pro, and FramePatch does not infer figures that no " +
          "source gives.",
      },
    ],
  },
  {
    slug: "xbox-series-x",
    heading: "What frame rate does GTA 6 run at on Xbox Series X?",
    title: "GTA 6 Xbox Series X frame rate",
    description:
      "GTA 6 is reported to target 30 FPS on Xbox Series X, matching PS5 rather than beating it.",
    answer:
      "30 FPS, the same target given for every other console. Series X is not reported to run " +
      "the game any faster than a PlayStation 5.",
    body: [
      "Rob Nelson's answer covered consoles as a group rather than singling any of them out, and " +
        "Xbox Series X sits inside that group at the same 30 FPS target as PlayStation 5.",
      "Cross-platform parity at 30 FPS is the usual outcome when a target is set by the " +
        "simulation rather than by the GPU. Where FramePatch's catalogue does show a Series X " +
        "and PS5 split, it is almost always a resolution or a dip-under-load difference rather " +
        "than a different target — and no such split has been claimed here.",
      "Whether a 60 FPS mode appears on Xbox is the same open question as on PlayStation, with " +
        "the same non-answer attached: the technical team has to be consulted.",
      SETTLED_NOTE,
    ],
    faq: [
      {
        question: "Is GTA 6 60 FPS on Xbox Series X?",
        answer:
          "Not at launch, on the reported information. Rockstar North's co-director gave 30 FPS " +
          "as the console target without excepting Xbox Series X, and a 60 FPS mode has not been " +
          "committed to.",
      },
    ],
  },
  {
    slug: "xbox-series-s",
    heading: "Will GTA 6 hold 30 FPS on Xbox Series S?",
    title: "GTA 6 Xbox Series S frame rate",
    description:
      "GTA 6 is reported to target 30 FPS on Xbox Series S, the same figure as every other " +
      "console — with the least hardware headroom to hold it.",
    answer:
      "The reported target is 30 FPS, the same as every other console. How comfortably the " +
      "Series S holds it is the part nobody has answered.",
    body: [
      "Series S is covered by the same blanket 30 FPS target. That is the target, though, not a " +
        "measurement — and on Series S the gap between the two has historically been the widest " +
        "of any current-generation console.",
      "The machine's constraint is memory as much as raw GPU throughput, which is what tends to " +
        "bite an open world with a dense simulation running underneath it. FramePatch's own " +
        "Series S records show the pattern: the console reaches the same target as Series X on " +
        "most titles and gets there at a lower resolution.",
      "Nothing has been said about the Series S build's resolution, draw distance or streaming " +
        "behaviour. Until it has, the honest answer is that the target is known and the delivery " +
        "is not.",
      SETTLED_NOTE,
    ],
    faq: [
      {
        question: "Will GTA 6 run at 30 FPS on Xbox Series S?",
        answer:
          "30 FPS is the reported target for Series S along with every other console. No " +
          "measurement of the retail build exists yet, so whether it holds that target under " +
          "load is unverified.",
      },
    ],
  },
  {
    slug: "60-fps",
    heading: "Will GTA 6 ever get a 60 FPS mode?",
    title: "Will GTA 6 have a 60 FPS performance mode?",
    description:
      "Rockstar has not committed to a 60 FPS performance mode for GTA 6 on any console. Here " +
      "is exactly what was said, and what the studio's track record suggests.",
    answer:
      "Unanswered. A 60 FPS mode has not been ruled out or promised — Rockstar's co-director " +
      "said the technical team still has to be consulted.",
    body: [
      "The precise shape of the answer matters more than usual here, because it is being " +
        "reported in both directions. What was said is that 30 FPS is the console target, and " +
        "that whether a 60 FPS option lands at launch or afterwards is something the technical " +
        "team would have to be asked about. That is neither a promise nor a refusal.",
      "Rockstar's history points one way. Grand Theft Auto V launched at 30 FPS in 2013 and " +
        "console players waited until the 2022 current-generation release for a 60 FPS " +
        "performance mode — close to nine years. Red Dead Redemption 2 still does not have one " +
        "on console at all.",
      "The counter-argument is that both of those games predate a generation where a 60 FPS " +
        "performance mode is a near-universal expectation, and where FramePatch can point at " +
        "hundreds of current-generation titles shipping one. A launch without one would be " +
        "conspicuous in a way it simply was not in 2013.",
      "FramePatch's position is that there is nothing to verify yet. A performance mode that " +
        "has not been announced has no frame rate, and the site does not carry figures for " +
        "modes that do not exist. If one is announced, it will appear on the title's record " +
        "with the announcement attached to it.",
    ],
    faq: [
      {
        question: "Has Rockstar confirmed a 60 FPS mode for GTA 6?",
        answer:
          "No. Rockstar has not announced a 60 FPS performance mode for Grand Theft Auto VI on " +
          "any console. The reported position is that 30 FPS is the target and a 60 FPS option " +
          "is still to be discussed internally.",
      },
      {
        question: "Did GTA 5 get a 60 FPS mode?",
        answer:
          "Yes, but not for a long time. Grand Theft Auto V launched at 30 FPS in 2013 and got " +
          "a 60 FPS performance mode with its PlayStation 5 and Xbox Series X|S release in 2022.",
      },
    ],
  },
];

export const GTA6_TOPIC_BY_SLUG = new Map(GTA6_TOPICS.map((topic) => [topic.slug, topic]));

// ── the title itself ──────────────────────────────────────────────────────────

/**
 * Catalogue-shaped facts for a title the catalogue cannot hold yet.
 *
 * IGDB has no usable record and no storefront exposes one, so these are hand-entered — which
 * makes them the only hand-entered facts on the site. Each is limited to what Rockstar has
 * announced or what is corroborated across independent outlets; nothing here is a leak, a
 * rumour or an inference. `sourceNote` on a field says where to be careful.
 */
export type Gta6Fact = { label: string; value: string; note?: string };

export const GTA6_RELEASE_DATE = "2026-11-19";
export const GTA6_DEVELOPER = "Rockstar Games";
export const GTA6_PUBLISHER = "Rockstar Games";
export const GTA6_PLATFORMS = ["PlayStation 5", "Xbox Series X", "Xbox Series S"];

export const GTA6_FACTS: Gta6Fact[] = [
  { label: "Release date", value: "19 November 2026", note: "Announced by Rockstar, reaffirmed by Take-Two" },
  { label: "Platforms", value: "PS5, Xbox Series X|S", note: "No PC version has been announced" },
  { label: "Developer", value: "Rockstar Games" },
  { label: "Publisher", value: "Rockstar Games (Take-Two Interactive)" },
  { label: "Setting", value: "Vice City, state of Leonida" },
  { label: "Protagonists", value: "Jason Duval and Lucia Caminos" },
  { label: "Frame rate", value: "30 FPS on every console", note: "Reported, not published by Rockstar" },
  { label: "Pre-load", value: "12 November 2026", note: "One week before launch" },
];

/** Regions of Leonida Rockstar has named. Useful copy, and none of it is leaked material. */
export const GTA6_LOCATIONS = [
  "Vice City",
  "Ambrosia County",
  "Grassrivers",
  "Leonida Keys",
  "Mount Kalaga National Park",
  "Port Gellhorn",
];

export const GTA6_ABOUT: string[] = [
  "Grand Theft Auto VI returns the series to Vice City, Rockstar's take on Miami, and widens " +
    "it into the surrounding state of Leonida — a fictionalised Florida taking in the Keys, " +
    "the Everglades-style wetlands of Grassrivers, the national park at Mount Kalaga and the " +
    "backwater town of Port Gellhorn.",
  "It is the first mainline Grand Theft Auto built around a pair of protagonists who are " +
    "together from the start: Jason Duval and Lucia Caminos, criminals thrown into a " +
    "state-spanning conspiracy after a job goes wrong. Lucia is the first woman to lead a " +
    "mainline Grand Theft Auto story.",
  "It is also the first Rockstar open world built only for current-generation consoles. There " +
    "is no last-generation version holding the design back, which is part of why the reported " +
    "30 FPS target drew the reaction it did — the hardware floor is higher than it has ever " +
    "been for a Rockstar launch, and the frame rate target is not.",
];
