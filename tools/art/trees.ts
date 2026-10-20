// Large trees drawn as sprites (DECISIONS D109): an umbrella acacia taller than an elephant and
// a rounder marula, two variants each. Scenery: no outline (D13). The trunk base sits at
// (width / 2, height - TREE_FOOT_PX); the game anchors the sprite there.
import { TREE_FOOT_PX } from '../../src/config/game';
import { Rng } from '../../src/core/Rng';
import { foliage, LEAF, shadow } from './plants';
import { fill, limb, type Ramp } from './svg';

/** The trees are drawn at a base size, then scaled up so they tower over elephants. */
const K = TREE_FOOT_PX / 4;
const BASE_SIZES = { acacia: { w: 72, h: 64 }, marula: { w: 56, h: 60 } } as const;
export const TREE_SIZES = {
  acacia: { w: Math.round(72 * K), h: Math.round(64 * K) },
  marula: { w: Math.round(56 * K), h: Math.round(60 * K) },
} as const;
export type TreeKind = keyof typeof TREE_SIZES;
export const TREE_VARIANTS = 2;

const BARK: Ramp = { light: '#9a7a56', mid: '#6e5038', dark: '#4a3424' };

/** Bark texture: a lit edge and a few dark grooves along a trunk path. */
function trunk(d: string, w: number, seed: number): string {
  const rng = new Rng(seed);
  const grooves = Array.from({ length: 4 }, () => {
    const o = (rng.next() - 0.5) * w * 0.5;
    return `<path d="${d}" transform="translate(${o} 0)" fill="none" stroke="${BARK.dark}" stroke-width="0.4" stroke-dasharray="${1 + rng.next() * 2} ${1 + rng.next() * 2}"/>`;
  });
  return (
    limb(d, BARK.dark, w + 0.8, 0) +
    limb(d, BARK.mid, w, 0) +
    `<path d="${d}" transform="translate(${-w * 0.28} 0)" fill="none" stroke="${BARK.light}" stroke-width="${w * 0.25}" stroke-linecap="round"/>` +
    grooves.join('')
  );
}

/** One flat layer of an acacia crown: dark underside, then lit leaf clumps on top. */
function plate(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  return (
    fill(
      `M${cx - rx},${cy + 0.4} C${cx - rx * 0.6},${cy + ry * 1.5} ${cx + rx * 0.6},${cy + ry * 1.5} ${cx + rx},${cy + 0.4} Z`,
      LEAF.deep,
    ) + foliage(cx, cy, rx, ry, seed, Math.round(rx * ry * 1.6))
  );
}

function acaciaBase(variant: number): string {
  const { w, h } = BASE_SIZES.acacia;
  const rng = new Rng(300 + variant);
  const base = { x: w / 2, y: h - 4 };
  const lean = (rng.next() - 0.5) * 4;
  const fork = { x: base.x + lean, y: base.y - 22 };
  const span = 26 + rng.next() * 4;
  const top = 14 + rng.next() * 3;
  const branches = [
    `M${fork.x},${fork.y} C${fork.x - 6},${fork.y - 6} ${fork.x - 14},${top + 6} ${fork.x - span * 0.7},${top + 3}`,
    `M${fork.x},${fork.y} C${fork.x + 5},${fork.y - 7} ${fork.x + 12},${top + 6} ${fork.x + span * 0.65},${top + 2}`,
    `M${fork.x},${fork.y} C${fork.x - 1},${fork.y - 8} ${fork.x + 1},${top + 6} ${fork.x + 2},${top}`,
  ];
  return [
    shadow(base.x + 5, base.y + 1, span + 4, 3.2),
    trunk(
      `M${base.x},${base.y} C${base.x + 0.5},${base.y - 8} ${fork.x - 0.5},${fork.y + 8} ${fork.x},${fork.y}`,
      2.6,
      301 + variant,
    ),
    ...branches.map((d, i) => trunk(d, i === 2 ? 1.2 : 1.5, 310 + i + variant)),
    // Twigs reaching into the crown.
    ...Array.from({ length: 6 }, (_, i) => {
      const x = fork.x + (i - 2.5) * 8;
      return limb(`M${x},${top + 5} L${x + (rng.next() - 0.5) * 4},${top + 1}`, BARK.dark, 0.5, 0);
    }),
    // Layered umbrella crown: a wide lower layer, then smaller, brighter layers above.
    plate(fork.x - 1, top + 3.5, span + 2, 4, 320 + variant),
    plate(fork.x - span * 0.32, top, span * 0.6, 3.4, 330 + variant),
    plate(fork.x + span * 0.34, top + 0.6, span * 0.55, 3.2, 340 + variant),
    plate(fork.x + 1, top - 3, span * 0.5, 3, 350 + variant),
  ].join('');
}

function marulaBase(variant: number): string {
  const { w, h } = BASE_SIZES.marula;
  const rng = new Rng(400 + variant);
  const base = { x: w / 2, y: h - 4 };
  const cx = base.x + (rng.next() - 0.5) * 3;
  const cy = 22 + rng.next() * 2;
  return [
    shadow(base.x + 6, base.y + 1, 22, 3.4),
    trunk(
      `M${base.x},${base.y} C${base.x - 0.5},${base.y - 10} ${cx},${cy + 16} ${cx},${cy + 6}`,
      3.2,
      401 + variant,
    ),
    trunk(
      `M${cx},${cy + 14} C${cx - 4},${cy + 10} ${cx - 8},${cy + 6} ${cx - 11},${cy + 1}`,
      1.6,
      402 + variant,
    ),
    trunk(
      `M${cx + 0.5},${cy + 12} C${cx + 5},${cy + 9} ${cx + 9},${cy + 5} ${cx + 12},${cy}`,
      1.5,
      403 + variant,
    ),
    // Rounded crown built from overlapping lobes, darker underneath.
    foliage(cx - 10, cy + 2, 11, 9, 410 + variant, 70),
    foliage(cx + 10, cy + 3, 11, 9, 420 + variant, 70),
    foliage(cx, cy - 6, 15, 11, 430 + variant, 120),
    foliage(cx - 3, cy - 12, 9, 6, 440 + variant, 40),
    // Gaps in the leaves show branches and sky-dark holes.
    limb(`M${cx - 4},${cy + 6} L${cx - 7},${cy + 2}`, BARK.dark, 0.7, 0),
    limb(`M${cx + 5},${cy + 7} L${cx + 8},${cy + 3}`, BARK.dark, 0.7, 0),
  ].join('');
}

const scaled = (draw: (variant: number) => string) => (variant: number) =>
  `<g transform="scale(${K})">${draw(variant)}</g>`;

export const TREE_ART: Record<TreeKind, (variant: number) => string> = {
  acacia: scaled(acaciaBase),
  marula: scaled(marulaBase),
};
