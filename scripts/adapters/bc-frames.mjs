/**
 * Backwards Compatible — a PS4/PS5 spec database, read directly instead of searched for.
 *
 * Every other source in this pipeline has to be found before it can be read, which is what
 * makes a title expensive: three metered searches to discover, most of the time, one article.
 * This one needs no discovery at all. It publishes a sitemap of every title it covers and a
 * page per game at a stable `/games/<slug>/`, so the whole catalogue can be indexed once and
 * matched locally — the join is a string comparison, not a search credit.
 *
 * What it carries is a spec table rather than prose, which maps almost exactly onto FpsMode:
 * a row per graphics mode, with resolution, target, and the site's own distinction between
 * "Locked 30 FPS" and "30 FPS Target" — the same locked/unlocked split the extractor's rules
 * spend a paragraph trying to preserve.
 *
 * Two limits worth knowing before trusting the coverage:
 *
 *   PlayStation only. It exists to answer "does my PS4 game run better on PS5", so there is
 *   no Xbox, no Switch, and no PS5 Pro. Its PS5 rows are the only ones this reads.
 *
 *   Frozen since 2022. Nothing newer is in it. That matters less than it looks — a
 *   backwards-compatible frame rate does not drift, it changes when a patch changes it, and
 *   scripts/adapters/ps-patches.mjs already detects that independently and re-opens the title.
 *
 * This adapter only parses. Everything it produces goes through the same extractor and the
 * same scripts/lib/fps-record.mjs checks as a page found by search: a figure still has to be
 * quotable, still gets capped at the tier evidence.mjs assigns the domain, and is still
 * dropped if it cannot be pointed at.
 */
import { getText } from "../lib/http.mjs";

const BASE = "https://www.backwards-compatible.com";
const SITEMAP = `${BASE}/sitemap.xml`;

/** Someone's independent site with a Patreon, not a commercial API. Read it gently. */
const GAP_MS = 600;

const text = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Slug → comparison key.
 *
 * Deliberately conservative. An earlier version also stripped edition suffixes so that
 * `dark-souls` would match `dark-souls-remastered`, which is wrong in exactly this domain:
 * the remaster is frequently the thing that changed the frame rate, so folding the two
 * together attributes the remaster's 60 to the original's 30. Punctuation and articles are
 * noise and are normalised away; an edition is a different product and is not.
 */
export function matchKey(value) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Every title the site covers, as `matchKey → slug`.
 *
 * One request for the whole catalogue. Collisions keep the first slug seen, which is stable
 * because the sitemap order is.
 */
export async function fetchIndex() {
  const xml = await getText(SITEMAP, { gapMs: GAP_MS, timeoutMs: 60_000, retries: 2 });
  const index = new Map();
  for (const match of xml.matchAll(/<loc>([^<]*\/games\/([^<\/]+)\/?)<\/loc>/g)) {
    const slug = match[2];
    const key = matchKey(slug);
    if (!index.has(key)) index.set(key, slug);
  }
  return index;
}

/**
 * One frame rate cell.
 *
 * A range — "25-30 FPS" — is a measurement, not a target, and the pipeline's rule is that
 * those inform a note and never become the figure. Everything else states an intent:
 * "Locked 60 FPS" holds it, "30 FPS Target" aims at it, "Up to 60 FPS" is a ceiling.
 */
function parseCell(raw) {
  const value = text(raw);
  if (/^\d+\s*-\s*\d+\s*FPS/i.test(value)) return { targetFps: null, label: value };
  const stated = value.match(/(\d+)\s*FPS/i);
  if (!stated) return null;
  return {
    targetFps: Number(stated[1]),
    unlocked: /up to|unlocked|uncapped/i.test(value),
    label: value,
  };
}

/**
 * The page's own sentence about the game, used as the quote where there is one.
 *
 * Titles with a native PS5 build do not get this sentence — their page leads with the upgrade
 * notice instead and states the figures only in the table. Those quote the table row, which
 * is still the page saying it, verbatim.
 */
function proseQuote(html) {
  const sentence = html.match(
    /<strong>[^<]*backwards compatible with the PlayStation 5<\/strong>[^<]*/i,
  );
  return sentence ? text(sentence[0]) : null;
}

/**
 * Splits a page into its two performance sections.
 *
 * "PlayStation 5 Version Performance" is a native current-gen build; "BC Performance
 * Information" is the PS4 app running under backwards compatibility. A game can have both,
 * and they are different answers to different questions, so they stay separate.
 */
function sectionsOf(html) {
  const sections = [];
  for (const chunk of html.split(/<h2>/).slice(1)) {
    const heading = text(chunk.slice(0, 200));
    if (/Version Performance/i.test(heading)) sections.push({ appType: "native", chunk });
    else if (/BC Performance/i.test(heading)) sections.push({ appType: "backcompat", chunk });
  }
  return sections;
}

/** Headings whose section says something about how the game runs. */
const RELEVANT = /compatible with PlayStation|Version Performance|BC Performance|Performance Notes|Version Upgrade/i;

/**
 * The page's own words for the parts that describe performance.
 *
 * The extractor is handed this rather than a summary assembled here, and the reason is the
 * quote rule: every figure the site publishes has to carry a sentence a reader can go and
 * find on the source page. A document written by this adapter would read fluently and be
 * unquotable — anything the model lifted from it would be our prose attributed to someone
 * else. The page's markup flattens to a perfectly serviceable table in text form, so it is
 * simply passed through.
 */
function pageText(html) {
  const blocks = [];
  for (const raw of html.split(/<div class='info-right/).slice(1)) {
    // The split lands mid-attribute; the block starts after the tag it cut in half.
    const chunk = raw.slice(raw.indexOf(">") + 1);
    const body = text(chunk.split(/<div class='footer/)[0]);
    if (RELEVANT.test(body.slice(0, 400))) blocks.push(body);
  }
  return blocks.join("\n\n");
}

/**
 * The PS5 rows of one page.
 *
 * Each section holds a table per console — PS5, PS4 Pro, PS4 — and only the PS5 one is ours;
 * what a game does on a PS4 Pro is not a question this site answers. Returns `null` when the
 * page documents no PS5 figure, which `syncEntries` caches so the page is not re-read.
 */
export async function fetchFrames(slug) {
  const url = `${BASE}/games/${slug}/`;
  const html = await getText(url, { gapMs: GAP_MS, timeoutMs: 30_000, retries: 2 });

  const modes = [];
  for (const { appType, chunk } of sectionsOf(html)) {
    for (const table of chunk.split(/<h3 class='tab'>/).slice(1)) {
      // The console a table belongs to is named only by the icon in its heading.
      if (!/ps5\.svg/.test(table.slice(0, 200))) continue;

      const resolutions = [...table.matchAll(/<div class='o-res'>(.*?)<\/div>/gs)].map((m) => text(m[1]));
      const rates = [...table.matchAll(/<div class='o-fps'>(.*?)<\/div>/gs)].map((m) => parseCell(m[1]));

      resolutions.forEach((resolution, i) => {
        const rate = rates[i];
        if (!rate?.targetFps) return;
        // The mode name is written into the resolution cell: "1800c (Performance)".
        const named = resolution.match(/\((.*?)\)/)?.[1];
        modes.push({
          name: named ?? "Default",
          resolution: resolution.replace(/\s*\(.*?\)/, "").trim() || null,
          targetFps: rate.targetFps,
          unlocked: rate.unlocked,
          appType,
          // Verbatim, and the only thing a reader needs to check the figure themselves.
          quote: `${resolution} ${rate.label}`,
        });
      });
    }
  }

  if (modes.length === 0) return null;

  return {
    url,
    slug,
    title: text(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").replace(/\s*\|.*$/, ""),
    prose: proseQuote(html),
    // Verbatim, and what the extractor actually reads.
    body: pageText(html),
    modes,
  };
}

/**
 * The parsed page as a source, in the shape a search hit has.
 *
 * Feeding this to the extractor rather than writing a record straight out of the parse is the
 * whole design. The parse is deterministic, so it would be tempting to skip the model and
 * emit entries directly — but that would give this one site a private route onto the site
 * that bypasses the quote check, the tier cap, and the retail-hardware filter every other
 * source has to pass. It also throws away the reconciliation: a title usually has search hits
 * too, and those carry the Xbox and Switch figures this site does not have. Handed a spec
 * table alongside them, the extractor produces one record covering every console, and this
 * source competes for each figure on the same terms as the rest.
 *
 * Rendered as plain rows because that is what the table is. The mode names, the locked and
 * target wording, and the native-versus-backcompat split are all the page's own.
 */
export function toSource(frames) {
  return {
    url: frames.url,
    title: frames.title || null,
    snippet: frames.prose ?? frames.modes[0]?.quote ?? "",
    text: frames.body,
    date: null,
    score: 0,
    // Parsed, not scraped — exempt from the extractor's minimum-length scrape check.
    structured: true,
  };
}
