// Waterhole visual states (spec §6.1) and the hand-refill effects.
// Waterholes are map features, so they use the muted map colours (DECISIONS D13).
import { Rng } from '../../src/core/Rng';
import { PixelCanvas, stripOf } from '../lib/canvas';
import { PAL } from '../palette';

/** Frame size; frames are in order clear, muddy, drying, dry. */
export const WATERHOLE_SIZE = 96;
const C = WATERHOLE_SIZE / 2;

function ripples(c: PixelCanvas, seed: number, count: number, rx: number, ry: number): void {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const x = C + rng.int(-Math.floor(rx * 0.6), Math.floor(rx * 0.6));
    const y = C + rng.int(-Math.floor(ry * 0.6), Math.floor(ry * 0.6));
    c.line(x, y, x + 3, y, PAL.waterLight);
  }
}

function pool(
  outer: number,
  inner: number,
  edge: typeof PAL.water,
  centre: typeof PAL.water,
  seed: number,
) {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  c.fillEllipse(C, C, outer, outer * 0.8, edge);
  c.fillEllipse(C, C, inner, inner * 0.72, centre);
  ripples(c, seed, Math.round(outer / 8), inner, inner * 0.72);
  return c;
}

function clear(): PixelCanvas {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  // A light shoreline peeking out above the water reads as "full and fresh".
  c.fillEllipse(C, C - 2, 38, 30, PAL.waterLight);
  c.fillEllipse(C, C + 1, 38, 30, PAL.water);
  c.fillEllipse(C, C + 2, 27, 19, PAL.waterDeep);
  ripples(c, 1, 5, 27, 19);
  return c;
}

function dry(): PixelCanvas {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  c.fillEllipse(C, C, 14, 9, PAL.mud);
  const rng = new Rng(4);
  for (let i = 0; i < 5; i++) {
    let x = C + rng.int(-10, 10);
    let y = C + rng.int(-6, 6);
    for (let s = 0; s < 6; s++) {
      c.set(x, y, PAL.dirtDark);
      x += rng.int(-1, 1);
      y += rng.int(-1, 1);
    }
  }
  return c;
}

export function drawWaterhole(): PixelCanvas {
  return stripOf([
    clear(),
    pool(34, 22, PAL.mud, PAL.water, 2),
    pool(22, 10, PAL.mud, PAL.water, 3),
    dry(),
  ]);
}

/** Bucket shown when the player hand-refills (spec §6.1 "small bucket/pump animation"). */
export function drawBucket(): PixelCanvas {
  const c = new PixelCanvas(12, 12);
  for (let y = 4; y <= 10; y++) {
    const inset = Math.floor((y - 4) / 3);
    c.fillRect(2 + inset, y, 8 - inset * 2, 1, PAL.rock);
  }
  c.fillRect(3, 4, 6, 1, PAL.waterLight);
  c.line(2, 4, 5, 1, PAL.rockDark);
  c.line(9, 4, 6, 1, PAL.rockDark);
  c.outline(PAL.outline);
  return c;
}

export function drawDrop(): PixelCanvas {
  const c = new PixelCanvas(3, 3);
  c.fillRect(0, 0, 3, 3, PAL.waterLight);
  c.set(0, 0, PAL.white);
  return c;
}
