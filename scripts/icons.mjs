/**
 * Renders the FramePatch mark into every raster icon the site serves.
 *
 * The mark itself lives in `public/logo.svg` and is duplicated as JSX in the site header, so
 * this script is the third place it exists — but the other two are vector and this one has to
 * produce bytes a browser tab and an iOS home screen can read. Run it whenever the mark
 * changes: `pnpm icons`.
 *
 * `next/og` does the rasterising because it already ships with the framework and is already
 * how this repo renders social cards. There is no image dependency to add.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ImageResponse } from "next/og.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ACCENT = "#7c5cff";

/**
 * The bolt, drawn heavier than the vector logo: stroked as well as filled, and scaled to very
 * nearly fill its tile. A 16px browser tab is roughly five pixels of glyph, and the logo's
 * thin diagonal limbs disappear entirely at that size — the stroke fattens every limb
 * uniformly and rounds the joins, which is what survives the downscale.
 */
const BOLT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(256 256) scale(1.3) translate(-256 -256)"><path d="M296 96 176 280h80l-40 136 120-184h-80z" fill="#fff" stroke="#fff" stroke-width="34" stroke-linejoin="round" stroke-linecap="round"/></g></svg>`;
const BOLT_URI = `data:image/svg+xml;base64,${Buffer.from(BOLT).toString("base64")}`;

/**
 * @param size    pixel dimensions of the square output
 * @param radius  corner radius; iOS masks its own, so `apple-icon` passes 0 and lets the
 *                system round it rather than shipping a rounded square inside a rounded mask
 * @param padding inset around the mark, as a fraction of `size`
 */
async function render(size, { radius, padding = 0 }) {
  const inner = Math.round(size * (1 - padding * 2));
  const response = new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ACCENT,
          borderRadius: radius,
        },
        children: {
          type: "img",
          props: { src: BOLT_URI, width: inner, height: inner },
        },
      },
    },
    { width: size, height: size },
  );
  return Buffer.from(await response.arrayBuffer());
}

/** Packs PNGs into an ICO container. Every browser that still asks for `/favicon.ico` reads
 *  PNG-in-ICO, so there is no need to emit uncompressed BMP bitmaps. */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette colours
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function write(path, data) {
  const full = join(ROOT, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
  console.log(`${path} — ${(data.length / 1024).toFixed(1)} KB`);
}

const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map(async (size) => ({
    size,
    // Small sizes get proportionally less rounding, or the corners eat the mark.
    data: await render(size, { radius: Math.round(size * 0.22), padding: 0.08 }),
  })),
);
await write("src/app/favicon.ico", ico(icoPngs));

// iOS composites against the icon's own background, so the Apple icon is edge-to-edge purple
// with no rounding of its own.
await write("src/app/apple-icon.png", await render(180, { radius: 0, padding: 0.12 }));

// Manifest icons, for Android home screens and install prompts.
await write("public/icon-192.png", await render(192, { radius: 42, padding: 0.08 }));
await write("public/icon-512.png", await render(512, { radius: 112, padding: 0.08 }));
// Maskable variants are cropped to a safe zone by the launcher, hence the heavier padding.
await write("public/icon-maskable-512.png", await render(512, { radius: 0, padding: 0.2 }));
