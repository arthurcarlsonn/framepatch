import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover art is served by IGDB's image CDN; see coverUrl() in src/lib/games.ts.
    remotePatterns: [{ protocol: "https", hostname: "images.igdb.com", pathname: "/igdb/image/upload/**" }],
  },
};

export default nextConfig;
