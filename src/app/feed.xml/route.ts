import { liveFeed } from "@/lib/live";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * RSS for FramePatch Live.
 *
 * Only Live is syndicated, not the catalogue: a feed is a stream of events, and a frame rate
 * record changing from unverified to verified is not one. Live entries are, which is what
 * makes them the right thing to hand to Feedly, an aggregator or a newsroom watching for the
 * next figure.
 */
export const dynamic = "force-static";

/** XML text nodes cannot carry raw `&`, `<` or `>`, and titles routinely contain all three. */
function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const entries = liveFeed();
  const updated = entries[0]?.date;

  const items = entries
    .map((entry) => {
      const url = `${SITE_URL}/live/${entry.id}`;
      return `    <item>
      <title>${escapeXml(entry.headline)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${entry.date}T00:00:00Z`).toUTCString()}</pubDate>
      <category>${escapeXml(entry.game)}</category>
      <description>${escapeXml(entry.standfirst)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} Live</title>
    <link>${SITE_URL}/live</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Console frame rate claims as they land, with the source behind each one.</description>
    <language>en</language>${
      updated
        ? `\n    <lastBuildDate>${new Date(`${updated}T00:00:00Z`).toUTCString()}</lastBuildDate>`
        : ""
    }
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
