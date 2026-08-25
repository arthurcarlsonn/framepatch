import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GameDetail } from "@/components/game-detail";
import { getFullGame } from "@/lib/game-detail";
import { GAMES } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = getFullGame(slug);
  if (!game) return { title: "Game not found" };
  return {
    title: `${game.title} frame rate`,
    description:
      game.verdict ?? game.summary ?? `Frame rate data for ${game.title} on current-gen consoles.`,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getFullGame(slug);
  if (!game) notFound();
  return <GameDetail game={game} />;
}
