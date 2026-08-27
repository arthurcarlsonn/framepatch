import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { ENRICHED_AT } from "@/lib/fps";
import { GAMES } from "@/lib/games";
import { absolute, breadcrumbLd, faqLd, SITE_NAME, SITE_URL } from "@/lib/seo";

const PATH = "/about";
const TITLE = "About FramePatch";
const DESCRIPTION =
  "How FramePatch verifies a console frame rate, what each confidence rating means, and why " +
  "an unverified title is listed as undocumented rather than assumed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: absolute(PATH) },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const TIERS = [
  { tier: 1, label: "Publisher", example: "Ubisoft patch notes, a Rockstar Newswire post" },
  { tier: 2, label: "Platform holder", example: "A PlayStation Store or Xbox listing" },
  { tier: 3, label: "Digital Foundry", example: "Frame time analysis of a retail build" },
  { tier: 4, label: "Capture channels", example: "Recorded footage with a frame counter" },
  { tier: 5, label: "Press", example: "An outlet reporting a developer statement" },
  { tier: 6, label: "Community", example: "Forum and wiki reports, used only as a lead" },
];

const CONFIDENCE = [
  { name: "Official", body: "Stated by the publisher or the platform holder." },
  { name: "Independently measured", body: "Measured from a retail build by a third party." },
  {
    name: "Reported",
    body: "Attributed to a credible source, but not published by the publisher itself.",
  },
  {
    name: "Not established",
    body: "No source states a figure. This is an answer, not a gap — see below.",
  },
];

export default function Page() {
  const verified = GAMES.filter((game) => game.verified).length;

  const faq = [
    {
      question: "How does FramePatch verify a frame rate?",
      answer:
        "Every figure is taken from a named source and stored with the sentence that states " +
        "it, so a reader can check the claim rather than trust the site. Sources are ranked, " +
        "publisher first, and the strongest one available sets the confidence rating.",
    },
    {
      question: "Why do some games have no frame rate listed?",
      answer:
        "Because no source states one. A PS5 game with no documented figure is undocumented, " +
        "not 30 FPS. Nothing in the pipeline infers a frame rate from hardware, genre or " +
        "release year, which is why the catalogue has gaps instead of guesses.",
    },
    {
      question: "How often is the data updated?",
      answer:
        "A sync runs daily against the storefronts and patch trackers. A title is re-verified " +
        "when a new patch appears against it, so a performance patch pulls its record back " +
        "into the queue rather than waiting for a full pass.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: SITE_NAME, path: "/" },
            { name: "About", path: PATH },
          ]),
          faqLd(faq),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: TITLE,
            description: DESCRIPTION,
            url: absolute(PATH),
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          },
        ]}
      />

      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{TITLE}</h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          FramePatch answers one question: what frame rate does this game actually run at on
          this console? It currently tracks {GAMES.length} console titles, {verified} of which
          carry a figure traced to a named source
          {ENRICHED_AT ? `, last re-verified on ${ENRICHED_AT}` : ""}.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          The rule the whole site runs on
        </h2>
        <p className="text-[15px] leading-relaxed">
          A figure is only ever as good as the source under it. Every frame rate on FramePatch
          is stored alongside the sentence that states it and a link to where that sentence was
          published, and nothing is inferred. That is why the catalogue has holes in it: a title
          nobody has documented is shown as awaiting verification rather than filled in with a
          plausible number.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          What each confidence rating means
        </h2>
        <dl className="border-border/70 divide-border/70 divide-y overflow-hidden rounded-xl border">
          {CONFIDENCE.map((item) => (
            <div key={item.name} className="px-4 py-3">
              <dt className="text-sm font-semibold">{item.name}</dt>
              <dd className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{item.body}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          A claim that originates with a publisher but reaches the public through someone else
          is <strong>reported</strong>, not official, however senior the person quoted. That
          distinction is the point of the rating, so it holds even when the figure is very
          likely correct — see the{" "}
          <Link href="/gta-6" className="text-primary hover:text-primary/80">
            GTA 6 frame rate entry
          </Link>{" "}
          for a live example.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          How sources are ranked
        </h2>
        <div className="border-border/70 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[440px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
                <th scope="col">Tier</th>
                <th scope="col">Source</th>
                <th scope="col">Example</th>
              </tr>
            </thead>
            <tbody className="divide-border/70 divide-y">
              {TIERS.map((row) => (
                <tr key={row.tier} className="[&>td]:px-4 [&>td]:py-3">
                  <td className="tabular-nums">{row.tier}</td>
                  <td className="font-medium">{row.label}</td>
                  <td className="text-muted-foreground">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          Corrections and contact
        </h2>
        <p className="text-[15px] leading-relaxed">
          If a figure here is wrong, it should be corrected rather than argued about. Report it
          through the{" "}
          <Link href="/submit" className="text-primary hover:text-primary/80">
            submit page
          </Link>
          , ideally with a link to the source that states the right number — that is the fastest
          route to a fix, because it is the same evidence the pipeline needs.
        </p>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          FramePatch is an independent project. It is not affiliated with Sony, Microsoft,
          Nintendo, or any game publisher.
        </p>
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
