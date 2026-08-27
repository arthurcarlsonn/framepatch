import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { THIRTY_TO_SIXTY } from "@/lib/upgrades";

export const alt = "Games that shipped at 30 FPS and later ran at 60";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "Dataset",
    figure: `${THIRTY_TO_SIXTY.length} games`,
    title: "Shipped at 30 FPS, later ran at 60 — and how long each took",
    footnote: "Before, after and patch date for every row",
  });
}
