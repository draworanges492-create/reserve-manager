// Shared drawing pieces for buildings: tin roofs, windows, doors, planks, stonework.
// Everything is lit from the top left (DECISIONS D104).
import { Rng } from '../../src/core/Rng';
import { PixelCanvas, type Rgba } from '../lib/canvas';
import { PAL } from '../palette';

/** Soft contact shadow on the ground. */
export const SHADE: Rgba = [0, 0, 0, 70];

/**
 * Corrugated tin roof seen from the front and above: a trapezoid from `top` (narrower by
 * `hip` px each side) down to the eave at `bottom`. Ridges run down the slope.
 */
export function tinRoof(
  c: PixelCanvas,
  left: number,
  right: number,
  top: number,
  bottom: number,
  hip: number,
  seed: number,
  rust = 0.04,
): void {
  const rng = new Rng(seed);
  const rows = bottom - top;
  for (let y = top; y <= bottom; y++) {
    const inset = Math.round(hip * (1 - (y - top) / rows));
    const l = left + inset;
    const r = right - inset;
    for (let x = l; x <= r; x++) {
      let color: Rgba = x % 3 === 0 ? PAL.roofDark : x % 3 === 1 ? PAL.roofLight : PAL.roof;
      if (x - l < 2) color = PAL.roofLight; // lit hip end
      if (r - x < 2) color = PAL.roofDark; // shaded hip end
      if (rng.chance(rust)) color = PAL.wood; // rust spots
      c.set(x, y, color);
    }
  }
  // Ridge cap and the dark line of the eave.
  c.fillRect(left + hip, top, right - left - hip * 2 + 1, 1, PAL.metal);
  c.fillRect(left, bottom, right - left + 1, 1, PAL.roofDark);
}

/** Plaster wall with a shaded band under the eave and a stone plinth. */
export function wall(c: PixelCanvas, x: number, y: number, w: number, h: number, seed: number) {
  c.fillRect(x, y, w, h, PAL.plaster);
  c.fillRect(x, y, w, 2, PAL.plasterShade);
  c.fillRect(x + w - 1, y, 1, h, PAL.plasterShade);
  const rng = new Rng(seed);
  for (let i = 0; i < Math.round((w * h) / 40); i++) {
    c.set(rng.int(x, x + w - 1), rng.int(y + 2, y + h - 3), PAL.plasterShade);
  }
  c.fillRect(x, y + h - 2, w, 2, PAL.rock);
  for (let px = x + 1; px < x + w; px += 4) c.set(px, y + h - 2, PAL.rockDark);
}

/** Framed window with a cross bar, a sky reflection, a sill and optional shutters. */
export function windowPane(
  c: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  shutters = true,
) {
  c.fillRect(x, y, w, h, PAL.woodDark);
  c.fillRect(x + 1, y + 1, w - 2, h - 2, PAL.glass);
  c.fillRect(x + 1, y + 1, w - 2, 1, PAL.waterDeep); // shade from the frame
  c.line(x + Math.floor(w / 2), y + 1, x + Math.floor(w / 2), y + h - 2, PAL.woodDark);
  c.line(x + 1, y + Math.floor(h / 2), x + w - 2, y + Math.floor(h / 2), PAL.woodDark);
  c.set(x + 1, y + 2, PAL.white);
  c.set(x + 2, y + 2, PAL.white);
  c.fillRect(x - 1, y + h, w + 2, 1, PAL.woodLight);
  if (!shutters) return;
  for (const sx of [x - 3, x + w + 1]) {
    c.fillRect(sx, y, 2, h, PAL.wood);
    c.fillRect(sx, y, 1, h, PAL.woodLight);
    for (let sy = y + 1; sy < y + h; sy += 2) c.set(sx + 1, sy, PAL.woodDark);
  }
}

/** Panelled wooden door with a handle. */
export function door(c: PixelCanvas, x: number, y: number, w: number, h: number) {
  c.fillRect(x, y, w, h, PAL.woodDark);
  c.fillRect(x + 1, y + 1, w - 2, h - 1, PAL.wood);
  c.fillRect(x + 1, y + 1, 1, h - 1, PAL.woodLight);
  c.fillRect(x + 2, y + 3, w - 4, 3, PAL.woodDark);
  c.fillRect(x + 2, y + 8, w - 4, Math.max(1, h - 11), PAL.woodDark);
  c.fillRect(x + 3, y + 4, w - 6, 1, PAL.wood);
  c.set(x + w - 2, y + Math.floor(h / 2), PAL.metal);
}

/** Horizontal wooden plank with a lit top edge and a dark lower edge. */
export function plank(c: PixelCanvas, x: number, y: number, w: number, h = 3) {
  c.fillRect(x, y, w, h, PAL.wood);
  c.fillRect(x, y, w, 1, PAL.woodLight);
  c.fillRect(x, y + h - 1, w, 1, PAL.woodDark);
}

/** Vertical post, lit on the left. */
export function post(c: PixelCanvas, x: number, y: number, h: number, w = 2) {
  c.fillRect(x, y, w, h, PAL.wood);
  c.fillRect(x, y, 1, h, PAL.woodLight);
  if (w > 2) c.fillRect(x + w - 1, y, 1, h, PAL.woodDark);
}

/** Dressed stone with staggered mortar lines. */
export function stonework(c: PixelCanvas, x: number, y: number, w: number, h: number) {
  c.fillRect(x, y, w, h, PAL.rock);
  for (let row = 0; row * 4 < h; row++) {
    const yy = y + row * 4;
    c.fillRect(x, yy, w, 1, PAL.rockDark);
    for (let xx = x + (row % 2 ? 1 : 3); xx < x + w; xx += 5)
      c.line(xx, yy, xx, yy + 3, PAL.rockDark);
  }
  c.fillRect(x, y, 1, h, PAL.metal); // lit edge
  c.fillRect(x + w - 1, y, 1, h, PAL.rockDark);
}

/** A few blades of grass growing at a building's foot. */
export function weeds(c: PixelCanvas, x: number, y: number, seed: number, count = 4) {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const bx = x + rng.int(-3, 3);
    c.line(bx, y, bx + rng.int(-1, 1), y - rng.int(2, 4), i % 2 ? PAL.grassLight : PAL.grass);
  }
}

/** Scattered rubble. */
export function rubble(c: PixelCanvas, x: number, y: number, w: number, seed: number, count = 8) {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const rx = rng.int(x, x + w);
    const ry = y + rng.int(-1, 1);
    c.set(rx, ry, PAL.rock);
    if (rng.chance(0.5)) c.set(rx + 1, ry, PAL.rockDark);
    if (rng.chance(0.3)) c.set(rx, ry - 1, PAL.metal);
  }
}
