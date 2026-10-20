// Grazing and browsing animals (DECISIONS D106): drawn in world pixels facing right, two
// walk frames, rendered to pixel art at 2× detail with a dark outline (D13).
import { dot, ellipse, fill, limb, type Ramp, shaded } from './svg';

export type Frame = 0 | 1;

/** Leg as a bent stroke: upper part in `color`, shin and hoof darker. */
export function leg(
  hip: [number, number],
  knee: [number, number],
  foot: [number, number],
  color: string,
  shin: string,
  w: number,
): string {
  return (
    limb(`M${hip[0]},${hip[1]} L${knee[0]},${knee[1]} L${foot[0]},${foot[1]}`, color, w, 0) +
    limb(`M${knee[0]},${knee[1]} L${foot[0]},${foot[1]}`, shin, w * 0.9, 0)
  );
}

/** Banded stroke (zebra legs, elephant trunk rings). */
function bands(d: string, color: string, w: number, dash: string): string {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="${dash}" stroke-linecap="butt"/>`;
}

const IMPALA: Ramp = { light: '#dc9450', mid: '#c4743a', dark: '#9a5424' };
const IMPALA_SADDLE = '#a5561f';
const IMPALA_FLANK = '#e6ad70';
const CREAM = '#f3ede0';
const HORN = '#33251a';

export function impala(frame: Frame): string {
  const a = frame === 0;
  const body =
    'M5.5,12 C5.4,9.6 8.4,8.7 11.5,9.2 C13.6,9.5 15.4,9 16.9,9.9 C18.4,11 18.1,13.6 16.6,15 C14.6,16.1 10,16.1 7.6,15.6 C6,15.1 5.4,13.8 5.5,12 Z';
  const neck = 'M15.2,11.8 C15.8,9 16.8,7.2 17.7,5.6 L19.3,6.1 C18.6,7.8 18,9.8 17.6,12.2 Z';
  const head =
    'M16.9,4.6 C18,3.4 20.1,3.9 21.6,5.4 C22.2,6.2 21.6,6.9 20.8,6.9 C19.7,6.9 18.4,6.6 17.4,6.3 Z';
  return [
    leg([8.8, 14], [8.3, 17.6], a ? [9.6, 21.6] : [7.4, 21.6], '#93542a', '#7a4422', 0.75),
    leg([15.4, 14], [15.6, 17.8], a ? [14.6, 21.6] : [16.6, 21.6], '#93542a', '#7a4422', 0.75),
    limb('M5.9,11 Q4.5,12 4.9,14', CREAM, 0.9, 0),
    limb('M4.85,13.3 L4.9,14.1', HORN, 0.9, 0),
    shaded(body, IMPALA, {
      extra:
        fill('M0,0 H24 V10.7 C18,10.2 10,11.1 0,10.7 Z', IMPALA_SADDLE) +
        fill('M0,12.9 C8,13.5 14,13.3 24,12.7 V14.3 C14,14.8 8,14.9 0,14.4 Z', IMPALA_FLANK) +
        fill('M0,14.4 C8,14.9 14,14.8 24,14.3 V24 H0 Z', CREAM) +
        fill(ellipse(6.1, 12.4, 1.1, 2.6), CREAM) +
        limb('M7.3,10.3 C6.7,12 6.8,13.8 7.5,15.2', HORN, 0.4, 0),
    }),
    leg([9.6, 14.4], [9.2, 17.8], a ? [7.9, 21.6] : [10.5, 21.6], IMPALA.mid, '#a35e2c', 0.85),
    leg([16.3, 14.2], [16.4, 17.9], a ? [17.1, 21.6] : [15.3, 21.6], IMPALA.mid, '#a35e2c', 0.85),
    shaded(neck, IMPALA, {
      extra: fill('M18.7,5.8 C18,8 17.7,10 17.5,12.4 L20,12.4 L20,5.8 Z', IMPALA_FLANK),
    }),
    shaded(head, IMPALA, {
      light: ellipse(18.4, 4.6, 1.3, 0.6),
      extra:
        fill('M19.6,6.9 C20.6,7 21.4,6.8 21.8,6.1 L22.4,7.4 L19.4,7.4 Z', CREAM) +
        dot(21.75, 5.65, 0.4, HORN),
    }),
    shaded('M17.3,4.3 C16.1,3 15.9,2.1 16.7,2 C17.5,2.3 18,3.4 18.1,4.2 Z', IMPALA, {
      extra: fill('M16.8,2.6 C17.2,2.9 17.5,3.4 17.6,3.9 L17.2,3.9 Z', '#e9b98a'),
    }),
    dot(18.95, 4.75, 0.55, CREAM),
    dot(19.05, 4.75, 0.38, HORN),
    limb('M18.3,3.7 C17.6,2.2 16.8,1.4 17.4,0.3', HORN, 0.5, 0),
    limb('M19,3.5 C19,2 18.5,1.1 19.3,0.2', HORN, 0.5, 0),
  ].join('');
}

const ZEBRA: Ramp = { light: '#ffffff', mid: '#f1eee5', dark: '#c9c3b6' };
const STRIPE = '#22201d';

export function zebra(frame: Frame): string {
  const a = frame === 0;
  const body =
    'M4.8,12.4 C4.8,9.8 8,8.6 11.5,9 C14,9.2 15.8,9 17.2,10.1 C18.6,11.2 18.2,13.9 16.8,15.2 C14.6,16.3 9.8,16.3 7.2,15.8 C5.6,15.4 4.8,14.2 4.8,12.4 Z';
  const neck = 'M14.6,11.6 C15.4,9.2 16.5,7.3 17.7,5.8 L20.3,6.7 C19.3,8.3 18.5,10.3 18,12.6 Z';
  const head =
    'M17.4,5.3 C18.5,4.4 20.4,4.6 22.2,6.4 C22.9,7.1 22.6,8 21.8,8.1 C20.6,8.2 19,7.7 17.9,7.1 Z';
  const torsoStripes = [8, 9.4, 10.8, 12.2, 13.6, 15]
    .map((x) => limb(`M${x},8 C${x + 0.5},11 ${x - 0.3},13 ${x + 0.2},14.6`, STRIPE, 0.55, 0))
    .join('');
  const rumpStripes = [10.4, 11.8, 13.2]
    .map((y) => limb(`M4,${y} C5.4,${y - 0.6} 6.4,${y - 1.2} 7.4,${y - 2.4}`, STRIPE, 0.5, 0))
    .join('');
  const neckStripes = [7, 8.4, 9.8, 11.2]
    .map((y) => limb(`M14,${y + 1.4} L21,${y - 1}`, STRIPE, 0.5, 0))
    .join('');
  const zebraLeg = (hip: [number, number], foot: [number, number], far: boolean): string =>
    limb(`M${hip[0]},${hip[1]} L${foot[0]},${foot[1]}`, far ? ZEBRA.dark : ZEBRA.mid, 0.95, 0) +
    bands(`M${hip[0]},${hip[1] + 2.2} L${foot[0]},${foot[1] - 0.4}`, STRIPE, 0.95, '0.45 0.5') +
    dot(foot[0], foot[1], 0.5, STRIPE);
  return [
    zebraLeg([8.6, 14], a ? [9.6, 21.4] : [7.4, 21.4], true),
    zebraLeg([15.6, 14], a ? [14.6, 21.4] : [16.8, 21.4], true),
    limb('M4.9,11.6 Q3.8,12.6 3.9,15', ZEBRA.mid, 0.5, 0),
    fill(ellipse(3.9, 15.6, 0.55, 1), STRIPE),
    shaded(body, ZEBRA, { extra: torsoStripes + rumpStripes }),
    zebraLeg([9.6, 14.4], a ? [8, 21.6] : [10.6, 21.6], false),
    zebraLeg([16.5, 14.2], a ? [17.2, 21.6] : [15.3, 21.6], false),
    shaded(neck, ZEBRA, { extra: neckStripes }),
    // Upright striped mane along the neck.
    limb('M14.9,10.6 C15.7,8.6 16.7,6.9 17.9,5.4', STRIPE, 1, 0),
    bands('M14.9,10.6 C15.7,8.6 16.7,6.9 17.9,5.4', ZEBRA.mid, 0.6, '0.4 0.45'),
    shaded(head, ZEBRA, {
      extra:
        limb('M18,5.6 L20.6,7.4', STRIPE, 0.4, 0) +
        limb('M19.2,5.1 L21.3,6.8', STRIPE, 0.4, 0) +
        fill('M21.2,5.6 L24,5.6 L24,9 L21,9 Z', '#3b3632'),
    }),
    shaded('M17.9,4.9 C17.4,3.6 17.6,2.7 18.3,2.8 C18.8,3.2 18.9,4 18.8,4.8 Z', ZEBRA, {}),
    dot(19.2, 5.6, 0.4, STRIPE),
  ].join('');
}

const ELEPHANT: Ramp = { light: '#b3afb9', mid: '#938f9b', dark: '#6c6875' };
const ELEPHANT_FAR: Ramp = { light: '#8f8b97', mid: '#7a7682', dark: '#5d5966' };
const TUSK = '#f2ecdc';

/** Column leg; `lean` slants the foot for the walk cycle. Toenails along the bottom. */
function pillar(x: number, lean: number, ramp: Ramp): string {
  const d = `M${x},26 L${x + 5.2},26 L${x + 5.2 + lean},42.2 C${x + 4.6 + lean},43.2 ${x + 0.6 + lean},43.2 ${x + lean},42.2 Z`;
  return (
    shaded(d, ramp, { rim: [0.9, 0] }) +
    [1, 2.6, 4.2].map((t) => dot(x + lean + t, 42.4, 0.5, '#d8d2c8')).join('')
  );
}

export function elephant(frame: Frame): string {
  const a = frame === 0;
  const body =
    'M7,22 C7,14 14,10 22,10.5 C29,11 34,13 35,19 C36,25 34,31 28,32.5 C21,34 13,33.5 9.5,31 C7.6,29.5 7,26 7,22 Z';
  const head =
    'M31.5,15 C31.5,10.5 35,8.5 38.5,9 C42,9.5 43.5,12.5 43,16 C42.8,18 42,19.5 41,20.5 L36,22 C33,21.5 31.5,18.5 31.5,15 Z';
  const ear =
    'M30.2,11.6 C26.2,11.8 24.6,16 25,21 C25.4,26 28.4,29.2 32,28.4 C34.6,27.8 35.6,23.4 35.2,18.4 C34.8,14.2 33.2,11.4 30.2,11.6 Z';
  const trunk = 'M40.6,18.6 C42.2,22.6 42.8,28 42.5,32 C42.3,34.6 43.1,36.6 44.8,36.2';
  const wrinkles = [13, 16.5, 20]
    .map((x) => limb(`M${x},19 C${x - 0.6},22 ${x - 0.4},25 ${x + 0.4},28`, ELEPHANT.dark, 0.45, 0))
    .join('');
  return [
    pillar(15, a ? 1.6 : -1.6, ELEPHANT_FAR),
    pillar(29.5, a ? -1.6 : 1.6, ELEPHANT_FAR),
    limb('M7.6,19.5 C6.6,23 6.2,26 6.4,29.6', ELEPHANT.mid, 0.8, 0),
    fill(ellipse(6.4, 30.4, 0.7, 1.2), '#3a3640'),
    shaded(body, ELEPHANT, {
      rim: [1.2, 1.4],
      light: 'M10,16 C14,11.6 22,11 28,12.6 C24,12.8 16,13.6 10,16 Z',
      extra: wrinkles,
    }),
    pillar(10.5, a ? -1.6 : 1.6, ELEPHANT),
    pillar(25.5, a ? 1.6 : -1.6, ELEPHANT),
    shaded(head, ELEPHANT, { rim: [1, 1], light: ellipse(37.6, 11.4, 3, 1.4) }),
    limb(trunk, ELEPHANT.dark, 2.8, 0),
    limb(trunk, ELEPHANT.mid, 2.2, 0),
    bands(trunk, ELEPHANT.dark, 2.2, '0.35 1.1'),
    shaded(ear, ELEPHANT, {
      rim: [1, 1],
      light: 'M26,17 C26.6,13.6 28.4,12.2 30.6,12.4 C28.6,13 27,14.8 26,17 Z',
      extra:
        fill(ellipse(30.6, 20.6, 3, 5.4), '#857f8c') +
        limb('M28.4,17 C29.6,19 29.4,22 30.6,24.6', ELEPHANT.dark, 0.4, 0) +
        limb('M31.4,16.4 C32.2,19 31.8,21.6 32.6,23.8', ELEPHANT.dark, 0.4, 0),
    }),
    limb('M39.4,20.2 C40.4,22.8 42,24.4 44.2,24.2', TUSK, 1.1, 0),
    dot(38.8, 13.4, 0.75, '#2a2630'),
    dot(38.6, 13.1, 0.25, '#e8e4ee'),
    limb('M37.2,21.6 C38,22.4 39,22.6 39.6,22', '#4a4652', 0.5, 0),
  ].join('');
}
