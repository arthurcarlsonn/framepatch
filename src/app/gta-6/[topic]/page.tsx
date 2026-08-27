import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { LiveSources, StatusPill } from "@/components/live-entry";
import { GTA6_SHORT, GTA6_TOPIC_BY_SLUG, GTA6_TOPICS, gta6Live } from "@/lib/gta6";
import { absolute, breadcrumbLd, faqLd } from "@/lib/seo";

type Params = { topic: string };

export function generateStaticParams() {
  return GTA6_TOPICS.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const topic = GTA6_TOPIC_BY_SLUG.get((await params).topic);
  if (!topic) return { title: "Not found" };

  const path = `/gta-6/${topic.slug}`;
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: topic.title,
      description: topic.description,
      url: absolute(path),
    },
    twitter: { card: "summary_large_image", title: topic.title, description: topic.description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const topic = GTA6_TOPIC_BY_SLUG.get((await params).topic);
  if (!topic) notFound();

  const path = `/gta-6/${topic.slug}`;
  const primary = gta6Live()[0];
  const others = GTA6_TOPICS.filter((t) => t.slug !== topic.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "FramePatch", path: "/" },
            { name: GTA6_SHORT, path: "/gta-6" },
            { name: topic.title, path },
          ]),
          faqLd(topic.faq),
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-[13px]">
        <Link href="/gta-6" className="hover:text-foreground transition-colors">
          GTA 6 frame rate
        </Link>
      </nav>

      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {primary ? <StatusPill status={primary.status} /> : null}
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {topic.heading}
        </h1>
      </header>

      <p className="border-primary/30 bg-primary/5 text-foreground mb-9 rounded-xl border p-5 text-lg leading-relaxed font-medium">
        {topic.answer}
      </p>

      <div className="space-y-5">
        {topic.body.map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="text-[15px] leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {primary ? (
        <section className="border-border/70 mt-12 border-t pt-8">
          <h2 className="font-heading mb-3 text-xl font-semibold tracking-[-0.02em]">Sources</h2>
          <LiveSources sources={primary.sources} />
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          Common questions
        </h2>
        <dl className="space-y-5">
          {topic.faq.map((item) => (
            <div key={item.question}>
              <dt className="text-[15px] font-semibold">{item.question}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-border/70 mt-12 border-t pt-8">
        <h2 className="font-heading mb-4 text-xl font-semibold tracking-[-0.02em]">
          More on GTA 6 performance
        </h2>
        <ul className="space-y-2.5">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={`/gta-6/${other.slug}`}
                className="group border-border/70 bg-card hover:border-primary/45 hover:bg-accent/40 block rounded-lg border p-4 transition-colors"
              >
                <p className="group-hover:text-primary text-[15px] font-semibold transition-colors">
                  {other.heading}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{other.answer}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
