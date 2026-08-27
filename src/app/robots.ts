import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Crawler policy.
 *
 * AI crawlers are allowed on purpose. FramePatch's advantage over a news site is that its
 * figures carry sources, and the way that advantage pays off is by being the thing an
 * assistant quotes rather than the thing it paraphrases from someone else. Blocking the
 * crawlers would protect data that is already public and cost the citation.
 *
 * `/submit` is excluded because it is a form, not an answer — it has nothing to rank for.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/submit", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
