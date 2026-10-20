// Waterhole states (spec §6.1) at 2× detail (DECISIONS D106): clear, muddy, drying, dry.
// A map feature: no outline (D13). 96×96 world px per frame.
import { Rng } from '../../src/core/Rng';
import { LEAF } from './plants';
import { dot, ellipse, fill, limb } from './svg';

const C = 48;
const MUD = { light: '#8a7e62', mid: '#6f6650', dark: '#4f4838', wet: '#5a5240' };
const WATER = { edge: '#7fa3b5', mid: '#56809a', deep: '#3d6079', glint: '#cfe6ee' };
const DRY = { plate: '#9a8460', light: '#b7a07a', crack: '#5a4a36' };

function inside(x: number, y: number, rx: number, ry: number, cy = C): boolean {
  const dx = (x - C) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Muddy bank: a dark wet rim at the front, a dried lighter lip at the back, hoof prints. */
function bank(rx: number, ry: number, seed: number): string {
  const rng = new Rng(seed);
  const prints = Array.from({ length: 30 }, () => {
    const a = rng.next() * Math.PI * 2;
    const d = 0.8 + rng.next() * 0.14;
    const x = C + Math.cos(a) * rx * d;
    const y = C + 1 + Math.sin(a) * ry * d;
    return dot(x, y, 0.45, MUD.dark) + dot(x + 0.9, y, 0.45, MUD.dark);
  });
  return [
    fill(ellipse(C, C + 1.5, rx + 1, ry + 1), MUD.dark),
    fill(ellipse(C, C + 0.5, rx, ry), MUD.mid),
    fill(
      `M${C - rx},${C} C${C - rx},${C - ry * 1.3} ${C + rx},${C - ry * 1.3} ${C + rx},${C} C${C + rx * 0.7},${C - ry * 0.8} ${C - rx * 0.7},${C - ry * 0.8} ${C - rx},${C} Z`,
      MUD.light,
    ),
    ...prints,
  ].join('');
}

/** Water from a pale shallow edge to a deep middle, shaded under the far bank, with glints. */
function water(rx: number, ry: number, seed: number, murky = false): string {
  const rng = new Rng(seed);
  const glints = Array.from({ length: Math.round(rx / 3) }, () => {
    const x = C + (rng.next() - 0.55) * rx * 1.1;
    const y = C + (rng.next() - 0.35) * ry * 1.1;
    const len = 1.5 + rng.next() * 2.5;
    return (
      limb(`M${x},${y} L${x + len},${y}`, WATER.glint, 0.5, 0) +
      limb(`M${x + 0.6},${y + 0.8} L${x + len - 0.4},${y + 0.8}`, WATER.edge, 0.4, 0)
    );
  });
  const silt = murky
    ? Array.from({ length: Math.round(rx * ry * 0.25) }, () => {
        const x = C + (rng.next() * 2 - 1) * rx;
        const y = C + 1 + (rng.next() * 2 - 1) * ry;
        return inside(x, y, rx - 1.5, ry - 1.5, C + 1)
          ? dot(x, y, 0.35 + rng.next() * 0.4, '#7a6a4a')
          : '';
      })
    : [];
  return [
    // A thin band of shade under the far bank, then shallows, open water and the deep middle.
    fill(ellipse(C, C + 1, rx, ry), murky ? '#4a5650' : WATER.deep),
    fill(ellipse(C, C + 2, rx - 0.2, ry - 1), murky ? '#6f7a6a' : WATER.edge),
    fill(ellipse(C + 0.6, C + 2.4, rx - 2.2, ry - 2.6), murky ? '#5f6e64' : WATER.mid),
    rx > 14
      ? fill(ellipse(C + 2, C + 3.4, rx * 0.64, ry * 0.56), murky ? '#4f5f58' : WATER.deep)
      : '',
    ...silt,
    ...glints,
  ].join('');
}

/** Reeds (green, with seed heads) or dead stalks. */
function reeds(spots: readonly (readonly [number, number])[], seed: number, dead = false): string {
  const rng = new Rng(seed);
  return spots
    .map(([bx, by]) =>
      Array.from({ length: 9 }, (_, i) => {
        const x = bx + i * 0.7 - 3;
        const h = 4 + rng.next() * 5;
        const lean = (rng.next() - 0.5) * 2.4;
        const color = dead
          ? i % 2
            ? '#8f7339'
            : '#a88a4a'
          : i % 3 === 0
            ? LEAF.light
            : i % 3 === 1
              ? LEAF.mid
              : LEAF.dark;
        const stem = limb(
          `M${x},${by} Q${x + lean * 0.3},${by - h * 0.6} ${x + lean},${by - h}`,
          color,
          0.45,
          0,
        );
        const head =
          !dead && rng.chance(0.35)
            ? fill(ellipse(x + lean, by - h - 0.6, 0.35, 0.9), '#5a3e26')
            : '';
        return stem + head;
      }).join(''),
    )
    .join('');
}

function stones(spots: readonly (readonly [number, number])[]): string {
  return spots
    .map(
      ([x, y]) =>
        fill(ellipse(x, y + 0.6, 2.6, 1.6), '#5e5a52') +
        fill(ellipse(x - 0.2, y, 2.4, 1.5), '#827d70') +
        fill(ellipse(x - 0.8, y - 0.6, 1, 0.5), '#a8a397'),
    )
    .join('');
}

/** Cracked, dried mud in irregular plates with bleached edges. */
function cracked(rx: number, ry: number, seed: number): string {
  const rng = new Rng(seed);
  const cracks: string[] = [];
  for (let i = 0; i < Math.round(rx * 0.8); i++) {
    let x = C + (rng.next() * 2 - 1) * rx * 0.8;
    let y = C + (rng.next() * 2 - 1) * ry * 0.7;
    let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
    for (let s = 0; s < 4; s++) {
      x += (rng.next() - 0.5) * 5;
      y += (rng.next() - 0.5) * 3;
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    cracks.push(limb(d, DRY.crack, 0.45, 0));
  }
  const flecks = Array.from({ length: Math.round(rx * 1.5) }, () =>
    dot(
      C + (rng.next() * 2 - 1) * rx * 0.75,
      C + (rng.next() * 2 - 1) * ry * 0.65,
      0.35,
      DRY.light,
    ),
  );
  return [
    fill(ellipse(C, C + 1.5, rx + 1, ry + 1), MUD.mid),
    fill(ellipse(C, C + 0.5, rx, ry), DRY.plate),
    fill(ellipse(C - 3, C - 1.5, rx * 0.65, ry * 0.55), DRY.light),
    ...cracks,
    ...flecks,
  ].join('');
}

const REEDS = [
  [12, 50],
  [15, 62],
  [81, 46],
  [84, 58],
  [70, 74],
] as const;
const STONES = [
  [26, 24],
  [73, 25],
  [22, 72],
] as const;

function lilies(): string {
  return (
    [
      [30, 58],
      [34.5, 61],
      [64, 40],
    ]
      .map(
        ([x, y]) =>
          fill(ellipse(x ?? 0, y ?? 0, 2.2, 1.3), LEAF.mid) +
          fill(ellipse((x ?? 0) - 0.6, (y ?? 0) - 0.4, 1, 0.5), LEAF.light),
      )
      .join('') +
    dot(31, 57.4, 0.6, '#f4f0f6') +
    dot(31.4, 57.2, 0.3, '#f0d060')
  );
}

export function clear(): string {
  return bank(40, 31, 1) + water(34.5, 25.5, 11) + lilies() + reeds(REEDS, 12) + stones(STONES);
}
export function muddy(): string {
  return (
    cracked(38, 29, 2) +
    bank(30, 22, 21) +
    water(25, 17, 22, true) +
    reeds(REEDS.slice(0, 3), 23) +
    reeds(REEDS.slice(3), 24, true) +
    stones(STONES)
  );
}
export function drying(): string {
  return (
    cracked(37, 28, 3) +
    bank(19, 13, 31) +
    water(13, 8.5, 32, true) +
    reeds(REEDS, 33, true) +
    stones(STONES)
  );
}
export function dry(): string {
  return cracked(36, 27, 4) + reeds(REEDS.slice(1, 4), 43, true) + stones(STONES.slice(0, 2));
}

export const WATERHOLE_FRAMES = [clear, muddy, drying, dry];
