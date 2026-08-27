import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GroupView } from "@/components/group-view";
import { absolute } from "@/lib/seo";
import { findGroup, FRANCHISES } from "@/lib/taxonomy";

type Params = { franchise: string };

export function generateStaticParams() {
  return FRANCHISES.map((group) => ({ franchise: group.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const group = findGroup(FRANCHISES, (await params).franchise);
  if (!group) return { title: "Not found" };

  const title = `${group.name} frame rates`;
  const description =
    `Frame rate targets for ${group.games.length} ${group.name} games on PS5, Xbox Series X|S ` +
    `and Nintendo Switch, each with the source that states the figure.`;
  const path = `/franchises/${group.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: absolute(path) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const group = findGroup(FRANCHISES, (await params).franchise);
  if (!group) notFound();

  return (
    <GroupView
      group={group}
      kind="franchise"
      path={`/franchises/${group.slug}`}
      parentPath="/franchises"
      parentLabel="Franchises"
    />
  );
}
