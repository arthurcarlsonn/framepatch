import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FpsBadge } from "@/components/fps-badge";
import { GameCover } from "@/components/game-cover";
import { JsonLd } from "@/components/json-ld";
import { rankedEvidence } from "@/lib/fps";
import { appTypeLabel, formatDate, getGame, headlineFps, targetsFor, verifiedOn } from "@/lib/games";
import { absolute, breadcrumbLd, clampDescription, faqLd, pageTitle } from "@/lib/seo";
import {
  gamePlatformRoutes,
  PLATFORM_BY_SLUG,
  PLATFORM_NAME,
  PLATFORM_SLUG,
} from "@/lib/taxonomy";
import { CONSOLE_MODEL_NAME, type Game, type PlatformId } from "@/lib/types";

type Params = { slug: string; platform: string };

/**
 * "Is <game> 60 FPS on <console>" is the highest-intent query this site can answer, and it is
 * a different question per console: different modes, different targets, different sources.
 *
 * The route only exists where that is actually true — src/lib/taxonomy.ts emits a pair only
 * when the console has a verified figure of its own. Without one this page would be the parent
 * title page with a console name swapped in, which is the duplicate-content shape worth
 * avoiding even when it would rank in the short term.
 */
export function generateStaticParams() {
  return gamePlatformRoutes().map(({ slug, platform }) => ({
    slug,
    platform: PLATFORM_SLUG[platform],
  }));
}

function resolve(params: Params): { game: Game; platform: PlatformId } | null {
  const platform = PLATFORM_BY_SLUG[params.platform];
  const game = getGame(params.slug);
  if (!platform || !game || !verifiedOn(game, platform)) return null;
  return { game, platform };
}

/** The sentence the page exists to state, reused as <meta>, answer box and FAQ answer. */
function verdictLine(game: Game, platform: PlatformId) {
  const fps = headlineFps(game, platform);
  const name = PLATFORM_NAME[platform];
  if (fps >= 120) return `${game.title} reaches ${fps} FPS on ${name} on a 120Hz display.`;
  if (fps >= 60) return `Yes — ${game.title} targets ${fps} FPS on ${name}.`;
  if (fps > 0) return `No — ${game.title} is capped at ${fps} FPS on ${name}.`;
  return `${game.title} has no verified frame rate on ${name}.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolved = resolve(await params);
  if (!resolved) return { title: "Not found" };
  const { game, platform } = resolved;

  const title = `${game.title} frame rate on ${PLATFORM_NAME[platform]}`;
  const description = clampDescription(
    `${verdictLine(game, platform)} Every graphics mode, the patches that changed it, and the source behind each figure.`,
  );
  const path = `/games/${game.slug}/${PLATFORM_SLUG[platform]}`;

  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", title, description, url: absolute(path) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  const { game, platform } = resolved;

  const name = PLATFORM_NAME[platform];
  const path = `/games/${game.slug}/${PLATFORM_SLUG[platform]}`;
  const fps = headlineFps(game, platform);
  const targets = targetsFor(game, platform);
  const evidence = rankedEvidence(game.evidence);

  const elsewhere = game.consoles.filter((id) => id !== platform && verifiedOn(game, id));

  const faq = [
    {
      question: `Is ${game.title} 60 FPS on ${name}?`,
      answer: verdictLine(game, platform),
    },
    ...(targets.length > 1 || targets[0]?.modes.length
      ? [
          {
            question: `What graphics modes does ${game.title} have on ${name}?`,
            answer: targets
              .flatMap((target) =>
                target.modes.map(
                  (mode) =>
                    `${target.model}, ${mode.name}: ${
                      mode.targetFps ? `${mode.targetFps} FPS` : "no stated target"
                    }${mode.resolution ? ` at ${mode.resolution}` : ""}.`,
                ),
              )
              .join(" ") || `FramePatch documents a single mode on ${name}.`,
          },
        ]
      : []),
    ...(game.patch
      ? [
          {
            question: `Has ${game.title} had a frame rate patch on ${name}?`,
            answer: `${game.patch.type} (${game.patch.date}), sourced from ${game.patch.source}.`,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: game.title, path: `/games/${game.slug}` },
            { name: name, path },
          ]),
          faqLd(faq),
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href={`/games/${game.slug}`} className="hover:text-foreground transition-colors">
          {game.title}
        </Link>
      </nav>

      <header className="mb-6 flex items-start gap-4">
        <GameCover game={game} size="thumb" className="h-24 w-17 shrink-0 rounded-md" />
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
            {game.title} frame rate on {name}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {appTypeLabel(game, platform)}
            {game.lastVerified ? ` · Last verified ${formatDate(game.lastVerified)}` : ""}
          </p>
        </div>
      </header>

      <div className="border-primary/30 bg-primary/5 mb-9 flex flex-wrap items-center gap-4 rounded-xl border p-5">
        <FpsBadge fps={fps} size="md" check />
        <p className="text-foreground flex-1 text-[15px] leading-relaxed font-medium">
          {verdictLine(game, platform)}
        </p>
      </div>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          Every mode on {name}
        </h2>
        <div className="border-border/70 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
                <th scope="col">Console</th>
                <th scope="col">Mode</th>
                <th scope="col">Target</th>
                <th scope="col">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-border/70 divide-y">
              {targets.flatMap((target) =>
                (target.modes.length
                  ? target.modes
                  : [{ name: "Default", targetFps: target.fps, resolution: null, note: null }]
                ).map((mode) => (
                  <tr key={`${target.modelId}-${mode.name}`} className="[&>td]:px-4 [&>td]:py-3">
                    <td className="whitespace-nowrap">{CONSOLE_MODEL_NAME[target.modelId]}</td>
                    <td>
                      {mode.name}
                      {mode.note ? (
                        <span className="text-muted-foreground block text-xs">{mode.note}</span>
                      ) : null}
                    </td>
                    <td className="tabular-nums">
                      {mode.targetFps ? `${mode.targetFps} FPS` : "Not stated"}
                    </td>
                    <td className="text-muted-foreground">{mode.resolution ?? "—"}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {evidence.length ? (
        <section className="mb-10">
          <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">Sources</h2>
          <ul className="space-y-2">
            {evidence.slice(0, 6).map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 block rounded-lg border p-3.5 transition-colors"
                >
                  <p className="group-hover:text-primary text-sm font-medium transition-colors">
                    {source.title ?? source.publisher ?? source.url}
                  </p>
                  {source.quote ? (
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      &ldquo;{source.quote}&rdquo;
                    </p>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {elsewhere.length ? (
        <section>
          <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
            {game.title} on other consoles
          </h2>
          <ul className="space-y-2">
            {elsewhere.map((id) => (
              <li key={id}>
                <Link
                  href={`/games/${game.slug}/${PLATFORM_SLUG[id]}`}
                  className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
                >
                  <span className="group-hover:text-primary text-sm font-medium transition-colors">
                    {PLATFORM_NAME[id]}
                  </span>
                  <FpsBadge fps={headlineFps(game, id)} size="xs" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
