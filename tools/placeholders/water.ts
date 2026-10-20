// Waterhole visual states (spec §6.1) and the hand-refill effects.
// Waterholes are map features, so they use the muted map colours (DECISIONS D13).
import { Rng } from '../../src/core/Rng';
import { PixelCanvas, stripOf } from '../lib/canvas';
import { PAL } from '../palette';

/** Frame size; frames are in order clear, muddy, drying, dry. */
export const WATERHOLE_SIZE = 96;
const C = WATERHOLE_SIZE / 2;

type Rgba = typeof PAL.water;

function inside(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x + 0.5 - cx) / rx;
  const dy = (y + 0.5 - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Muddy bank: dark rim at the front, lighter dried edge at the back, hoof prints. */
function bank(c: PixelCanvas, rx: number, ry: number, seed: number): void {
  c.fillEllipse(C, C + 1, rx, ry, PAL.mud);
  c.fillEllipse(C, C + 1, rx, ry, PAL.mudDark, (x, y) => !inside(x, y, C, C - 1, rx, ry - 1));
  c.fillEllipse(C, C, rx, ry, PAL.dirt, (x, y) => y < C && !inside(x, y, C, C + 2, rx - 1, ry));
  const rng = new Rng(seed);
  for (let i = 0; i < 26; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = 0.82 + rng.next() * 0.12;
    const x = Math.round(C + Math.cos(a) * rx * d);
    const y = Math.round(C + 1 + Math.sin(a) * ry * d);
    c.set(x, y, PAL.mudDark);
    c.set(x + 1, y, PAL.mudDark); // a cloven hoof print
  }
}

/** Water from a pale shallow edge to a deep middle, with sky glints. */
function water(c: PixelCanvas, rx: number, ry: number, seed: number, murky = false): void {
  c.fillEllipse(C, C + 1, rx, ry, murky ? PAL.mud : PAL.waterLight);
  c.fillEllipse(C + 0.5, C + 1.5, rx - 2.5, ry - 2, PAL.water);
  if (rx > 14) c.fillEllipse(C + 2, C + 3, rx * 0.66, ry * 0.6, PAL.waterDeep);
  // The far bank shades the top edge of the water.
  c.fillEllipse(C, C + 1, rx - 1, ry - 1, PAL.waterDeep, (x, y) => !inside(x, y, C, C + 3, rx, ry));
  const rng = new Rng(seed);
  if (murky) {
    c.recolor((x, y, cur) =>
      inside(x, y, C, C + 1, rx - 2, ry - 2) && rng.chance(0.08) && cur[3] ? PAL.mud : null,
    );
  }
  for (let i = 0; i < Math.round(rx / 4); i++) {
    const x = C + rng.int(-Math.floor(rx * 0.55), Math.floor(rx * 0.5));
    const y = C + rng.int(-Math.floor(ry * 0.4), Math.floor(ry * 0.6));
    const len = rng.int(2, 4);
    c.line(x, y, x + len, y, PAL.waterLight);
    if (rng.chance(0.4)) c.set(x + 1, y, PAL.white);
  }
}

/** Clumps of reeds (green) or dead stalks (dry) around the edge. */
function reeds(
  c: PixelCanvas,
  spots: readonly (readonly [number, number])[],
  seed: number,
  dead = false,
) {
  const rng = new Rng(seed);
  for (const [bx, by] of spots) {
    for (let i = 0; i < 6; i++) {
      const x = bx + i - 3 + rng.int(0, 1);
      const h = rng.int(4, 8);
      const lean = rng.int(-1, 1);
      const stem: Rgba = dead ? PAL.thatchDark : i % 2 ? PAL.tree : PAL.treeLight;
      c.line(x, by, x + lean, by - h, stem);
      if (!dead && rng.chance(0.4)) c.set(x + lean, by - h, PAL.woodDark); // seed head
      if (dead && rng.chance(0.3)) c.set(x + lean, by - h, PAL.sand);
    }
  }
}

function stones(c: PixelCanvas, spots: readonly (readonly [number, number])[]) {
  for (const [x, y] of spots) {
    c.fillEllipse(x, y, 2.5, 1.8, PAL.rock);
    c.set(x - 1, y - 1, PAL.metal);
    c.fillRect(x - 1, y + 1, 3, 1, PAL.rockDark);
  }
}

/** Cracked, dried mud in irregular plates. */
function cracked(c: PixelCanvas, rx: number, ry: number, seed: number): void {
  c.fillEllipse(C, C + 1, rx, ry, PAL.mud);
  c.fillEllipse(C - 2, C - 1, rx * 0.7, ry * 0.6, PAL.dirt);
  const rng = new Rng(seed);
  for (let i = 0; i < Math.round(rx * 0.9); i++) {
    let x = C + rng.int(-Math.floor(rx * 0.8), Math.floor(rx * 0.8));
    let y = C + rng.int(-Math.floor(ry * 0.7), Math.floor(ry * 0.7));
    for (let step = 0; step < 6; step++) {
      if (inside(x, y, C, C + 1, rx - 1, ry - 1)) c.set(x, y, PAL.mudDark);
      x += rng.int(-1, 1);
      y += rng.int(0, 1) * (rng.chance(0.5) ? 1 : -1);
    }
  }
  for (let i = 0; i < Math.round(rx / 2); i++) {
    const x = C + rng.int(-Math.floor(rx * 0.6), Math.floor(rx * 0.6));
    const y = C + rng.int(-Math.floor(ry * 0.5), Math.floor(ry * 0.5));
    c.set(x, y, PAL.sand); // bleached plate edges
  }
}

const REEDS = [
  [12, 50],
  [16, 62],
  [80, 46],
  [84, 58],
  [70, 74],
] as const;
const STONES = [
  [26, 24],
  [74, 26],
  [22, 72],
] as const;

function clear(): PixelCanvas {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  bank(c, 40, 31, 1);
  water(c, 34, 25, 11);
  // Lily pads near the edge.
  for (const [x, y] of [
    [30, 58],
    [34, 61],
    [64, 40],
  ] as const) {
    c.fillEllipse(x, y, 2.2, 1.4, PAL.tree);
    c.set(x - 1, y - 1, PAL.treeLight);
  }
  c.set(31, 57, PAL.white);
  reeds(c, REEDS, 12);
  stones(c, STONES);
  return c;
}

function muddy(): PixelCanvas {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  cracked(c, 38, 29, 2);
  bank(c, 30, 22, 21);
  water(c, 25, 17, 22, true);
  reeds(c, REEDS.slice(0, 3), 23);
  reeds(c, REEDS.slice(3), 24, true);
  stones(c, STONES);
  return c;
}

function drying(): PixelCanvas {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  cracked(c, 36, 27, 3);
  bank(c, 19, 13, 31);
  water(c, 13, 8, 32, true);
  reeds(c, REEDS, 33, true);
  stones(c, STONES);
  return c;
}

function dry(): PixelCanvas {
  const c = new PixelCanvas(WATERHOLE_SIZE, WATERHOLE_SIZE);
  cracked(c, 34, 25, 4);
  reeds(c, REEDS.slice(1, 4), 43, true);
  stones(c, STONES.slice(0, 2));
  return c;
}

export function drawWaterhole(): PixelCanvas {
  return stripOf([clear(), muddy(), drying(), dry()]);
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
