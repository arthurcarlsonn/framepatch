import Link from "next/link";
import { ZapIcon } from "lucide-react";

import { DATA_SYNCED_AT } from "@/lib/games";

/**
 * The footer is the only internal link surface on every page, which makes it the one that
 * decides whether the generated hubs get crawled at all. The console links point at
 * /consoles/* rather than /browse on purpose: /browse is one client-rendered page whose
 * console is picked from local state, so it cannot be the destination for a console query.
 */
const COLUMNS = [
  {
    title: "Browse",
    links: [
      { label: "All games", href: "/browse" },
      { label: "Recent patches", href: "/patches" },
      { label: "By franchise", href: "/franchises" },
      { label: "By publisher", href: "/publishers" },
    ],
  },
  {
    title: "Consoles",
    links: [
      { label: "PlayStation 5", href: "/consoles/ps5" },
      { label: "Xbox Series X|S", href: "/consoles/xbox-series-x" },
      { label: "Nintendo Switch", href: "/consoles/nintendo-switch" },
      { label: "60 FPS on PS5", href: "/consoles/ps5/60-fps-games" },
      { label: "120 FPS on PS5", href: "/consoles/ps5/120-fps-games" },
    ],
  },
  {
    title: "Tracking",
    links: [
      { label: "FramePatch Live", href: "/live" },
      { label: "GTA 6 frame rate", href: "/gta-6" },
      { label: "30 FPS games that hit 60", href: "/upgraded-to-60-fps" },
      { label: "RSS feed", href: "/feed.xml" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Submit info", href: "/submit" },
      { label: "Report incorrect data", href: "/submit" },
      { label: "Verification policy", href: "/submit" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-border/70 mt-24 border-t">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary grid size-7 place-items-center rounded-lg">
                <ZapIcon className="size-3.5 fill-white text-white" />
              </span>
              <span className="font-heading font-bold tracking-[-0.02em]">
                Frame<span className="text-primary">Patch</span>
              </span>
            </div>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Frame rate performance verification for console libraries. Every entry is checked
              against publisher patch notes and community capture.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border/70 text-muted-foreground mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FramePatch. Not affiliated with Sony, Microsoft or Nintendo.</p>
          <p>
            Game data from{" "}
            <a
              href="https://www.igdb.com"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-foreground underline underline-offset-4"
            >
              IGDB
            </a>
            , synced {DATA_SYNCED_AT}. Frame rate verification is community-sourced.
          </p>
        </div>
      </div>
    </footer>
  );
}
