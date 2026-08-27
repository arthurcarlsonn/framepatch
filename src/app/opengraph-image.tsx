import { GAMES } from "@/lib/games";
import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "FramePatch — console frame rate verification";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  const verified = GAMES.filter((game) => game.verified).length;

  return ogCard({
    eyebrow: "Console frame rate verification",
    figure: `${verified} titles`,
    title: "Verified frame rates for PS5, Xbox Series X|S and Nintendo Switch",
  });
}
