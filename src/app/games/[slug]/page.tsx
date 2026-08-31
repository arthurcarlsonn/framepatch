import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameDetail } from "@/components/game-detail";
import { JsonLd } from "@/components/json-ld";
import { getFullGame } from "@/lib/game-detail";
import { GAMES, headlineFps, verifiedOn } from "@/lib/games";
import { absolute, breadcrumbLd, clampDescription, faqLd, pageTitle, videoGameLd } from "@/lib/seo";
import { PLATFORM_NAME, PLATFORM_SLUG } from "@/lib/taxonomy";

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = getFullGame(slug);
  if (!game) return { title: "Game not found" };

  const title = `${game.title} frame rate`;
  const description = clampDescription(
    game.verdict ?? game.summary ?? `Frame rate data for ${game.title} on current-gen consoles.`,
  );
  const path = `/games/${game.slug}`;

  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", title, description, url: absolute(path) },
    twitter: { card: "summary_large_image", title, description },
    // A title with no verified figure cannot answer the question it would rank for. The page
    // stays crawlable and its links keep counting, but it is held out of the index until an
    // enrichment pass gives it a figure. src/app/sitemap.ts drops the same set.
    ...(game.verified ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getFullGame(slug);
  if (!game) notFound();

  const description =
    game.verdict ?? game.summary ?? `Frame rate data for ${game.title} on current-gen consoles.`;

  // One FAQ pair per console with a verified figure — the same question a searcher types, and
  // the same answer the per-console page leads with, so the two never disagree.
  const verified = game.consoles.filter((platform) => verifiedOn(game, platform));

  return (
    <>
      <JsonLd
        data={[
          videoGameLd(game, description),
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: "Browse", path: "/browse" },
            { name: game.title, path: `/games/${game.slug}` },
          ]),
          ...(verified.length
            ? [
                faqLd(
                  verified.map((platform) => {
                    const fps = headlineFps(game, platform);
                    return {
                      question: `What frame rate does ${game.title} run at on ${PLATFORM_NAME[platform]}?`,
                      answer:
                        fps >= 60
                          ? `${game.title} targets ${fps} FPS on ${PLATFORM_NAME[platform]}.`
                          : `${game.title} is capped at ${fps} FPS on ${PLATFORM_NAME[platform]}.`,
                    };
                  }),
                ),
              ]
            : []),
        ]}
      />
      <GameDetail game={game} />
      {verified.length ? (
        <nav
          aria-label="Frame rate by console"
          className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6"
        >
          <h2 className="font-heading mb-3 text-sm font-semibold tracking-[-0.01em]">
            {game.title} frame rate by console
          </h2>
          <ul className="flex flex-wrap gap-2">
            {verified.map((platform) => (
              <li key={platform}>
                <a
                  href={`/games/${game.slug}/${PLATFORM_SLUG[platform]}`}
                  className="border-border/70 text-muted-foreground hover:text-foreground hover:border-border inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                >
                  {PLATFORM_NAME[platform]}
                  <span className="tabular-nums">{headlineFps(game, platform)} FPS</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
