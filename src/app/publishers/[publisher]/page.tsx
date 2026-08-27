import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GroupView } from "@/components/group-view";
import { absolute } from "@/lib/seo";
import { findGroup, PUBLISHERS } from "@/lib/taxonomy";

type Params = { publisher: string };

export function generateStaticParams() {
  return PUBLISHERS.map((group) => ({ publisher: group.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const group = findGroup(PUBLISHERS, (await params).publisher);
  if (!group) return { title: "Not found" };

  const title = `${group.name} frame rates`;
  const description =
    `Frame rate targets across ${group.games.length} games published by ${group.name}, on PS5, ` +
    `Xbox Series X|S and Nintendo Switch.`;
  const path = `/publishers/${group.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: absolute(path) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const group = findGroup(PUBLISHERS, (await params).publisher);
  if (!group) notFound();

  return (
    <GroupView
      group={group}
      kind="publisher"
      path={`/publishers/${group.slug}`}
      parentPath="/publishers"
      parentLabel="Publishers"
    />
  );
}
