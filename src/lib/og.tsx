import { ImageResponse } from "next/og";

/**
 * The social card every shareable page renders.
 *
 * Reddit, X and Discord are the only distribution a new domain actually has on the day a
 * claim breaks, and all three fall back to a blank rectangle without one of these. The card
 * leads with the figure rather than the site name for the same reason the pages do: the
 * number is the thing worth sharing.
 *
 * Kept to system-stack typography on purpose — fetching a font file at image-render time is
 * one more thing that can fail a build, and the card does not need one to read well.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#0a0a0b";
const FG = "#fafafa";
const MUTED = "#a1a1aa";
const ACCENT = "#7c5cff";

export function ogCard({
  eyebrow,
  title,
  figure,
  footnote,
}: {
  eyebrow: string;
  title: string;
  /** The headline number, when the page has one — "30 FPS". */
  figure?: string;
  footnote?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: 72,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            ⚡
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: FG }}>
            FramePatch
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED, marginLeft: 8 }}>
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {figure ? (
            <div
              style={{
                display: "flex",
                fontSize: 104,
                fontWeight: 800,
                color: ACCENT,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {figure}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: figure ? 46 : 62,
              fontWeight: 700,
              color: FG,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
          {footnote ?? "Every figure carries the source that states it"}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
