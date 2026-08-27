import type { Metadata } from "next";
import Link from "next/link";

import { FpsBadge } from "@/components/fps-badge";
import { JsonLd } from "@/components/json-ld";
import { LiveSources, StatusPill } from "@/components/live-entry";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/games";
import {
  GTA6_ABOUT,
  GTA6_ATTRIBUTION,
  GTA6_DEVELOPER,
  GTA6_FACTS,
  GTA6_FPS,
  GTA6_LOCATIONS,
  GTA6_PLATFORMS,
  GTA6_PUBLISHER,
  GTA6_RELEASE_DATE,
  GTA6_TITLE,
  GTA6_TOPICS,
  gta6Live,
} from "@/lib/gta6";
import { absolute, breadcrumbLd, faqLd, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * The one title page not built from the catalogue.
 *
 * Every other game page is generated from `GAMES`, which comes from IGDB plus the storefronts.
 * Grand Theft Auto VI is in neither yet — unreleased, no store listing, no usable IGDB record —
 * so this page is hand-authored from src/lib/gta6.ts. It lives at the catalogue's own URL
 * shape on purpose: that is the address a reader and a crawler both expect, and a static
 * segment takes precedence over the `[slug]` sibling, so nothing collides.
 *
 * When `grand-theft-auto-vi` finally syncs (it is in SEED_SLUGS), this file should be deleted
 * rather than reconciled — the generated page is the one that stays correct on its own.
 */
const PATH = "/games/grand-theft-auto-vi";
const TITLE = "Grand Theft Auto VI frame rate";
const DESCRIPTION =
  "GTA 6 releases 19 November 2026 on PS5 and Xbox Series X|S, and is reported to target " +
  "30 FPS on every console. Release date, setting and performance.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  keywords: [
    "GTA 6",
    "Grand Theft Auto VI",
    "GTA 6 frame rate",
    "GTA 6 release date",
    "GTA 6 PS5",
    "GTA 6 Xbox Series X",
    "GTA 6 30fps",
    "GTA 6 60fps",
  ],
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: absolute(PATH),
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  const primary = gta6Live()[0];

  const faq = [
    {
      question: "When does GTA 6 release?",
      answer:
        "Grand Theft Auto VI releases on 19 November 2026 for PlayStation 5 and Xbox Series X|S. " +
        "Rockstar announced the date and Take-Two has reaffirmed it since. No PC version has " +
        "been announced.",
    },
    {
      question: "What frame rate does GTA 6 run at?",
      answer:
        `GTA 6 is reported to target ${GTA6_FPS} FPS on console, with the same target on PS5, ` +
        `PS5 Pro, Xbox Series X and Xbox Series S. The figure is attributed to ${GTA6_ATTRIBUTION}. ` +
        `Rockstar has published nothing about frame rate itself, so FramePatch lists it as ` +
        `reported rather than official.`,
    },
    {
      question: "Is GTA 6 60 FPS?",
      answer:
        "No 60 FPS performance mode has been announced for any console. The reported position " +
        "is that a 60 FPS option is still to be discussed internally, which is neither a " +
        "promise nor a refusal.",
    },
    {
      question: "What consoles is GTA 6 on?",
      answer: `${GTA6_PLATFORMS.join(", ")}. Rockstar has not announced a PC version.`,
    },
    {
      question: "Where is GTA 6 set?",
      answer:
        "Vice City and the surrounding state of Leonida, a fictionalised Florida. It follows " +
        "two protagonists, Jason Duval and Lucia Caminos.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "VideoGame",
            name: GTA6_TITLE,
            alternateName: ["GTA 6", "GTA VI"],
            url: absolute(PATH),
            description: DESCRIPTION,
            datePublished: GTA6_RELEASE_DATE,
            gamePlatform: GTA6_PLATFORMS,
            publisher: { "@type": "Organization", name: GTA6_PUBLISHER },
            author: { "@type": "Organization", name: GTA6_DEVELOPER },
            genre: ["Action", "Adventure", "Open world"],
            // The frame rate rides as a typed property for the same reason it does on every
            // other title page — schema.org has no first-class field for it.
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "Frame rate target on console",
                value: `${GTA6_FPS} FPS`,
                description: "Reported, not published by Rockstar",
              },
            ],
          },
          breadcrumbLd([
            { name: SITE_NAME, path: "/" },
            { name: "Browse", path: "/browse" },
            { name: GTA6_TITLE, path: PATH },
          ]),
          faqLd(faq),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: TITLE,
            url: absolute(PATH),
            dateModified: primary?.date ?? GTA6_RELEASE_DATE,
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          },
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href="/browse" className="hover:text-foreground transition-colors">
          Browse
        </Link>
      </nav>

      <header className="mb-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full text-[11px]">
            Unreleased
          </Badge>
          {primary ? <StatusPill status={primary.status} /> : null}
          <span className="text-muted-foreground text-xs">
            Updated {formatDate(primary?.date ?? GTA6_RELEASE_DATE)}
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {GTA6_TITLE}
        </h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          Rockstar Games · Releases {formatDate(GTA6_RELEASE_DATE)} · PS5 and Xbox Series X|S
        </p>
      </header>

      <div className="border-primary/30 bg-primary/5 mb-10 flex flex-wrap items-center gap-4 rounded-xl border p-5">
        <FpsBadge fps={GTA6_FPS} size="md" />
        <p className="text-foreground flex-1 text-[15px] leading-relaxed font-medium">
          Reported to target {GTA6_FPS} FPS on every console — PS5, PS5 Pro, Xbox Series X and
          Series S. No 60 FPS performance mode has been announced.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">Key facts</h2>
        <dl className="border-border/70 divide-border/70 divide-y overflow-hidden rounded-xl border">
          {GTA6_FACTS.map((fact) => (
            <div key={fact.label} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
              <dt className="text-muted-foreground w-32 shrink-0 text-sm">{fact.label}</dt>
              <dd className="flex-1 text-sm font-medium">
                {fact.value}
                {fact.note ? (
                  <span className="text-muted-foreground block text-xs font-normal">
                    {fact.note}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          About the game
        </h2>
        <div className="space-y-4">
          {GTA6_ABOUT.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-[15px] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          Regions of Leonida
        </h2>
        <ul className="flex flex-wrap gap-2">
          {GTA6_LOCATIONS.map((location) => (
            <li
              key={location}
              className="border-border/70 text-muted-foreground rounded-full border px-3.5 py-1.5 text-[13px]"
            >
              {location}
            </li>
          ))}
        </ul>
      </section>

      {primary ? (
        <section className="mb-10">
          <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
            Where the frame rate figure comes from
          </h2>
          <LiveSources sources={primary.sources} />
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            {primary.whatWouldSettleIt}
          </p>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          Performance, console by console
        </h2>
        <ul className="space-y-2.5">
          {GTA6_TOPICS.map((topic) => (
            <li key={topic.slug}>
              <Link
                href={`/gta-6/${topic.slug}`}
                className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 block rounded-lg border p-4 transition-colors"
              >
                <p className="group-hover:text-primary text-[15px] font-semibold transition-colors">
                  {topic.heading}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{topic.answer}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          Common questions
        </h2>
        <dl className="space-y-5">
          {faq.map((item) => (
            <div key={item.question}>
              <dt className="text-[15px] font-semibold">{item.question}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-border/70 border-t pt-8">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Wondering whether a 60 FPS mode is likely?{" "}
          <Link href="/upgraded-to-60-fps" className="text-primary hover:text-primary/80">
            FramePatch tracks every game that shipped at 30 FPS and later reached 60
          </Link>
          , with how long each one took.
        </p>
      </section>
    </div>
  );
}
