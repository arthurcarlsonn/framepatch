import type { MetadataRoute } from "next";

import { DATA_SYNCED_AT, GAMES } from "@/lib/games";
import { ENRICHED_AT } from "@/lib/fps";
import { GTA6_TOPICS } from "@/lib/gta6";
import { LIVE_ENTRIES } from "@/lib/live";
import { SITE_URL } from "@/lib/seo";
import {
  allCollectionRoutes,
  FRANCHISES,
  gamePlatformRoutes,
  PLATFORM_SLUG,
  PUBLISHERS,
} from "@/lib/taxonomy";
import { PLATFORMS } from "@/lib/types";

/**
 * Every indexable URL on the site.
 *
 * The route lists come from src/lib/taxonomy.ts rather than being re-derived here, so a
 * collection that falls below the size guard disappears from the sitemap at the same moment
 * its page stops existing. A sitemap that lists 404s is worse than no sitemap.
 *
 * `priority` is a weak signal and Google largely ignores it, but `lastModified` is not — it
 * is what gets a re-crawl after an enrichment pass changes a figure, which is the whole
 * reason this file is generated rather than static.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const enriched = ENRICHED_AT ? new Date(ENRICHED_AT) : new Date(DATA_SYNCED_AT);
  const synced = new Date(DATA_SYNCED_AT);
  const url = (path: string) => `${SITE_URL}${path}`;

  const statics: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: enriched, changeFrequency: "daily", priority: 1 },
    { url: url("/browse"), lastModified: synced, changeFrequency: "daily", priority: 0.9 },
    { url: url("/patches"), lastModified: enriched, changeFrequency: "daily", priority: 0.9 },
    { url: url("/consoles"), lastModified: enriched, changeFrequency: "weekly", priority: 0.8 },
    { url: url("/franchises"), lastModified: synced, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/publishers"), lastModified: synced, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/live"), lastModified: enriched, changeFrequency: "daily", priority: 0.9 },
    { url: url("/upgraded-to-60-fps"), lastModified: enriched, changeFrequency: "weekly", priority: 0.8 },
    { url: url("/about"), lastModified: synced, changeFrequency: "monthly", priority: 0.5 },
  ];

  // The GTA 6 cluster outranks the rest of the site in priority on purpose: it is the only
  // part of the catalogue where the question is being asked faster than the data settles.
  const gta6: MetadataRoute.Sitemap = [
    { url: url("/gta-6"), lastModified: enriched, changeFrequency: "daily", priority: 1 },
    ...GTA6_TOPICS.map((topic) => ({
      url: url(`/gta-6/${topic.slug}`),
      lastModified: enriched,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];

  const live: MetadataRoute.Sitemap = LIVE_ENTRIES.map((entry) => ({
    url: url(`/live/${entry.id}`),
    lastModified: new Date(entry.date),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const consoles: MetadataRoute.Sitemap = PLATFORMS.map((platform) => ({
    url: url(`/consoles/${PLATFORM_SLUG[platform.id]}`),
    lastModified: enriched,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const collections: MetadataRoute.Sitemap = allCollectionRoutes().map(
    ({ platform, collection }) => ({
      url: url(`/consoles/${PLATFORM_SLUG[platform]}/${collection.slug}`),
      lastModified: enriched,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const groups: MetadataRoute.Sitemap = [
    ...FRANCHISES.map((group) => ({
      url: url(`/franchises/${group.slug}`),
      lastModified: synced,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...PUBLISHERS.map((group) => ({
      url: url(`/publishers/${group.slug}`),
      lastModified: synced,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  const games: MetadataRoute.Sitemap = GAMES.map((game) => ({
    url: url(`/games/${game.slug}`),
    // A verified title changes when enrichment re-checks it; an unverified one only changes
    // when the catalogue does.
    lastModified: game.lastVerified ? new Date(game.lastVerified) : synced,
    changeFrequency: "weekly" as const,
    priority: game.verified ? 0.7 : 0.4,
  }));

  const gameConsoles: MetadataRoute.Sitemap = gamePlatformRoutes().map(({ slug, platform }) => ({
    url: url(`/games/${slug}/${PLATFORM_SLUG[platform]}`),
    lastModified: enriched,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...statics,
    ...gta6,
    ...live,
    ...consoles,
    ...collections,
    ...groups,
    ...games,
    ...gameConsoles,
  ];
}
