import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { LinkRail } from "@/components/game-grid";
import { gamesFor, headlineFps, verifiedFor } from "@/lib/games";
import { absolute, breadcrumbLd } from "@/lib/seo";
import {
  collectionGames,
  collectionsFor,
  PLATFORM_NAME,
  PLATFORM_SLUG,
} from "@/lib/taxonomy";
import { PLATFORMS } from "@/lib/types";

const TITLE = "Console frame rate hubs";
const DESCRIPTION =
  "Frame rate targets by console — PlayStation 5, Xbox Series X|S and Nintendo Switch, " +
  "broken down by frame rate, genre and patch history.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/consoles" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: absolute("/consoles") },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={breadcrumbLd([
          { name: "FramePatch", path: "/" },
          { name: "Consoles", path: "/consoles" },
        ])}
      />

      <header className="mb-10 max-w-3xl">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{TITLE}</h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">{DESCRIPTION}</p>
      </header>

      <div className="space-y-12">
        {PLATFORMS.map((platform) => {
          const listed = gamesFor(platform.id).length;
          const verified = verifiedFor(platform.id).length;
          const at60 = verifiedFor(platform.id).filter(
            (game) => headlineFps(game, platform.id) >= 60,
          ).length;

          return (
            <section key={platform.id}>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">
                  <Link
                    href={`/consoles/${PLATFORM_SLUG[platform.id]}`}
                    className="hover:text-primary transition-colors"
                  >
                    {PLATFORM_NAME[platform.id]}
                  </Link>
                </h2>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {listed} listed · {verified} verified · {at60} at 60 FPS or above
                </p>
              </div>
              <LinkRail
                links={collectionsFor(platform.id).map((collection) => ({
                  href: `/consoles/${PLATFORM_SLUG[platform.id]}/${collection.slug}`,
                  label: `${collection.label.charAt(0).toUpperCase()}${collection.label.slice(1)}`,
                  count: collectionGames(collection, platform.id).length,
                }))}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
