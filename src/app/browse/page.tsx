import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BrowseView } from "@/components/browse-view";
import { JsonLd } from "@/components/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { GAMES } from "@/lib/games";
import { absolute, breadcrumbLd, SITE_NAME } from "@/lib/seo";

const PATH = "/browse";
const TITLE = "Browse all console games";
const DESCRIPTION =
  "Every console game with verified frame rate data on FramePatch — filter by console, frame " +
  "rate, genre and patch history.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: absolute(PATH) },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  const verified = GAMES.filter((game) => game.verified).length;
  const alphabetical = [...GAMES].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: SITE_NAME, path: "/" },
          { name: "Browse", path: PATH },
        ])}
      />

      <div className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6">
        <header className="mb-8 max-w-3xl">
          <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            {TITLE}
          </h1>
          <p className="text-muted-foreground mt-2 text-[15px]">
            {GAMES.length} titles indexed from IGDB, {verified} with a frame rate traced to a
            named source, and FramePatch verification layered on top.
          </p>
        </header>
      </div>

      <Suspense fallback={<BrowseSkeleton />}>
        <BrowseView />
      </Suspense>

      {/* The filter grid above is client state, so this is the crawlable index of the
          catalogue — and the only path from a list page to most title pages. */}
      <section className="mx-auto max-w-[1280px] px-4 pt-16 pb-4 sm:px-6">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          All titles, A–Z
        </h2>
        <ul className="text-muted-foreground grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {alphabetical.map((game) => (
            <li key={game.slug}>
              <Link
                href={`/games/${game.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {game.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function BrowseSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <Skeleton className="h-10 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
