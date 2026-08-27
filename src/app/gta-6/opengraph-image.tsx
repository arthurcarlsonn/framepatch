import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { GTA6_FPS } from "@/lib/gta6";

export const alt = "GTA 6 frame rate — 30 FPS on every console, reported";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "GTA 6",
    figure: `${GTA6_FPS} FPS`,
    title: "On every console — PS5, PS5 Pro, Series X and Series S",
    footnote: "Reported, not official · Rob Nelson, Rockstar North",
  });
}
