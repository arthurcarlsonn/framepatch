import Link from "next/link";

import { GameGrid } from "@/components/game-grid";
import { JsonLd } from "@/components/json-ld";
import { headlineFps, verifiedOn } from "@/lib/games";
import { breadcrumbLd, faqLd, itemListLd } from "@/lib/seo";
import { PLATFORM_NAME, PLATFORM_SLUG, type Group } from "@/lib/taxonomy";
import { PLATFORMS, type PlatformId } from "@/lib/types";

/**
 * Franchise and publisher pages are the same page with a different noun, so they share this.
 *
 * The console split is the reason these pages are worth publishing at all: a franchise page
 * that just listed its games would duplicate /browse, but one that shows the same titles
 * reaching different frame rates on different hardware is answering a question the catalogue
 * cannot answer in one row.
 */
export function GroupView({
  group,
  kind,
  path,
  parentPath,
  parentLabel,
}: {
  group: Group;
  kind: "franchise" | "publisher";
  path: string;
  parentPath: string;
  parentLabel: string;
}) {
  const platforms = PLATFORMS.map((p) => p.id).filter((id) =>
    group.games.some((game) => game.consoles.includes(id)),
  );

  const verified = group.games.filter((game) => game.verified);
  const noun = kind === "franchise" ? "franchise" : "publisher";

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: parentLabel, path: parentPath },
            { name: group.name, path },
          ]),
          itemListLd(`${group.name} frame rates`, group.games, (game) => {
            const on = game.consoles.find((id) => verifiedOn(game, id));
            return on
              ? `${headlineFps(game, on)} FPS on ${PLATFORM_NAME[on]}`
              : "Frame rate awaiting verification";
          }),
          faqLd([
            {
              question: `How many ${group.name} games have a verified frame rate?`,
              answer:
                `FramePatch tracks ${group.games.length} ${group.name} titles and has a sourced ` +
                `frame rate for ${verified.length} of them. The rest are listed as awaiting ` +
                `verification rather than assumed.`,
            },
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href={parentPath} className="hover:text-foreground transition-colors">
          {parentLabel}
        </Link>
      </nav>

      <header className="mb-8 max-w-3xl">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">{noun}</p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {group.name} frame rates
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          {group.games.length} {group.games.length === 1 ? "title" : "titles"} from {group.name},{" "}
          {verified.length} with a frame rate traced to a named source. Figures differ by console,
          so each list below is the {noun}&rsquo;s output on one machine.
        </p>
      </header>

      <div className="space-y-14">
        {platforms.map((platform: PlatformId) => {
          const games = group.games
            .filter((game) => game.consoles.includes(platform))
            .sort(
              (a, b) =>
                headlineFps(b, platform) - headlineFps(a, platform) || b.popularity - a.popularity,
            );
          if (games.length === 0) return null;

          const at60 = games.filter((game) => headlineFps(game, platform) >= 60).length;

          return (
            <section key={platform}>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">
                  <Link
                    href={`/consoles/${PLATFORM_SLUG[platform]}`}
                    className="hover:text-primary transition-colors"
                  >
                    {PLATFORM_NAME[platform]}
                  </Link>
                </h2>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {games.length} {games.length === 1 ? "title" : "titles"} · {at60} at 60 FPS or
                  above
                </p>
              </div>
              <GameGrid games={games} platform={platform} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
