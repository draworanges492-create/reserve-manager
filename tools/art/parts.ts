// Shared building pieces for the 2×-detail art (DECISIONS D106), in world pixels, lit from
// the top left. Half a world pixel = one texel, the finest line that shows.
import { Rng } from '../../src/core/Rng';
import { dot, fill, limb, type Ramp, shaded } from './svg';

export const ROOF: Ramp = { light: '#b07a52', mid: '#8b5a3c', dark: '#6a4030' };
export const WOOD: Ramp = { light: '#8c6a48', mid: '#6a4a32', dark: '#4a3424' };
export const PLASTER: Ramp = { light: '#ece0bc', mid: '#ddcfa6', dark: '#b5a37e' };
export const STONE: Ramp = { light: '#a8a397', mid: '#827d70', dark: '#5e5a52' };
export const METAL: Ramp = { light: '#c4cacc', mid: '#a2a8aa', dark: '#5f666a' };
export const THATCH: Ramp = { light: '#dcc27e', mid: '#c4a35c', dark: '#8f7339' };
export const RUST = '#8a4a2a';
export const GLASS = '#9cc4d0';
export const SKY = '#d8eef2';

export function rect(x: number, y: number, w: number, h: number, color: string): string {
  return fill(`M${x},${y} h${w} v${h} h${-w} Z`, color);
}

export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  w = 0.5,
): string {
  return limb(`M${x1},${y1} L${x2},${y2}`, color, w, 0);
}

/** Corrugated tin roof: trapezoid with ridges running down the slope, ridge cap, eave. */
export function tinRoof(
  left: number,
  right: number,
  top: number,
  bottom: number,
  hip: number,
  { seed = 1, rust = 0.05, ramp = ROOF }: { seed?: number; rust?: number; ramp?: Ramp } = {},
): string {
  const d = `M${left + hip},${top} L${right - hip},${top} L${right},${bottom} L${left},${bottom} Z`;
  const rng = new Rng(seed);
  const ridges: string[] = [];
  for (let x = left; x < right; x += 1) {
    ridges.push(line(x + 0.25, top, x + 0.25, bottom, ramp.light, 0.5));
    ridges.push(line(x + 0.75, top, x + 0.75, bottom, ramp.dark, 0.5));
  }
  const spots: string[] = [];
  for (let i = 0; i < Math.round((right - left) * (bottom - top) * rust); i++) {
    spots.push(
      dot(
        left + hip / 2 + rng.next() * (right - left - hip),
        top + 1 + rng.next() * (bottom - top - 2),
        0.35 + rng.next() * 0.4,
        RUST,
      ),
    );
  }
  return (
    shaded(d, ramp, {
      rim: [0, 0],
      extra:
        ridges.join('') +
        spots.join('') +
        // Lit and shaded hip ends.
        fill(
          `M${left + hip},${top} L${left + hip + 1.2},${top} L${left + 1.2},${bottom} L${left},${bottom} Z`,
          ramp.light,
        ) +
        fill(
          `M${right - hip - 1.2},${top} L${right - hip},${top} L${right},${bottom} L${right - 1.2},${bottom} Z`,
          ramp.dark,
        ),
    }) +
    rect(left + hip, top - 0.5, right - left - hip * 2, 1, METAL.mid) +
    rect(left, bottom - 0.5, right - left, 1, ramp.dark)
  );
}

/** Plaster wall with stains, a shaded band under the eave and a stone plinth. */
export function wall(x: number, y: number, w: number, h: number, seed: number): string {
  const rng = new Rng(seed);
  const stains: string[] = [];
  for (let i = 0; i < Math.round((w * h) / 30); i++)
    stains.push(
      dot(x + rng.next() * w, y + 2 + rng.next() * (h - 4), 0.3 + rng.next() * 0.4, PLASTER.dark),
    );
  return (
    rect(x, y, w, h, PLASTER.mid) +
    rect(x, y, 1, h, PLASTER.light) +
    stains.join('') +
    rect(x, y, w, 2, PLASTER.dark) +
    rect(x + w - 1, y, 1, h, PLASTER.dark) +
    rect(x, y + h - 2, w, 2, STONE.mid) +
    rect(x, y + h - 2, w, 0.5, STONE.light) +
    Array.from({ length: Math.floor(w / 3) }, (_, i) =>
      line(x + 1.5 + i * 3, y + h - 2, x + 1.5 + i * 3, y + h, STONE.dark, 0.4),
    ).join('')
  );
}

/** Framed window: four panes with a sky reflection, sill and optional shutters. */
export function windowPane(x: number, y: number, w: number, h: number, shutters = true): string {
  const out = [
    rect(x, y, w, h, WOOD.dark),
    rect(x + 0.5, y + 0.5, w - 1, h - 1, GLASS),
    rect(x + 0.5, y + 0.5, w - 1, 1, '#6f98a8'),
    line(x + 1, y + h - 1.5, x + w * 0.45, y + 1.5, SKY, 0.5),
    line(x + w / 2, y + 0.5, x + w / 2, y + h - 0.5, WOOD.dark, 0.5),
    line(x + 0.5, y + h / 2, x + w - 0.5, y + h / 2, WOOD.dark, 0.5),
    rect(x - 0.5, y + h, w + 1, 1, WOOD.light),
  ];
  if (shutters) {
    for (const sx of [x - 2.2, x + w + 0.2]) {
      out.push(rect(sx, y, 2, h, WOOD.mid), rect(sx, y, 0.5, h, WOOD.light));
      for (let sy = y + 1; sy < y + h; sy += 1)
        out.push(line(sx + 0.4, sy, sx + 1.8, sy, WOOD.dark, 0.3));
    }
  }
  return out.join('');
}

/** Panelled wooden door with frame and handle. */
export function door(x: number, y: number, w: number, h: number): string {
  return [
    rect(x - 0.5, y - 0.5, w + 1, h + 0.5, WOOD.dark),
    rect(x, y, w, h, WOOD.mid),
    rect(x, y, 0.5, h, WOOD.light),
    rect(x + 1, y + 1, w - 2, h * 0.38, WOOD.dark),
    rect(x + 1.5, y + 1.5, w - 3, h * 0.38 - 1, WOOD.mid),
    rect(x + 1, y + h * 0.5, w - 2, h * 0.42, WOOD.dark),
    rect(x + 1.5, y + h * 0.5 + 0.5, w - 3, h * 0.42 - 1, WOOD.mid),
    dot(x + w - 1.2, y + h * 0.48, 0.4, METAL.light),
  ].join('');
}

/** Horizontal plank: lit top edge, dark bottom edge, grain line. */
export function plank(x: number, y: number, w: number, h = 1.5): string {
  return (
    rect(x, y, w, h, WOOD.mid) +
    rect(x, y, w, 0.5, WOOD.light) +
    rect(x, y + h - 0.5, w, 0.5, WOOD.dark)
  );
}

/** Upright post, lit on the left. */
export function post(x: number, y: number, h: number, w = 1.5): string {
  return (
    rect(x, y, w, h, WOOD.mid) +
    rect(x, y, 0.5, h, WOOD.light) +
    rect(x + w - 0.5, y, 0.5, h, WOOD.dark)
  );
}

/** Dressed stone blocks with staggered joints. */
export function stonework(x: number, y: number, w: number, h: number, seed = 3): string {
  const rng = new Rng(seed);
  const out = [rect(x, y, w, h, STONE.mid)];
  for (let row = 0; row * 2.5 < h; row++) {
    const yy = y + row * 2.5;
    out.push(rect(x, yy, w, 0.5, STONE.dark));
    for (let xx = x + (row % 2 ? 1 : 2.5); xx < x + w; xx += 3.5) {
      out.push(line(xx, yy, xx, Math.min(y + h, yy + 2.5), STONE.dark, 0.4));
      if (rng.chance(0.5)) out.push(rect(xx + 0.5, yy + 0.5, 1.5, 0.5, STONE.light));
    }
  }
  out.push(rect(x, y, 0.5, h, STONE.light), rect(x + w - 0.5, y, 0.5, h, STONE.dark));
  return out.join('');
}

/** A few grass blades at a building's foot. */
export function weeds(x: number, y: number, seed: number, count = 5): string {
  const rng = new Rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const bx = x + (rng.next() - 0.5) * 4;
    const h = 1.5 + rng.next() * 2;
    return line(bx, y, bx + (rng.next() - 0.5) * 1.6, y - h, i % 2 ? '#8fa05a' : '#6d8546', 0.4);
  }).join('');
}

/** Scattered broken stone and plaster. */
export function rubble(x: number, y: number, w: number, seed: number, count = 10): string {
  const rng = new Rng(seed);
  return Array.from({ length: count }, () => {
    const rx = x + rng.next() * w;
    const ry = y + (rng.next() - 0.5) * 1.5;
    const r = 0.4 + rng.next() * 0.5;
    return (
      dot(rx, ry, r, rng.chance(0.3) ? PLASTER.dark : STONE.mid) +
      dot(rx - r * 0.3, ry - r * 0.3, r * 0.4, STONE.light)
    );
  }).join('');
}

/** Soft contact shadow. */
export function groundShadow(x: number, y: number, w: number, h = 2.5): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#000" opacity="0.25"/>`;
}
