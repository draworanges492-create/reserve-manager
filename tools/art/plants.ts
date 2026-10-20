// Trees, bushes, boulders and grass (24×24 world tiles at 2× detail, DECISIONS D106).
// Scenery: no outline (D13), soft contact shadow, leaf clumps lit from the top left.
import { Rng } from '../../src/core/Rng';
import { dot, ellipse, fill, limb, type Ramp, shaded } from './svg';

export const LEAF: Ramp & { glint: string; deep: string } = {
  glint: '#97b264',
  light: '#73944e',
  mid: '#557a3c',
  dark: '#3d5a2f',
  deep: '#2c4224',
};
const BARK: Ramp = { light: '#8c6a48', mid: '#6a4a32', dark: '#4a3424' };
const STONE: Ramp = { light: '#a8a397', mid: '#827d70', dark: '#5e5a52' };

export function shadow(cx: number, cy: number, rx: number, ry: number): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.25"/>`;
}

/** Foliage: a deep base, then clumps whose tone depends on how lit their spot is. */
export function foliage(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  clumps: number,
): string {
  const rng = new Rng(seed);
  const out = [fill(ellipse(cx, cy + ry * 0.12, rx, ry), LEAF.deep)];
  const spots: [number, number, number][] = [];
  for (let i = 0; i < clumps; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = Math.sqrt(rng.next());
    spots.push([
      cx + Math.cos(a) * rx * d * 0.86,
      cy + Math.sin(a) * ry * d * 0.8,
      0.7 + rng.next() * 0.9,
    ]);
  }
  // Draw darker clumps first so the lit ones sit on top.
  const lit = (x: number, y: number) => (cx - x) / rx + (cy - y) / ry;
  spots.sort((p, q) => lit(p[0], p[1]) - lit(q[0], q[1]));
  for (const [x, y, r] of spots) {
    const l = lit(x, y);
    const color = l > 0.75 ? LEAF.glint : l > 0.15 ? LEAF.light : l > -0.5 ? LEAF.mid : LEAF.dark;
    out.push(fill(ellipse(x, y, r, r * 0.85), color));
  }
  return out.join('');
}

/** Round, leafy tree (e.g. a marula). */
export function tree(): string {
  return [
    shadow(13, 21.8, 8.5, 1.8),
    shaded('M10.8,22 C11.2,19 11.4,15 11.2,12 L13.6,12 C13.4,15 13.6,19 14.2,22 Z', BARK, {
      rim: [0.5, 0],
      light: 'M11.4,12 L12,12 L11.9,21.5 L11.3,21.5 Z',
    }),
    limb('M12.6,15 C14,13.6 15.2,12.4 16.4,10.6', BARK.mid, 0.7, 0),
    limb('M12,14.4 C10.8,13 9.8,12 8.8,10.6', BARK.dark, 0.6, 0),
    foliage(12.2, 8.6, 10.2, 7.6, 151, 46),
  ].join('');
}

/** Flat-topped umbrella acacia on a forked trunk. */
export function acacia(): string {
  return [
    shadow(12.5, 22, 9, 1.6),
    limb('M12.4,22 C12.2,18 11.6,15 11.2,12.6', BARK.mid, 1.3, 0),
    limb('M12.8,21.8 C12.6,18.4 12.2,15.6 11.8,13', BARK.dark, 0.5, 0),
    limb('M11.3,13 C9.6,11 8,9.6 6.2,8.4', BARK.mid, 0.7, 0),
    limb('M11.6,13.4 C13.4,11.2 15.4,9.8 17.6,8.6', BARK.dark, 0.7, 0),
    limb('M11.4,12.6 C11.6,10.6 12,9.4 12.4,8', BARK.mid, 0.55, 0),
    limb('M11.9,21.6 C11.7,18 11.3,15.4 11,13', BARK.light, 0.35, 0),
    fill(ellipse(12, 7.8, 11.4, 2.5), LEAF.deep),
    foliage(11.8, 6, 10.6, 2.6, 7, 60),
  ].join('');
}

export function bush(): string {
  return [
    shadow(12.5, 20.2, 8, 1.6),
    foliage(9, 16.2, 5, 3.8, 31, 16),
    foliage(15.4, 15.8, 5.4, 4.2, 32, 18),
    foliage(12, 13.4, 4.6, 3.4, 33, 14),
    dot(9.6, 15.4, 0.45, '#c2402f'),
    dot(15, 13.4, 0.45, '#c2402f'),
    dot(17.2, 16.2, 0.45, '#c2402f'),
    dot(12.4, 12.2, 0.4, '#e05a44'),
  ].join('');
}

export function boulder(): string {
  return [
    shadow(12.8, 19.6, 9, 2),
    shaded(
      'M4.2,17 C3.8,13 7,9.6 11.6,9.4 C16.4,9.2 20.2,12 20.4,15.6 C20.6,18.4 18,19.6 12.4,19.6 C7.6,19.6 4.4,19 4.2,17 Z',
      STONE,
      {
        rim: [1, 1.1],
        light: 'M6.6,13.2 C7.6,11 10,10.2 12.6,10.4 C10.4,11.2 8.4,12.2 6.6,13.2 Z',
        extra:
          limb('M14,11 C14.6,12.6 14.4,14 15.6,15.4', STONE.dark, 0.4, 0) +
          limb('M15.6,15.4 L17.6,16.2', STONE.dark, 0.35, 0) +
          dot(9, 15.6, 0.45, '#9aa06a') +
          dot(10, 16.2, 0.35, '#9aa06a'),
      },
    ),
    shaded(ellipse(20.6, 18.6, 2.2, 1.5), STONE, { rim: [0.4, 0.4] }),
  ].join('');
}

export function grassTuft(): string {
  const rng = new Rng(191);
  const blades: string[] = [];
  const colors = ['#b4a464', '#8fa05a', '#6d8546', '#c8b878'];
  for (let clump = 0; clump < 3; clump++) {
    const bx = 5 + rng.next() * 14;
    const by = 13 + rng.next() * 8;
    for (let i = 0; i < 7; i++) {
      const lean = (rng.next() - 0.5) * 3;
      const h = 2.5 + rng.next() * 3;
      const x = bx + i * 0.6 - 2;
      blades.push(
        limb(
          `M${x},${by} Q${x + lean * 0.3},${by - h * 0.6} ${x + lean},${by - h}`,
          colors[i % colors.length] ?? '#8fa05a',
          0.4,
          0,
        ),
      );
    }
  }
  return blades.join('');
}
