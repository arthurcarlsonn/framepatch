import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { StatusPill } from "@/components/live-entry";
import { formatDate } from "@/lib/games";
import { liveFeed, LIVE_UPDATED_AT } from "@/lib/live";
import { absolute, breadcrumbLd, SITE_NAME } from "@/lib/seo";

const PATH = "/live";
const TITLE = "FramePatch Live";
const DESCRIPTION =
  "Frame rate claims as they land — what was said, who said it, and how settled it is. " +
  "Tracked before the figure is verified enough for the catalogue.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: absolute(PATH) },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  const feed = liveFeed();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: SITE_NAME, path: "/" },
            { name: TITLE, path: PATH },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: TITLE,
            description: DESCRIPTION,
            url: absolute(PATH),
            ...(LIVE_UPDATED_AT ? { dateModified: LIVE_UPDATED_AT } : {}),
          },
        ]}
      />

      <header className="mb-9">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="bg-primary/70 absolute inline-flex size-full animate-ping rounded-full" />
            <span className="bg-primary relative inline-flex size-2 rounded-full" />
          </span>
          <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">Live</p>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {TITLE}
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          The catalogue only carries a frame rate once it can be sourced and re-checked. Live is
          where a claim sits before that: the figure, the person it came from, and an honest label
          for how settled it is.
        </p>
      </header>

      <ul className="space-y-4">
        {feed.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/live/${entry.id}`}
              className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 block rounded-xl border p-5 transition-colors"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusPill status={entry.status} />
                <span className="text-muted-foreground text-xs">{formatDate(entry.date)}</span>
                <span className="text-muted-foreground/50 text-xs">·</span>
                <span className="text-muted-foreground text-xs">{entry.game}</span>
              </div>
              <h2 className="group-hover:text-primary font-heading text-lg leading-snug font-semibold tracking-[-0.02em] transition-colors">
                {entry.headline}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {entry.standfirst}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
