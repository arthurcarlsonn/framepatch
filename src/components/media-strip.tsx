"use client";

import { PlayIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { imageUrl } from "@/lib/games";

export function MediaStrip({
  media,
  title,
  trailer,
}: {
  media: string[];
  title: string;
  trailer: { id: string; name: string } | null;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (media.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.09em] uppercase">
          Screenshots
        </h2>
        {trailer ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.youtube.com/watch?v=${trailer.id}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <PlayIcon data-icon="inline-start" className="size-3" />
              {trailer.name}
            </a>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.slice(0, 6).map((id) => (
          <button
            key={id}
            onClick={() => setOpen(id)}
            aria-label={`View ${title} screenshot`}
            className="border-border/70 bg-muted hover:border-primary/45 focus-visible:ring-ring/60 relative aspect-video overflow-hidden rounded-lg border transition-colors outline-none focus-visible:ring-2"
          >
            <Image
              src={imageUrl(id, "t_screenshot_med")}
              alt={`${title} screenshot`}
              fill
              sizes="(min-width: 640px) 240px, 45vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent showCloseButton={false} className="max-w-5xl! overflow-hidden p-0">
          <DialogTitle className="sr-only">{title} screenshot</DialogTitle>
          {open ? (
            <div className="relative aspect-video w-full">
              <Image
                src={imageUrl(open, "t_screenshot_huge")}
                alt={`${title} screenshot`}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          ) : null}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Close"
            className="absolute top-3 right-3"
            onClick={() => setOpen(null)}
          >
            <XIcon className="size-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
