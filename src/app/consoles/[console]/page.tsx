import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameGrid, LinkRail } from "@/components/game-grid";
import { JsonLd } from "@/components/json-ld";
import { gamesFor, headlineFps, mostPopular, verifiedFor } from "@/lib/games";
import { absolute, breadcrumbLd, faqLd, itemListLd } from "@/lib/seo";
import {
  collectionGames,
  collectionsFor,
  PLATFORM_BY_SLUG,
  PLATFORM_NAME,
  PLATFORM_SLUG,
} from "@/lib/taxonomy";
import { PLATFORMS, type PlatformId } from "@/lib/types";

type Params = { console: string };

export function generateStaticParams() {
  return PLATFORMS.map((p) => ({ console: PLATFORM_SLUG[p.id] }));
}

function resolve(params: Params): PlatformId | null {
  return PLATFORM_BY_SLUG[params.console] ?? null;
}

/** The counts the hub leads with, and the same numbers the FAQ schema answers with. */
function statsFor(platform: PlatformId) {
  const listed = gamesFor(platform);
  const verified = verifiedFor(platform);
  const at60 = verified.filter((g) => headlineFps(g, platform) >= 60).length;
  const at120 = verified.filter((g) => headlineFps(g, platform) >= 120).length;
  const at30 = verified.filter((g) => {
    const fps = headlineFps(g, platform);
    return fps > 0 && fps <= 30;
  }).length;
  return { listed: listed.length, verified: verified.length, at60, at120, at30 };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const platform = resolve(await params);
  if (!platform) return { title: "Not found" };

  const name = PLATFORM_NAME[platform];
  const stats = statsFor(platform);
  const title = `${name} frame rates`;
  const description =
    `Frame rate targets for ${stats.listed} ${name} games — ${stats.verified} verified ` +
    `against a named source, ${stats.at60} of them at 60 FPS or above.`;
  const path = `/consoles/${PLATFORM_SLUG[platform]}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: absolute(path) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const platform = resolve(await params);
  if (!platform) notFound();

  const name = PLATFORM_NAME[platform];
  const consoleSlug = PLATFORM_SLUG[platform];
  const path = `/consoles/${consoleSlug}`;
  const stats = statsFor(platform);
  const models = PLATFORMS.find((p) => p.id === platform)!.models;

  const collections = collectionsFor(platform).map((collection) => ({
    href: `${path}/${collection.slug}`,
    label: `${collection.label.charAt(0).toUpperCase()}${collection.label.slice(1)}`,
    count: collectionGames(collection, platform).length,
  }));

  const popular = mostPopular(platform)
    .filter((game) => game.verified)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: "Consoles", path: "/consoles" },
            { name, path },
          ]),
          itemListLd(
            `Most popular verified ${name} games`,
            popular,
            (game) => `${headlineFps(game, platform)} FPS on ${name}`,
          ),
          faqLd([
            {
              question: `How many ${name} games run at 60 FPS?`,
              answer:
                `FramePatch has verified ${stats.at60} ${name} titles at 60 FPS or above, out ` +
                `of ${stats.verified} with a sourced figure. A title with no source is listed ` +
                `as awaiting verification rather than assumed to be 30 FPS.`,
            },
            {
              question: `Which ${name} games run at 120 FPS?`,
              answer:
                stats.at120 > 0
                  ? `${stats.at120} ${name} titles have a documented 120 FPS mode. All of them ` +
                    `need a 120Hz display, and most drop resolution to reach it.`
                  : `FramePatch has not verified a 120 FPS mode on ${name}.`,
            },
            {
              question: `How does FramePatch decide a ${name} frame rate?`,
              answer:
                `Every figure is taken from a named source — publisher patch notes, the ` +
                `platform's own store listing, or an independent measurement — and the quote ` +
                `that states it is shown on the title's page. Nothing is inferred.`,
            },
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href="/consoles" className="hover:text-foreground transition-colors">
          Consoles
        </Link>
      </nav>

      <header className="mb-8 max-w-3xl">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">
          Console hub
        </p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {name} frame rates
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          Every {name} title FramePatch tracks, with the frame rate target for each graphics mode
          and the source that states it. Figures cover {models.map((m) => m.name).join(" and ")}.
        </p>
      </header>

      <dl className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Titles listed", value: stats.listed },
          { label: "Verified figures", value: stats.verified },
          { label: "60 FPS or above", value: stats.at60 },
          { label: "Still at 30 FPS", value: stats.at30 },
        ].map((stat) => (
          <div key={stat.label} className="border-border/70 bg-card rounded-lg border p-4">
            <dt className="text-muted-foreground text-xs font-medium">{stat.label}</dt>
            <dd className="font-heading mt-1 text-2xl font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mb-14">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          Browse {name} by frame rate
        </h2>
        <LinkRail links={collections} />
      </section>

      {popular.length ? (
        <section>
          <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
            Most popular verified {name} titles
          </h2>
          <GameGrid games={popular} platform={platform} />
        </section>
      ) : null}
    </div>
  );
}
