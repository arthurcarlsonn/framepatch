import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameGrid, LinkRail } from "@/components/game-grid";
import { JsonLd } from "@/components/json-ld";
import { headlineFps } from "@/lib/games";
import { absolute, breadcrumbLd, faqLd, itemListLd } from "@/lib/seo";
import {
  allCollectionRoutes,
  collectionGames,
  collectionsFor,
  findCollection,
  PLATFORM_BY_SLUG,
  PLATFORM_NAME,
  PLATFORM_SLUG,
} from "@/lib/taxonomy";
import type { PlatformId } from "@/lib/types";

type Params = { console: string; collection: string };

/**
 * One page per (console, collection) pair that clears the size guard in src/lib/taxonomy.ts.
 * Anything below the guard has no route and no sitemap entry, so a shrinking collection
 * 404s rather than quietly turning into a two-item page.
 */
export function generateStaticParams() {
  return allCollectionRoutes().map(({ platform, collection }) => ({
    console: PLATFORM_SLUG[platform],
    collection: collection.slug,
  }));
}

function resolve(params: Params) {
  const platform: PlatformId | undefined = PLATFORM_BY_SLUG[params.console];
  const collection = findCollection(params.collection);
  if (!platform || !collection) return null;

  const games = collectionGames(collection, platform);
  // Re-checked at render time, not just at build: the guard has to hold for the page as well
  // as for the route list, or a data refresh can publish a page the taxonomy would refuse.
  if (!collectionsFor(platform).some((c) => c.slug === collection.slug)) return null;

  return { platform, collection, games };
}

/** "60 FPS games on PlayStation 5" — the phrase people actually type, in that order. */
function headingFor(label: string, platform: PlatformId) {
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} on ${PLATFORM_NAME[platform]}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return { title: "Not found" };
  const { platform, collection, games } = resolved;

  const title = headingFor(collection.label, platform);
  const description =
    `${games.length} ${collection.label} on ${PLATFORM_NAME[platform]}, each with the source ` +
    `that states the figure. Updated as patches change it.`;
  const path = `/consoles/${PLATFORM_SLUG[platform]}/${collection.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: absolute(path) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  const { platform, collection, games } = resolved;

  const consoleSlug = PLATFORM_SLUG[platform];
  const path = `/consoles/${consoleSlug}/${collection.slug}`;
  const heading = headingFor(collection.label, platform);
  const blurb = collection.blurb.replace("{platform}", PLATFORM_NAME[platform]);

  const related = collectionsFor(platform)
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 14)
    .map((c) => ({
      href: `/consoles/${consoleSlug}/${c.slug}`,
      label: `${c.label.charAt(0).toUpperCase()}${c.label.slice(1)}`,
      count: collectionGames(c, platform).length,
    }));

  const elsewhere = (Object.keys(PLATFORM_SLUG) as PlatformId[])
    .filter((id) => id !== platform)
    .filter((id) => collectionsFor(id).some((c) => c.slug === collection.slug))
    .map((id) => ({
      href: `/consoles/${PLATFORM_SLUG[id]}/${collection.slug}`,
      label: `${collection.label} on ${PLATFORM_NAME[id]}`,
      count: collectionGames(collection, id).length,
    }));

  const top = games.slice(0, 3).map((g) => g.title);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: "Consoles", path: "/consoles" },
            { name: PLATFORM_NAME[platform], path: `/consoles/${consoleSlug}` },
            { name: heading, path },
          ]),
          itemListLd(
            heading,
            games.slice(0, 100),
            (game) => `${headlineFps(game, platform)} FPS on ${PLATFORM_NAME[platform]}`,
          ),
          faqLd([
            {
              question: `How many ${collection.label} are there on ${PLATFORM_NAME[platform]}?`,
              answer:
                `FramePatch lists ${games.length} ${collection.label} on ` +
                `${PLATFORM_NAME[platform]}. Every one carries a source that states the figure; ` +
                `titles with no source are listed as awaiting verification instead.`,
            },
            ...(top.length
              ? [
                  {
                    question: `Which ${collection.label} on ${PLATFORM_NAME[platform]} are the most popular?`,
                    answer: `${top.join(", ")}.`,
                  },
                ]
              : []),
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href="/consoles" className="hover:text-foreground transition-colors">
          Consoles
        </Link>
        <span className="mx-1.5 opacity-50">/</span>
        <Link href={`/consoles/${consoleSlug}`} className="hover:text-foreground transition-colors">
          {PLATFORM_NAME[platform]}
        </Link>
      </nav>

      <header className="mb-8 max-w-3xl">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">
          {PLATFORM_NAME[platform]}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {heading}
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">{blurb}</p>
        <p className="text-muted-foreground mt-2 text-[15px]">
          <span className="text-foreground font-semibold tabular-nums">{games.length}</span> titles,
          each linked to the patch notes, Digital Foundry test or store listing that states the
          figure.
        </p>
      </header>

      <GameGrid games={games} platform={platform} />

      {related.length ? (
        <section className="border-border/70 mt-14 border-t pt-8">
          <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
            More {PLATFORM_NAME[platform]} lists
          </h2>
          <LinkRail links={related} />
        </section>
      ) : null}

      {elsewhere.length ? (
        <section className="mt-10">
          <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
            The same list on other consoles
          </h2>
          <LinkRail links={elsewhere} />
        </section>
      ) : null}
    </div>
  );
}
