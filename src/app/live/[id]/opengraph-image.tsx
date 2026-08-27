import { LIVE_STATUS_LABEL, liveEntry } from "@/lib/live";
import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "FramePatch Live";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const entry = liveEntry((await params).id);

  return ogCard({
    eyebrow: entry ? entry.game : "Live",
    figure: entry?.fps ? `${entry.fps} FPS` : undefined,
    title: entry?.headline ?? "FramePatch Live",
    footnote: entry
      ? `${LIVE_STATUS_LABEL[entry.status]} · ${entry.attributedTo}`
      : "Frame rate claims as they land",
  });
}
