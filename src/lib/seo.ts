/**
 * Canonical URLs and structured data for every page FramePatch renders.
 *
 * Two rules hold everywhere in here:
 *
 * 1. Structured data may only restate what the page already shows. Google treats schema that
 *    contradicts the visible page as spam, and FramePatch's whole claim is that a figure is
 *    only ever as good as the source under it — so a JSON-LD block never invents a frame rate
 *    the record does not carry.
 * 2. Every programmatic page declares its own canonical. Without one, the collection pages
 *    (which are query-shaped and overlap heavily) get folded into each other by the crawler.
 */
import type { Game, PlatformId } from "./types";

export const SITE_URL = "https://framepatch.app";
export const SITE_NAME = "FramePatch";
export const SITE_TAGLINE = "Console frame rate verification";

/** Absolute URL for a site-relative path — required by JSON-LD and Open Graph alike. */
export function absolute(path: string) {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// ── snippet shaping ───────────────────────────────────────────────────────────

/** Roughly where Google stops rendering a description. Past it the tail is simply not read. */
const DESCRIPTION_MAX = 155;

/**
 * Trims a description to something a result actually shows.
 *
 * IGDB summaries run to several hundred characters and were written as blurbs, not snippets;
 * pasted straight into a meta description they get cut mid-word by the crawler instead of at
 * a sentence by us. Prefer the first full sentence, fall back to a word boundary.
 */
export function clampDescription(text: string, max = DESCRIPTION_MAX) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;

  const sentenceEnd = flat.slice(0, max).lastIndexOf(". ");
  if (sentenceEnd > max * 0.5) return flat.slice(0, sentenceEnd + 1);

  const wordEnd = flat.slice(0, max - 1).lastIndexOf(" ");
  return `${flat.slice(0, wordEnd > 0 ? wordEnd : max - 1).trimEnd()}…`;
}

/** Beyond this a SERP title is truncated, and " · FramePatch" is the first thing to go. */
const TITLE_MAX = 60;
const SUFFIX_COST = ` · ${SITE_NAME}`.length;

/**
 * A page title, with the site-name suffix dropped when it would push the useful part out of
 * the visible line.
 *
 * Some catalogue titles are very long on their own ("Cadence of Hyrule: Crypt of the
 * NecroDancer Featuring the Legend of Zelda"). Appending the brand to those costs the words
 * that make the page findable — "frame rate" — and buys nothing, because the brand is already
 * in the URL and the breadcrumb.
 */
export function pageTitle(base: string) {
  return base.length + SUFFIX_COST > TITLE_MAX ? { absolute: base } : base;
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────
// Typed loosely on purpose: schema.org shapes are open, and narrowing them here would mean
// re-declaring a vocabulary that changes outside this repo.

type Ld = Record<string, unknown>;

export function breadcrumbLd(trail: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/**
 * A ranked list of games. `ItemList` is what earns a collection page its carousel treatment,
 * and it is the one schema type that maps cleanly onto "here are the 60 FPS PS5 games".
 */
export function itemListLd(name: string, games: Game[], describe: (game: Game) => string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: games.length,
    itemListElement: games.map((game, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: game.title,
      url: absolute(`/games/${game.slug}`),
      description: describe(game),
    })),
  };
}

export function faqLd(entries: { question: string; answer: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

const PLATFORM_SCHEMA_NAME: Record<PlatformId, string> = {
  ps5: "PlayStation 5",
  xsx: "Xbox Series X|S",
  switch: "Nintendo Switch",
};

/**
 * `VideoGame` for a title page. Frame rate is not a first-class schema.org property, so the
 * per-console figures ride along as `additionalProperty` — the only place the vocabulary
 * allows a typed measurement that a parser can actually read back.
 */
export function videoGameLd(game: Game, description: string): Ld {
  const cover = game.cover
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.imageId}.jpg`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    url: absolute(`/games/${game.slug}`),
    description,
    ...(cover ? { image: cover } : {}),
    ...(game.altNames.length ? { alternateName: game.altNames.slice(0, 5) } : {}),
    ...(game.publisher ? { publisher: { "@type": "Organization", name: game.publisher } } : {}),
    ...(game.developer ? { author: { "@type": "Organization", name: game.developer } } : {}),
    ...(game.releaseDate ? { datePublished: game.releaseDate } : {}),
    ...(game.genres.length ? { genre: game.genres } : {}),
    gamePlatform: game.consoles.map((id) => PLATFORM_SCHEMA_NAME[id]),
    // Only ship a rating when IGDB actually has votes behind it — an aggregateRating with a
    // zero count is a structured-data warning in Search Console.
    ...(game.score && game.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(game.score) / 10,
            bestRating: 10,
            ratingCount: game.ratingCount,
          },
        }
      : {}),
    additionalProperty: game.targets
      .filter((target) => target.fps > 0)
      .map((target) => ({
        "@type": "PropertyValue",
        name: `Frame rate target on ${target.model}`,
        value: `${target.fps} FPS`,
        ...(target.mode ? { description: target.mode } : {}),
      })),
  };
}

/** Site-wide identity, emitted once from the root layout. */
export function organizationLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absolute("/logo.svg"),
    description: `${SITE_TAGLINE} for PlayStation 5, Xbox Series X|S and Nintendo Switch.`,
  };
}

export function websiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/browse?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * The catalogue as a citable dataset. This is the schema that gets FramePatch quoted rather
 * than scraped: it tells an aggregator the frame rate table is the primary artefact here.
 */
export function datasetLd(count: number, verified: number, updated: string | null): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${SITE_NAME} console frame rate database`,
    description:
      `Per-console frame rate targets, graphics modes and patch history for ${count} console ` +
      `games. ${verified} titles carry a figure traced to a named source.`,
    url: SITE_URL,
    ...(updated ? { dateModified: updated } : {}),
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    keywords: ["frame rate", "FPS", "PS5", "Xbox Series X", "Nintendo Switch", "60fps", "120fps"],
    isAccessibleForFree: true,
  };
}
