import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { LiveSources, StatusPill } from "@/components/live-entry";
import { Badge } from "@/components/ui/badge";
import { GTA6_FPS, GTA6_SHORT, GTA6_TITLE, GTA6_TOPICS, gta6Live } from "@/lib/gta6";
import { formatDate } from "@/lib/games";
import { absolute, breadcrumbLd, faqLd } from "@/lib/seo";

import { LIVE_ENTRIES } from "@/lib/live";

const PATH = "/gta-6";
/** The date the figure entered the public record — stamped on the page and in the schema. */
const GTA6_CLAIMED_ON =
  LIVE_ENTRIES.find((entry) => entry.game === GTA6_TITLE)?.date ?? "2026-08-27";
const TITLE = "GTA 6 frame rate: 30 FPS on every console";
const DESCRIPTION =
  "GTA 6 is reported to target 30 FPS on PS5, PS5 Pro and Xbox Series X|S, with no 60 FPS " +
  "mode committed to. Every source tracked.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  keywords: [
    "GTA 6 frame rate",
    "GTA 6 FPS",
    "is GTA 6 30fps",
    "GTA 6 60fps",
    "GTA 6 PS5 frame rate",
    "GTA 6 PS5 Pro",
    "GTA 6 Xbox Series X frame rate",
    "GTA 6 performance mode",
  ],
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: absolute(PATH),
    publishedTime: GTA6_CLAIMED_ON,
    modifiedTime: GTA6_CLAIMED_ON,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** The hub answers the bare question; each topic page answers one console's version of it. */
export default function Page() {
  const entries = gta6Live();
  const primary = entries[0];

  const faq = [
    {
      question: "What frame rate does GTA 6 run at?",
      answer:
        `Grand Theft Auto VI is reported to target ${GTA6_FPS} FPS on console. Rockstar North ` +
        `co-director Rob Nelson gave the figure to a preview group, and said the target does ` +
        `not change between PS5, PS5 Pro, Xbox Series X and Xbox Series S.`,
    },
    {
      question: "Is GTA 6 60 FPS?",
      answer:
        "Not on the reported information. A 60 FPS performance mode has not been announced for " +
        "any console, and Rockstar's co-director said the technical team still has to be " +
        "consulted on whether one arrives at launch or later.",
    },
    {
      question: "Is the GTA 6 frame rate officially confirmed?",
      answer:
        "No. The figure originates with Rockstar but reached the public through a preview " +
        "attendee and an outlet rather than through anything Rockstar has published. FramePatch " +
        "lists it as reported, not official.",
    },
    {
      question: "Does GTA 6 run better on PS5 Pro?",
      answer:
        "Not in frame rate. The reported 30 FPS target is the same on PS5 Pro as on a base PS5. " +
        "What the extra hardware is spent on instead has not been detailed.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: GTA6_SHORT, path: PATH },
          ]),
          faqLd(faq),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: TITLE,
            description: DESCRIPTION,
            url: absolute(PATH),
            datePublished: GTA6_CLAIMED_ON,
            dateModified: GTA6_CLAIMED_ON,
          },
        ]}
      />

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full text-[11px]">
            {GTA6_TITLE}
          </Badge>
          {primary ? <StatusPill status={primary.status} /> : null}
          <span className="text-muted-foreground text-xs">
            Updated {formatDate(GTA6_CLAIMED_ON)}
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-[2.5rem] sm:leading-[1.1]">
          What frame rate does GTA 6 run at?
        </h1>
      </header>

      {/* The answer box. Anything below it is supporting detail — this is the part that has to
          survive being lifted out of the page and quoted on its own. */}
      <div className="border-primary/30 bg-primary/5 mb-10 rounded-xl border p-5 sm:p-6">
        <p className="text-foreground text-lg leading-relaxed font-medium sm:text-xl">
          <span className="font-heading text-primary text-3xl font-bold tabular-nums sm:text-4xl">
            {GTA6_FPS} FPS
          </span>
          <span className="mt-2 block">
            on every console — PlayStation 5, PlayStation 5 Pro, Xbox Series X and Xbox Series S.
            No 60 FPS performance mode has been committed to.
          </span>
        </p>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Attributed to Rob Nelson, Head of Development and co-director at Rockstar North, during
          a preview visit to the studio in Edinburgh. Rockstar has published nothing about frame
          rate itself, so FramePatch carries this as <strong>reported</strong>, not official.
        </p>
      </div>

      {primary ? (
        <section className="mb-12">
          <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
            Where this comes from
          </h2>
          <LiveSources sources={primary.sources} />
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            {primary.whatWouldSettleIt}
          </p>
          <Link
            href={`/live/${primary.id}`}
            className="text-primary hover:text-primary/80 mt-4 inline-block text-sm font-medium transition-colors"
          >
            Read the full entry on FramePatch Live →
          </Link>
        </section>
      ) : null}

      <section className="mb-12">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          By console, and the questions around it
        </h2>
        <ul className="space-y-2.5">
          {GTA6_TOPICS.map((topic) => (
            <li key={topic.slug}>
              <Link
                href={`${PATH}/${topic.slug}`}
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

      <section>
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
    </div>
  );
}
