import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FullGame } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = {
  label: string;
  url: string;
  price: number | null;
  was: number | null;
  sizeGb: number | null;
};

const money = (value: number) => `$${value.toFixed(2)}`;

/**
 * One row per storefront. Price and size come from each platform's own catalogue, so a
 * store with no figures still renders as a link rather than disappearing.
 */
function rowsFor(game: FullGame): Row[] {
  const rows: Row[] = [];

  if (game.playstation) {
    rows.push({
      label: "PlayStation Store",
      url: game.playstation.url,
      price: game.playstation.price,
      was: game.playstation.discounted ? game.playstation.regularPrice : null,
      sizeGb: game.playstation.sizeGb,
    });
  }
  if (game.xbox) {
    rows.push({
      label: "Xbox Store",
      url: game.xbox.url,
      price: game.xbox.price,
      was: game.xbox.onSale ? game.xbox.msrp : null,
      sizeGb: game.xbox.sizeGb,
    });
  }
  if (game.nintendo) {
    rows.push({
      label: "Nintendo eShop",
      url: game.nintendo.url,
      price: game.nintendo.price,
      was: game.nintendo.discounted ? game.nintendo.regularPrice : null,
      sizeGb: game.nintendo.sizeGb,
    });
  }

  if (game.steam) {
    rows.push({
      label: "Steam",
      url: game.steam.url,
      price: game.steam.price,
      was: game.steam.discounted ? game.steam.regularPrice : null,
      sizeGb: null,
    });
  }

  // IGDB's link list fills in the remaining PC stores, which have no catalogue adapter.
  const seen = new Set(rows.map((r) => r.label));
  for (const store of game.stores) {
    if (!seen.has(store.label)) {
      rows.push({ label: store.label, url: store.url, price: null, was: null, sizeGb: null });
    }
  }
  return rows;
}

export function StorePanel({ game }: { game: FullGame }) {
  const rows = rowsFor(game);
  const pass = game.gamePassTiers;
  const plus = game.playstation?.plusIncluded ?? false;
  if (rows.length === 0 && !pass && !plus) return null;

  return (
    <section className="surface p-5">
      <h2 className="text-muted-foreground mb-4 text-[11px] font-semibold tracking-[0.09em] uppercase">
        Where to buy
      </h2>

      {pass || plus ? (
        <div className="mb-4 space-y-2">
          {pass ? (
            <SubscriptionRow label="Game Pass">
              Included with Game Pass on{" "}
              {[pass.console && "console", pass.pc && "PC", pass.eaPlay && "EA Play"]
                .filter(Boolean)
                .join(" and ")}
            </SubscriptionRow>
          ) : null}
          {plus ? (
            <SubscriptionRow label="PS Plus">
              Included with the PlayStation Plus Game Catalog
            </SubscriptionRow>
          ) : null}
        </div>
      ) : null}

      <div className="divide-border/70 divide-y">
        {rows.map((row) => (
          <a
            key={row.label}
            href={row.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group hover:bg-accent/40 -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {row.label}
                <ExternalLinkIcon className="text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
              {row.sizeGb ? (
                <p className="text-muted-foreground mt-0.5 text-xs">{row.sizeGb} GB download</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-baseline gap-2">
              {row.was ? (
                <span className="text-muted-foreground text-xs line-through tabular-nums">
                  {money(row.was)}
                </span>
              ) : null}
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  row.was ? "text-fps-good" : "text-foreground",
                )}
              >
                {row.price !== null ? money(row.price) : "View"}
              </span>
            </div>
          </a>
        ))}
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        US prices from each platform&apos;s own catalogue, cached at the last sync.
      </p>
    </section>
  );
}

function SubscriptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-fps-good/30 bg-fps-good-soft flex items-center gap-3 rounded-lg border p-3">
      <Badge className="bg-fps-good/15 text-fps-good ring-fps-good/25 shrink-0 rounded-md ring-1 ring-inset">
        {label}
      </Badge>
      <p className="text-sm">{children}</p>
    </div>
  );
}

const CAPABILITY_LABEL: Record<string, string> = {
  Capability4k: "4K",
  CapabilityHDR: "HDR",
  CapabilityVRR: "VRR",
  Capability120fps: "120 FPS",
  ConsoleGen9Optimized: "Optimised for Series X|S",
  ConsoleCrossGen: "Smart Delivery",
};

/** Display capabilities the Xbox catalogue reports, plus Nintendo's Switch 2 note. */
export function CapabilityChips({ game }: { game: FullGame }) {
  const chips = (game.xbox?.capabilities ?? []).map((c) => CAPABILITY_LABEL[c] ?? c);
  if (chips.length === 0 && !game.nintendo?.compatibility) return null;

  return (
    <section>
      <h2 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.09em] uppercase">
        Display and compatibility
      </h2>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="border-border/70 bg-card inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium"
          >
            {chip}
          </span>
        ))}
      </div>
      {game.nintendo?.compatibility ? (
        <p className="text-muted-foreground mt-3 text-sm">{game.nintendo.compatibility}</p>
      ) : null}
    </section>
  );
}
