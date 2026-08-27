import type { Metadata } from "next";

import { HomeView } from "@/components/home-view";
import { JsonLd } from "@/components/json-ld";
import { ENRICHED_AT } from "@/lib/fps";
import { GAMES } from "@/lib/games";
import { datasetLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  const verified = GAMES.filter((game) => game.verified).length;

  return (
    <>
      <JsonLd data={datasetLd(GAMES.length, verified, ENRICHED_AT)} />
      <HomeView />
    </>
  );
}
