// Turns an SVG drawing into crisp pixel art (DECISIONS D106): rendered without
// anti-aliasing at ART_SCALE texels per world pixel, then given a 1-texel dark outline.
import { Resvg } from '@resvg/resvg-js';
import { hex, PixelCanvas } from '../lib/canvas';
import { ART_SCALE, INK } from './svg';

/** Render `body` (drawn in a w×h world-pixel box) to a pixel canvas. */
export function raster(
  body: string,
  defs: string,
  w: number,
  h: number,
  { outline = true, scale = ART_SCALE }: { outline?: boolean; scale?: number } = {},
): PixelCanvas {
  const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><defs>${defs}</defs>${body}</svg>`;
  const r = new Resvg(src, { fitTo: { mode: 'zoom', value: scale } }).render();
  const c = new PixelCanvas(r.width, r.height);
  const px = r.pixels;
  for (let i = 0; i < r.width * r.height; i++) {
    const a = px[i * 4 + 3] ?? 0;
    if (a === 0) continue;
    // resvg gives premultiplied colour; undo it for the soft shadows (the only partial alpha,
    // since crispEdges turns anti-aliasing off).
    const k = a === 255 ? 1 : 255 / a;
    const ch = (o: number) => Math.min(255, Math.round((px[i * 4 + o] ?? 0) * k));
    c.data.set([ch(0), ch(1), ch(2), a], i * 4);
  }
  if (outline) outlineSolid(c, hex(INK));
  return c;
}

/** 1-texel outline around fully opaque pixels only, so soft shadows don't get a rim. */
function outlineSolid(c: PixelCanvas, color: ReturnType<typeof hex>): void {
  const solid = (x: number, y: number): boolean => c.get(x, y)[3] === 255;
  const targets: [number, number][] = [];
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (
        !solid(x, y) &&
        (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
      )
        targets.push([x, y]);
  for (const [x, y] of targets) c.set(x, y, color);
}

/** Render each frame and lay them side by side as a Phaser spritesheet. */
export function sheet(
  frames: string[],
  w: number,
  h: number,
  opts?: { outline?: boolean; scale?: number },
): PixelCanvas {
  const images = frames.map((f) => raster(f, '', w, h, opts));
  const first = images[0];
  if (!first) throw new Error('sheet: no frames');
  const out = new PixelCanvas(first.width * images.length, first.height);
  images.forEach((img, i) => out.blit(img, i * first.width, 0));
  return out;
}
