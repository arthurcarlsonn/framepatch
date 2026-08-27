import type { Metadata } from "next";
import Link from "next/link";

import { FpsBadge } from "@/components/fps-badge";
import { JsonLd } from "@/components/json-ld";
import { formatDate } from "@/lib/games";
import { absolute, breadcrumbLd, faqLd, SITE_NAME } from "@/lib/seo";
import { formatWait, medianWaitDays, THIRTY_TO_SIXTY, UPGRADES } from "@/lib/upgrades";

const PATH = "/upgraded-to-60-fps";
const TITLE = "Games that shipped at 30 FPS and later ran at 60";
const DESCRIPTION =
  "Every console game FramePatch can document going from a 30 FPS launch to a 60 FPS mode — " +
  "the patch, the date, and how long players waited for it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: absolute(PATH) },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function Page() {
  const rows = UPGRADES;
  const toSixty = THIRTY_TO_SIXTY;
  const median = medianWaitDays(toSixty);
  const longest = [...toSixty]
    .filter((row) => row.waitDays != null)
    .sort((a, b) => (b.waitDays ?? 0) - (a.waitDays ?? 0))[0];

  const faq = [
    {
      question: "Do games that launch at 30 FPS usually get a 60 FPS mode later?",
      answer:
        `Rarely, and slowly. FramePatch can fully document ${toSixty.length} console titles ` +
        `going from a 30 FPS launch to a 60 FPS mode` +
        (median != null ? `, with a median wait of ${formatWait(median)}` : "") +
        `. That is out of hundreds of catalogue titles that shipped at 30 FPS, so the upgrade ` +
        `is the exception rather than the expectation.`,
    },
    {
      question: "How long does a 60 FPS patch usually take to arrive?",
      answer:
        median != null
          ? `The median wait across the documented upgrades is ${formatWait(median)} from release` +
            (longest
              ? `, and the longest is ${longest.game.title} at ${formatWait(longest.waitDays)}`
              : "") +
            `.`
          : "FramePatch does not have enough dated upgrades to state a median wait.",
    },
    {
      question: "Why is this list short?",
      answer:
        "An entry needs three things at once: the frame rate before the patch, the frame rate " +
        "after it, and the date. Most performance patches are announced without a previous " +
        "figure to compare against, and FramePatch does not infer one — so a real upgrade with " +
        "no stated starting point is left off rather than estimated.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: SITE_NAME, path: "/" },
            { name: "Upgraded to 60 FPS", path: PATH },
          ]),
          faqLd(faq),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: TITLE,
            description: DESCRIPTION,
            url: absolute(PATH),
            creator: { "@type": "Organization", name: SITE_NAME },
            variableMeasured: [
              "Launch frame rate",
              "Post-patch frame rate",
              "Patch date",
              "Days from release to upgrade",
            ],
            isAccessibleForFree: true,
          },
        ]}
      />

      <header className="mb-8">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">
          From the catalogue
        </p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {TITLE}
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          Whenever a big game launches locked at 30 FPS, the same question follows it: will a
          performance mode turn up later? This is the record of every time FramePatch can show
          that it did — with the before figure, the after figure and the gap between them.
        </p>
      </header>

      <dl className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Documented upgrades", value: String(rows.length) },
          { label: "30 FPS → 60 FPS", value: String(toSixty.length) },
          { label: "Median wait", value: formatWait(median) },
          { label: "Longest wait", value: longest ? formatWait(longest.waitDays) : "—" },
        ].map((stat) => (
          <div key={stat.label} className="border-border/70 bg-card rounded-lg border p-4">
            <dt className="text-muted-foreground text-xs font-medium">{stat.label}</dt>
            <dd className="font-heading mt-1 text-xl font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-border/70 mb-10 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
              <th scope="col">Game</th>
              <th scope="col">Was</th>
              <th scope="col">Became</th>
              <th scope="col">Patch date</th>
              <th scope="col">Wait</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody className="divide-border/70 divide-y">
            {rows.map((row) => (
              <tr key={row.game.slug} className="[&>td]:px-4 [&>td]:py-3">
                <td>
                  <Link
                    href={`/games/${row.game.slug}`}
                    className="hover:text-primary font-medium transition-colors"
                  >
                    {row.game.title}
                  </Link>
                </td>
                <td>
                  <FpsBadge fps={row.previousFps} size="xs" />
                </td>
                <td>
                  <FpsBadge fps={row.newFps} size="xs" check />
                </td>
                <td className="text-muted-foreground whitespace-nowrap">{formatDate(row.date)}</td>
                <td className="text-muted-foreground whitespace-nowrap tabular-nums">
                  {formatWait(row.waitDays)}
                </td>
                <td className="text-muted-foreground">
                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      {row.source ?? "Source"}
                    </a>
                  ) : (
                    (row.source ?? "—")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mb-10">
        <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">
          What this says about GTA 6
        </h2>
        <p className="text-[15px] leading-relaxed">
          Grand Theft Auto VI is reported to target 30 FPS on every console, with a 60 FPS mode
          neither promised nor ruled out. The table above is the closest thing to a base rate for
          that question, and it points at patience rather than optimism.
          {median != null ? ` Where an upgrade did arrive, the median wait was ${formatWait(median)}.` : ""}{" "}
          Rockstar&rsquo;s own history sits at the slow end of it: Grand Theft Auto V launched at
          30 FPS in 2013, and console players waited until the 2022 current-generation release for
          a performance mode.
        </p>
        <Link
          href="/gta-6"
          className="text-primary hover:text-primary/80 mt-4 inline-block text-sm font-medium transition-colors"
        >
          Everything FramePatch knows about GTA 6 performance →
        </Link>
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
