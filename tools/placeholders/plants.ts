// Trees, bushes, boulders and grass tufts (24×24 decoration tiles). Map colours only, no
// outline (DECISIONS D13), lit from the top left with three-tone leaf clusters (D104).
import { Rng } from '../../src/core/Rng';
import { PixelCanvas, type Rgba } from '../lib/canvas';
import { PAL } from '../palette';
import { TILE_SIZE as S } from '../tileset';

/** Soft contact shadow under an object. */
const SHADE: Rgba = [0, 0, 0, 70];

/**
 * A leafy canopy: a dark base, then overlapping leaf clumps that are lighter towards the
 * top left, then a few bright flecks on the lit edge.
 */
export function canopy(
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  clumps = 14,
): void {
  const rng = new Rng(seed);
  c.fillEllipse(cx, cy, rx, ry, PAL.treeDark);
  for (let i = 0; i < clumps; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = Math.sqrt(rng.next()) * 0.75;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d - 0.5;
    const r = 1.6 + rng.next() * 1.6;
    // Light from the top left: clumps up and left are brighter.
    const lit = (cx - x) / rx + (cy - y) / ry;
    const color = lit > 0.35 ? PAL.treeLight : lit > -0.45 ? PAL.tree : null;
    if (!color) continue;
    c.fillEllipse(x, y, r, r * 0.85, color, (px, py) => insideEllipse(px, py, cx, cy, rx, ry));
  }
  // Bright flecks along the lit rim.
  for (let i = 0; i < Math.round(rx * 1.2); i++) {
    const a = Math.PI * (1 + rng.next() * 0.5); // between left and top
    const x = Math.round(cx + Math.cos(a) * (rx - 1.5) * rng.next());
    const y = Math.round(cy + Math.sin(a) * (ry - 1.2));
    if (insideEllipse(x, y, cx, cy, rx, ry)) c.set(x, y, PAL.grassLight);
  }
}

function insideEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x + 0.5 - cx) / rx;
  const dy = (y + 0.5 - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Round, leafy tree (e.g. a marula). */
export function tree(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(13, 21.5, 8, 2.2, SHADE);
  // Trunk with a lit left edge and a root flare.
  c.fillRect(11, 13, 3, 9, PAL.wood);
  c.fillRect(11, 13, 1, 9, PAL.woodLight);
  c.fillRect(13, 14, 1, 8, PAL.woodDark);
  c.set(10, 21, PAL.wood);
  c.set(14, 21, PAL.woodDark);
  c.line(13, 14, 16, 11, PAL.wood); // a branch reaching into the crown
  canopy(c, 12, 9, 10, 8, 151, 18);
  return c;
}

/** Flat-topped acacia: thin forked trunk under a wide, layered umbrella crown. */
export function acacia(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(12, 21.5, 9, 1.8, SHADE);
  c.line(12, 21, 11, 12, PAL.wood);
  c.line(13, 21, 12, 12, PAL.woodDark);
  c.line(11, 12, 6, 7, PAL.wood);
  c.line(12, 12, 17, 7, PAL.woodDark);
  c.line(11, 13, 9, 8, PAL.woodLight);
  c.set(12, 17, PAL.woodLight);
  // Two flat layers of foliage; the lower one is darker and shows below the top one.
  c.fillEllipse(12, 7, 11.5, 3, PAL.treeDark);
  c.fillEllipse(11.5, 5, 10.5, 2.6, PAL.tree);
  const rng = new Rng(77);
  for (let x = 2; x <= 21; x++) {
    if (rng.chance(0.55)) c.set(x, 3 + (rng.chance(0.5) ? 0 : 1), PAL.treeLight);
    if (rng.chance(0.35)) c.set(x, 8, PAL.treeDark);
  }
  c.fillEllipse(9, 4, 4, 1.2, PAL.treeLight);
  for (let i = 0; i < 6; i++) c.set(rng.int(3, 20), 9, PAL.treeDark); // ragged lower edge
  return c;
}

export function bush(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(12.5, 20, 8, 2, SHADE);
  canopy(c, 9, 16, 5, 4, 31, 6);
  canopy(c, 15, 15.5, 5.5, 4.5, 32, 8);
  canopy(c, 12, 13, 4.5, 3.5, 33, 6);
  // A few small red berries.
  c.set(10, 15, PAL.red);
  c.set(15, 13, PAL.red);
  c.set(17, 16, PAL.red);
  return c;
}

export function boulder(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(12.5, 19.5, 9, 2.4, SHADE);
  c.fillEllipse(12, 15, 8.5, 5.5, PAL.rockDark);
  c.fillEllipse(11.5, 14, 7.5, 4.6, PAL.rock);
  c.fillEllipse(9.5, 12.5, 4, 2.2, PAL.metal); // sunlit top
  c.fillEllipse(8.5, 12, 1.6, 0.9, PAL.plaster);
  // A crack and a smaller stone at its foot.
  c.line(14, 12, 15, 15, PAL.rockDark);
  c.line(15, 15, 17, 16, PAL.rockDark);
  c.fillEllipse(20, 18.5, 2.2, 1.6, PAL.rock);
  c.set(19, 18, PAL.metal);
  return c;
}

export function grassTuft(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const rng = new Rng(191);
  for (let clump = 0; clump < 3; clump++) {
    const bx = rng.int(4, 19);
    const by = rng.int(12, 21);
    for (let i = 0; i < 5; i++) {
      const lean = rng.int(-2, 2);
      const h = rng.int(3, 6);
      const color = i % 3 === 0 ? PAL.grassDry : i % 3 === 1 ? PAL.grassLight : PAL.grassDark;
      c.line(bx + i - 2, by, bx + i - 2 + lean, by - h, color);
    }
  }
  return c;
}
