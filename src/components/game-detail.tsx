"use client";

import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  ExternalLinkIcon,
  FlagIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { FpsBadge, fpsTier } from "@/components/fps-badge";
import { GameCard } from "@/components/game-card";
import { GameCover } from "@/components/game-cover";
import { MediaStrip } from "@/components/media-strip";
import { usePlatform } from "@/components/platform-provider";
import { PlatformSwitcher } from "@/components/platform-switcher";
import { SectionHeader } from "@/components/section-header";
import { CapabilityChips, StorePanel } from "@/components/store-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  appTypeLabel,
  formatDate,
  formatShortDate,
  headlineFps,
  isOnPlatform,
  relatedFrom,
  targetsFor,
  verifiedOn,
} from "@/lib/games";
import { PLATFORM_LABEL, PLATFORMS, type FullGame, type Game } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_PLATFORM_LABELS = [
  "PS5",
  "PS4",
  "Xbox Series X|S",
  "Xbox One",
  "PC",
  "Switch 2",
  "Switch",
];

export function GameDetail({ game }: { game: FullGame }) {
  const { platform } = usePlatform();

  if (!isOnPlatform(game, platform)) {
    return <NotOnPlatform game={game} />;
  }

  const fps = headlineFps(game, platform);
  const isVerified = verifiedOn(game, platform);
  const targets = targetsFor(game, platform);
  const related = relatedFrom(game.similar, game, platform);
  const label = PLATFORM_LABEL[platform];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-10">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <GameCover
            game={game}
            size="hero"
            priority
            className="border-border/70 aspect-[3/4] w-full rounded-lg border"
          />

          <div className="surface space-y-3 p-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => toast.success(`${game.title} added to your library`)}
            >
              <PlusIcon data-icon="inline-start" className="size-4" />
              Add to my library
            </Button>
            <button
              className="text-primary hover:text-primary/80 block w-full text-sm font-medium underline-offset-4 transition-colors hover:underline"
              onClick={() => toast(`Watching ${game.title} for frame rate updates`)}
            >
              Notify me of frame rate changes
            </button>
            <Link
              href="/submit"
              className="text-muted-foreground hover:text-foreground block text-sm underline underline-offset-4 transition-colors"
            >
              Report incorrect info
            </Link>
          </div>

          <div className="surface p-4">
            <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.09em] uppercase">
              Platform availability
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PLATFORM_LABELS.map((p) => {
                const has = game.availability.includes(p);
                return (
                  <span
                    key={p}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ring-1 ring-inset",
                      has
                        ? "text-fps-good bg-fps-good-soft ring-fps-good/20"
                        : "text-muted-foreground/60 ring-border/60 line-through",
                    )}
                  >
                    {has ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
                    {p}
                  </span>
                );
              })}
            </div>
          </div>

          {game.releaseDates.length > 1 ? (
            <div className="surface p-4">
              <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.09em] uppercase">
                Release dates
              </h3>
              <dl className="space-y-2.5 text-sm">
                {game.releaseDates.map((entry) => (
                  <InfoRow key={entry.platform} label={entry.platform} value={entry.date} />
                ))}
              </dl>
            </div>
          ) : null}

          <div className="surface p-4">
            <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.09em] uppercase">
              Game info
            </h3>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Publisher" value={game.publisher} />
              <InfoRow label="Developer" value={game.developer} />
              <InfoRow
                label="Release date"
                value={game.releaseDate ? formatDate(game.releaseDate) : null}
              />
              <InfoRow label="Genre" value={game.genres.join(", ")} />
              <InfoRow label="Modes" value={game.gameModes.join(", ")} />
              <InfoRow label="Perspective" value={game.perspectives.join(", ")} />
              <InfoRow label="Engine" value={game.engines.join(", ")} />
              <InfoRow label="Franchise" value={game.franchise} />
              <InfoRow
                label="Online players"
                value={game.multiplayer?.onlineMax ? `Up to ${game.multiplayer.onlineMax}` : null}
              />
              <InfoRow
                label="Online co-op"
                value={
                  game.multiplayer?.onlineCoopMax ? `Up to ${game.multiplayer.onlineCoopMax}` : null
                }
              />
              <InfoRow
                label="Split screen"
                value={game.multiplayer ? (game.multiplayer.splitscreen ? "Yes" : "No") : null}
              />
              <InfoRow label="Download size" value={downloadSize(game)} />
              <InfoRow
                label="Time to beat"
                value={game.playtime?.main ? `${game.playtime.main} hours` : null}
              />
              <InfoRow
                label="Completionist"
                value={game.playtime?.completionist ? `${game.playtime.completionist} hours` : null}
              />
            </dl>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/browse">Games</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{game.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div>
            <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">
              {game.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <MetaChip label="Publisher" value={game.publisher} />
              <MetaChip
                label="Release"
                value={game.releaseDate ? formatShortDate(game.releaseDate) : null}
              />
              <MetaChip label="Genre" value={game.genres.slice(0, 2).join(", ")} />
              <MetaChip label="ESRB" value={game.esrb} />
              <MetaChip label="Critic score" value={game.score ? String(game.score) : null} />
            </div>
          </div>

          {isVerified ? (
            <VerdictBanner fps={fps} label={label} game={game} platform={platform} />
          ) : (
            <UnverifiedBanner game={game} label={label} />
          )}

          {isVerified ? (
            <section>
              <h2 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.09em] uppercase">
                Frame rate by console model
              </h2>
              <div className="surface divide-border/70 divide-y overflow-hidden">
                {targets.map((t) => (
                  <div key={t.model} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.model}</p>
                      {t.mode ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">{t.mode}</p>
                      ) : null}
                    </div>
                    <FpsBadge fps={t.fps} />
                  </div>
                ))}
              </div>
              {game.verdict ? (
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{game.verdict}</p>
              ) : null}
            </section>
          ) : null}

          {isVerified && game.patch ? (
            <section className="surface grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Patch type" value={game.patch.type} />
              <Field label="Date of update" value={game.patch.date} />
              <Field label="Last verified" value={game.patch.verified} />
              <Field
                label="Validation source"
                value={
                  <span className="text-primary inline-flex items-center gap-1.5 font-medium">
                    {game.patch.source}
                    <ExternalLinkIcon className="size-3.5" />
                  </span>
                }
              />
            </section>
          ) : null}

          {game.summary ? (
            <section className="surface p-5">
              <h2 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.09em] uppercase">
                About
              </h2>
              <p className="text-sm leading-relaxed">{game.summary}</p>
              <p className="text-muted-foreground mt-3 text-xs">
                Game data from IGDB
                {game.ratingCount > 0 ? ` · ${game.ratingCount.toLocaleString()} ratings` : ""}
              </p>
            </section>
          ) : null}

          <MediaStrip media={game.media} title={game.title} trailer={game.trailer} />

          <CapabilityChips game={game} />

          <StorePanel game={game} />

          {isVerified && game.history.length > 0 ? (
            <section className="surface p-5">
              <h2 className="text-muted-foreground mb-4 text-[11px] font-semibold tracking-[0.09em] uppercase">
                Patch history
              </h2>
              <ol className="relative space-y-5">
                <span aria-hidden className="bg-border absolute top-2 bottom-2 left-[3.5px] w-px" />
                {game.history.map((event, i) => (
                  <li key={`${event.date}-${i}`} className="relative pl-6">
                    <span
                      className={cn(
                        "absolute top-1.5 left-0 size-2 rounded-full ring-4",
                        i === 0 ? "bg-primary ring-primary/15" : "bg-muted-foreground/50 ring-background",
                      )}
                    />
                    <p className="text-sm font-medium">{event.date}</p>
                    <p className="text-muted-foreground text-sm">{event.label}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <SectionHeader title="Related games" href="/browse" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((g) => (
              <GameCard key={g.slug} game={g} platform={platform} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function VerdictBanner({
  fps,
  label,
  game,
  platform,
}: {
  fps: number;
  label: string;
  game: Game;
  platform: "ps5" | "xsx" | "switch";
}) {
  const tier = fpsTier(fps);
  const locked = tier === "low";
  const accent =
    tier === "high" ? "text-fps-high" : tier === "mid" ? "text-fps-mid" : "text-fps-good";

  const subtitle = game.patch
    ? `${game.patch.type} — ${game.patch.source}.`
    : locked
      ? "No frame rate patch has been released for this title."
      : `${appTypeLabel(game, platform)} build verified by FrameCheck.`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-lg border p-5",
        locked
          ? "border-border/70 bg-muted/40"
          : tier === "high"
            ? "border-fps-high/30 bg-fps-high-soft"
            : tier === "mid"
              ? "border-fps-mid/30 bg-fps-mid-soft"
              : "border-fps-good/30 bg-fps-good-soft",
      )}
    >
      {locked ? (
        <CircleAlertIcon className="text-muted-foreground size-6 shrink-0" />
      ) : (
        <CircleCheckIcon className={cn("size-6 shrink-0", accent)} />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-heading text-lg font-semibold tracking-[-0.02em]",
            locked ? "text-foreground" : accent,
          )}
        >
          {locked ? `Locked to ${fps} FPS on ${label}` : `Runs at ${fps} FPS on ${label}`}
        </p>
        <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
      </div>
      {locked ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => toast(`We'll email you if ${game.title} gets a frame rate patch`)}
        >
          <BellIcon data-icon="inline-start" className="size-4" />
          Notify on patch
        </Button>
      ) : null}
    </div>
  );
}

function UnverifiedBanner({ game, label }: { game: FullGame; label: string }) {
  return (
    <div className="border-border/70 bg-muted/40 flex flex-wrap items-center gap-4 rounded-lg border p-5">
      <CircleHelpIcon className="text-muted-foreground size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-lg font-semibold tracking-[-0.02em]">
          Frame rate not verified on {label}
        </p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {game.title} is in the catalogue, but no one has confirmed its frame rate against patch
          notes or capture footage yet.
        </p>
      </div>
      <Button variant="outline" size="lg" asChild>
        <Link href="/submit">
          <FlagIcon data-icon="inline-start" className="size-4" />
          Submit frame rate
        </Link>
      </Button>
    </div>
  );
}

function NotOnPlatform({ game }: { game: FullGame }) {
  const available = PLATFORMS.filter((p) => game.consoles.includes(p.id));

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <FlagIcon className="text-muted-foreground mx-auto size-8" />
      <h1 className="font-heading mt-4 text-2xl font-semibold tracking-[-0.02em]">
        {game.title} is not on this console
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {available.length > 0
          ? `FrameCheck has data for ${available.map((p) => p.name).join(", ")}. Switch consoles to see it.`
          : "FrameCheck does not track this title on any current-gen console."}
      </p>
      {available.length > 0 ? (
        <div className="mt-6 flex justify-center">
          <PlatformSwitcher />
        </div>
      ) : null}
      <Separator className="my-8" />
      <Link href="/browse" className="text-primary inline-flex items-center gap-1 text-sm font-medium">
        Browse all games <ChevronRightIcon className="size-4" />
      </Link>
    </div>
  );
}

/** Whichever storefront reported a size — the platforms are the authority here, not us. */
function downloadSize(game: FullGame) {
  const gb = game.xbox?.sizeGb ?? game.nintendo?.sizeGb ?? game.playstation?.sizeGb;
  return gb ? `${gb} GB` : null;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span className="border-border/70 bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
      {label}: <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}
