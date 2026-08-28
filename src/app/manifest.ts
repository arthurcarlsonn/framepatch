import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

/**
 * The install manifest. Chrome on Android will happily invent an icon from whatever it can
 * scrape when this is missing, and what it invents is the 16px favicon stretched to fill a
 * home screen — hence the explicit 192/512 pair plus a maskable variant with a wider safe
 * zone for launchers that crop to a circle or squircle.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description:
      "Instant frame rate performance verification for PS5, Xbox Series X|S and Nintendo Switch libraries.",
    start_url: "/",
    display: "standalone",
    // Matches the dark theme the site defaults to, so the splash screen does not flash white.
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
