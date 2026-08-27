import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { LiveSources, StatusPill } from "@/components/live-entry";
import { formatDate } from "@/lib/games";
import { LIVE_ENTRIES, LIVE_STATUS_LABEL, liveEntry } from "@/lib/live";
import { absolute, breadcrumbLd, SITE_NAME, SITE_URL } from "@/lib/seo";

type Params = { id: string };

export function generateStaticParams() {
  return LIVE_ENTRIES.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const entry = liveEntry((await params).id);
  if (!entry) return { title: "Not found" };

  const path = `/live/${entry.id}`;
  return {
    title: entry.headline,
    description: entry.standfirst,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: entry.headline,
      description: entry.standfirst,
      url: absolute(path),
      publishedTime: entry.date,
    },
    twitter: { card: "summary_large_image", title: entry.headline, description: entry.standfirst },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const entry = liveEntry((await params).id);
  if (!entry) notFound();

  const path = `/live/${entry.id}`;

  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: SITE_NAME, path: "/" },
            { name: "Live", path: "/live" },
            { name: entry.headline, path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: entry.headline,
            description: entry.standfirst,
            url: absolute(path),
            datePublished: entry.date,
            dateModified: entry.date,
            author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            about: { "@type": "VideoGame", name: entry.game },
            // The claim's own provenance, which is the part of this page that matters.
            citation: entry.sources.map((source) => ({
              "@type": "CreativeWork",
              name: source.label,
              url: source.url,
            })),
          },
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href="/live" className="hover:text-foreground transition-colors">
          FramePatch Live
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusPill status={entry.status} />
          <span className="text-muted-foreground text-xs">{formatDate(entry.date)}</span>
          <span className="text-muted-foreground/50 text-xs">·</span>
          <span className="text-muted-foreground text-xs">{entry.game}</span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-[2.25rem] sm:leading-[1.15]">
          {entry.headline}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{entry.standfirst}</p>
      </header>

      <dl className="border-border/70 bg-card mb-10 grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border p-5 sm:grid-cols-4">
        {[
          { label: "Frame rate", value: entry.fps ? `${entry.fps} FPS` : "Not stated" },
          { label: "Standing", value: LIVE_STATUS_LABEL[entry.status] },
          { label: "Consoles", value: `${entry.consoles.length} affected` },
          { label: "Sources", value: String(entry.sources.length) },
        ].map((stat) => (
          <div key={stat.label}>
            <dt className="text-muted-foreground text-xs font-medium">{stat.label}</dt>
            <dd className="font-heading mt-1 text-lg font-bold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
        <span className="text-foreground font-medium">Attributed to:</span> {entry.attributedTo}
        <br />
        <span className="text-foreground font-medium">Consoles named:</span>{" "}
        {entry.consoles.join(", ")}
      </p>

      <div className="space-y-5">
        {entry.body.map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="text-[15px] leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      <section className="border-border/70 mt-12 border-t pt-8">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">Sources</h2>
        <LiveSources sources={entry.sources} />
      </section>

      <section className="mt-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          What would settle it
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {entry.whatWouldSettleIt}
        </p>
      </section>

      {entry.game === "Grand Theft Auto VI" ? (
        <Link
          href="/gta-6"
          className="text-primary hover:text-primary/80 mt-8 inline-block text-sm font-medium transition-colors"
        >
          Everything FramePatch knows about GTA 6 performance →
        </Link>
      ) : null}
    </article>
  );
}
