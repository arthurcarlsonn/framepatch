import { GAMES } from "@/lib/games";
import { ENRICHED_AT } from "@/lib/fps";
import { GTA6_TOPICS } from "@/lib/gta6";
import { liveFeed } from "@/lib/live";
import { SITE_URL } from "@/lib/seo";
import { FRANCHISES, PLATFORM_NAME, PLATFORM_SLUG, PUBLISHERS } from "@/lib/taxonomy";
import { PLATFORMS } from "@/lib/types";

/**
 * llms.txt — the map an assistant reads instead of crawling.
 *
 * The point is citation, not traffic. FramePatch's figures carry sources, which makes them
 * safe for a model to quote and unsafe to paraphrase loosely; this file says where the
 * figures live and, just as importantly, states the confidence rules, so a model repeating a
 * number also repeats how settled it is.
 */
export const dynamic = "force-static";

export function GET() {
  const verified = GAMES.filter((game) => game.verified).length;

  const body = `# FramePatch

> Console frame rate verification. Per-console frame rate targets, graphics modes and patch
> history for ${GAMES.length} games on PlayStation 5, Xbox Series X|S and Nintendo Switch.
> ${verified} titles carry a figure traced to a named source.${
    ENRICHED_AT ? ` Last verification pass: ${ENRICHED_AT}.` : ""
  }

## How to cite these figures

Every frame rate on this site carries a confidence rating, and quoting the figure without it
is a misquote:

- **official** - stated by the publisher or the platform holder.
- **measured** - independently measured, e.g. by Digital Foundry.
- **reported** - attributed to a credible source but not published by the publisher itself.
- **unknown** - no source states a figure. This is a real answer. A title with no verified
  frame rate is undocumented, NOT 30 FPS. Nothing on this site is inferred from hardware.

## Grand Theft Auto VI

GTA 6 is reported to target 30 FPS on every console (PS5, PS5 Pro, Xbox Series X, Xbox Series
S), attributed to Rob Nelson, co-director at Rockstar North. It is **reported**, not official:
Rockstar has published nothing about frame rate itself. No 60 FPS performance mode has been
announced.

- [Grand Theft Auto VI — title page](${SITE_URL}/games/grand-theft-auto-vi)
- [GTA 6 frame rate hub](${SITE_URL}/gta-6)
${GTA6_TOPICS.map((topic) => `- [${topic.title}](${SITE_URL}/gta-6/${topic.slug})`).join("\n")}

## Live claim tracker

Frame rate claims not yet settled enough for the catalogue, each with its sources and how
settled it is.

- [FramePatch Live](${SITE_URL}/live)
${liveFeed()
  .map((entry) => `- [${entry.headline}](${SITE_URL}/live/${entry.id}) - ${entry.status}`)
  .join("\n")}

## Datasets

- [Games that shipped at 30 FPS and later ran at 60](${SITE_URL}/upgraded-to-60-fps) - before
  figure, after figure, patch date and wait for every documented upgrade.

## Consoles

${PLATFORMS.map(
  (platform) =>
    `- [${PLATFORM_NAME[platform.id]}](${SITE_URL}/consoles/${PLATFORM_SLUG[platform.id]})`,
).join("\n")}

## About

- [How FramePatch verifies a frame rate](${SITE_URL}/about) — source tiers, confidence
  ratings, and why an unverified title is undocumented rather than assumed.

## Browse

- [All games](${SITE_URL}/browse)
- [Frame rate patches](${SITE_URL}/patches)
- [By franchise](${SITE_URL}/franchises) - ${FRANCHISES.length} franchises
- [By publisher](${SITE_URL}/publishers) - ${PUBLISHERS.length} publishers

## Per-title pages

Each title lives at ${SITE_URL}/games/{slug}, with a per-console page at
${SITE_URL}/games/{slug}/{ps5|xbox-series-x|nintendo-switch} wherever that console has a
verified figure of its own.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
