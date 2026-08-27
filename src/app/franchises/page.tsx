import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { absolute, breadcrumbLd } from "@/lib/seo";
import { FRANCHISES } from "@/lib/taxonomy";

const TITLE = "Frame rates by franchise";
const DESCRIPTION =
  "Every game franchise FramePatch tracks across several titles, with how each entry performs " +
  "on PS5, Xbox Series X|S and Nintendo Switch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/franchises" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absolute("/franchises"),
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={breadcrumbLd([
          { name: "FramePatch", path: "/" },
          { name: "Franchises", path: "/franchises" },
        ])}
      />

      <header className="mb-9 max-w-3xl">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{TITLE}</h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">{DESCRIPTION}</p>
      </header>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {FRANCHISES.map((group) => {
          const verified = group.games.filter((game) => game.verified).length;
          return (
            <li key={group.slug}>
              <Link
                href={`/franchises/${group.slug}`}
                className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors"
              >
                <span className="group-hover:text-primary text-sm font-semibold transition-colors">
                  {group.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {verified}/{group.games.length} verified
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
