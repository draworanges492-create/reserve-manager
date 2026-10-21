// Predators and scavengers (DECISIONS D106, D107): lion, spotted hyena, white-backed vulture.
// Drawn in world pixels facing right, two frames each.
import { type Frame, leg } from './animals';
import { dot, ellipse, fill, limb, type Ramp, shaded } from './svg';

const LION: Ramp = { light: '#efc463', mid: '#d9a446', dark: '#b07e2c' };
const LION_FAR = '#a87628';
const MANE: Ramp = { light: '#b8652a', mid: '#94481a', dark: '#6a3010' };
const PALE = '#f1dfb0';
const NOSE = '#4a2a1a';

export function lion(frame: Frame): string {
  const a = frame === 0;
  const body =
    'M4.6,12.6 C4.6,10.4 7.2,9.6 10.6,9.8 C13.2,10 15.2,9.8 16.4,10.8 C17.8,12 17.6,14.6 16.2,15.8 C14,16.8 9.8,16.7 7.2,16.3 C5.4,15.9 4.6,14.4 4.6,12.6 Z';
  const mane =
    'M14.2,13.8 C13.1,11.4 13.2,8.4 14.8,6.8 C16.2,5.4 18.4,5.2 19.8,6.2 C21.2,7.2 21.6,9.2 21,11.2 C20.4,13 18.6,14.6 16.6,14.8 C15.6,14.9 14.7,14.6 14.2,13.8 Z';
  const face =
    'M17.6,8.2 C18.6,7.4 20.4,7.6 21.6,8.8 C22.4,9.8 22.2,11.4 21.2,12 C20.2,12.6 18.6,12.4 17.8,11.4 C17.2,10.6 17.1,9 17.6,8.2 Z';
  const curls = [
    [14.6, 9],
    [15.2, 11.6],
    [16.4, 13.4],
    [15.6, 7.4],
    [18.6, 6.2],
    [20.4, 7],
  ]
    .map(([x, y]) => limb(`M${x},${y} q0.6,0.4 0.3,1`, MANE.dark, 0.35, 0))
    .join('');
  const paw = (x: number) => fill(ellipse(x, 21.5, 0.85, 0.45), LION.light);
  const lionLeg = (hip: [number, number], foot: [number, number], color: string) =>
    leg(hip, [hip[0] + (foot[0] - hip[0]) * 0.5, 18], foot, color, color, 1.4) + paw(foot[0]);
  return [
    lionLeg([8.4, 14.6], a ? [9.4, 21.2] : [7.4, 21.2], LION_FAR),
    lionLeg([15.2, 14.6], a ? [14.2, 21.2] : [16.2, 21.2], LION_FAR),
    limb('M4.9,12 C3.2,12.4 2.6,10.8 2.4,9.2', LION.mid, 0.55, 0),
    fill(ellipse(2.4, 8.6, 0.8, 1), MANE.dark),
    shaded(body, LION, {
      light: 'M6,11 C8,9.9 12,9.8 15,10.4 C12,10.9 8,11 6,11 Z',
      extra: fill('M0,15 C8,15.6 12,15.6 24,15 V24 H0 Z', PALE),
    }),
    lionLeg([9.4, 15], a ? [7.9, 21.4] : [10.5, 21.4], LION.mid),
    lionLeg([16.2, 15], a ? [16.9, 21.4] : [15.2, 21.4], LION.mid),
    shaded(mane, MANE, { rim: [0.8, 0.8], light: ellipse(16.4, 7.8, 1.6, 1.2), extra: curls }),
    fill(ellipse(18.3, 6.6, 0.85, 0.75), LION.mid),
    fill(ellipse(18.3, 6.7, 0.4, 0.35), MANE.dark),
    shaded(face, LION, { light: ellipse(18.8, 8.6, 1.2, 0.6) }),
    fill(ellipse(21, 10.9, 1.1, 0.85), PALE),
    dot(22, 10.2, 0.4, NOSE),
    limb('M21.2,11.4 L21.8,11.6', NOSE, 0.25, 0),
    dot(19.6, 9.3, 0.38, '#3a2a1c'),
    dot(19.5, 9.15, 0.12, '#f0d080'),
  ].join('');
}

const HYENA: Ramp = { light: '#d2be92', mid: '#b8a173', dark: '#8e7a52' };
const SPOT = '#4e3c28';
const SNOUT = '#3a3028';

export function hyena(frame: Frame): string {
  const a = frame === 0;
  // Sloping back: shoulders higher than the hips.
  const body =
    'M5.4,13.6 C5.4,11.8 7.4,10.8 10.2,10.4 C12.6,10 14.8,9 16.6,9.2 C18.2,9.4 18.6,11.6 17.8,13.4 C17,15 14.6,15.8 11.6,15.9 C9,16 6.8,15.7 5.9,15 C5.5,14.6 5.4,14.1 5.4,13.6 Z';
  const head =
    'M16.2,9.8 C17,8 19.2,7.4 20.9,8.2 C22.4,8.9 22.9,10.3 22.5,11.2 C22,12.2 20.6,12.4 19.4,12.2 C18,12 16.6,11.3 16.2,9.8 Z';
  const spots = [
    [8, 12.4],
    [10, 11.6],
    [12.2, 12.8],
    [14.2, 11],
    [9, 14.4],
    [13.6, 14.4],
    [16, 12.6],
    [6.8, 13.8],
  ]
    .map(([x, y]) => dot(x ?? 0, y ?? 0, 0.5, SPOT))
    .join('');
  return [
    leg([7.6, 14.6], [6.8, 17.8], a ? [8.4, 21.6] : [6.4, 21.6], HYENA.dark, '#6e5c3c', 0.85),
    leg([15.6, 13.4], [15.8, 17.6], a ? [14.8, 21.6] : [16.8, 21.6], HYENA.dark, '#6e5c3c', 0.85),
    limb('M5.6,12.6 C4.6,13.2 4.2,14.6 4.4,15.6', HYENA.mid, 0.55, 0),
    fill(ellipse(4.4, 16, 0.5, 0.8), SNOUT),
    shaded(body, HYENA, {
      light: 'M8,11.2 C10,10.6 13,10 15.6,9.6 C13,10.6 10,11.2 8,11.2 Z',
      extra: spots,
    }),
    // Short dark crest along the back.
    limb('M8,10.7 C11,10.1 14,9.2 16.6,8.8', SPOT, 0.55, 0),
    leg([8.6, 15], [7.8, 18], a ? [6.9, 21.6] : [9.3, 21.6], HYENA.mid, '#8a7650', 0.95),
    leg([16.6, 13.8], [16.8, 17.8], a ? [17.4, 21.6] : [15.9, 21.6], HYENA.mid, '#8a7650', 0.95),
    shaded(head, HYENA, {
      extra: fill('M21,8 L24,8 L24,13 L21,13 Z', SNOUT) + dot(19, 10.4, 0.45, SPOT),
    }),
    // Big round ears.
    shaded(ellipse(17.4, 7.8, 1, 1.1), HYENA, { extra: fill(ellipse(17.5, 8, 0.45, 0.55), SNOUT) }),
    dot(19.8, 9.3, 0.38, '#1e1610'),
    dot(22.4, 9.9, 0.35, '#120c08'),
  ].join('');
}

const VULTURE: Ramp = { light: '#9a7e60', mid: '#76604a', dark: '#4e3f32' };
const RUFF = '#efe6d6';
const SKIN: Ramp = { light: '#b8aca6', mid: '#9e928c', dark: '#7a6e69' };
const BEAK = '#34302c';

export function vulture(frame: Frame): string {
  const up = frame === 1; // second frame: wings half open, mid-hop
  const lift = up ? -0.6 : 0;
  const body =
    'M6,15 C5.6,11.6 8,8.6 11.6,8.4 C14.6,8.2 16.4,10.4 16.2,13.4 C16,16.4 13.6,18.6 10.6,18.6 C8,18.6 6.4,17.4 6,15 Z';
  const coverts = [11, 12.6, 14.2]
    .map((y) =>
      limb(`M7.4,${y} C9.4,${y - 0.6} 11.6,${y - 0.4} 13.4,${y + 0.6}`, VULTURE.light, 0.35, 0),
    )
    .join('');
  const wing = up
    ? shaded('M8.6,11.6 C8.4,7.4 10.6,4.2 14.2,3.6 C13.2,5.4 12.6,7.6 12.8,10.6 Z', VULTURE, {
        extra: [9.4, 10.6, 11.8]
          .map((x) => limb(`M${x},${10.6} L${x - 0.8},${5.6}`, VULTURE.dark, 0.35, 0))
          .join(''),
      })
    : '';
  return `<g transform="translate(0 ${lift})">${[
    limb('M10.2,18.2 L10.4,21.4', '#5a5450', 0.6, 0),
    limb('M12.2,18.2 L12.6,21.4', '#5a5450', 0.6, 0),
    limb('M9.6,21.6 L11.2,21.6', '#5a5450', 0.4, 0),
    limb('M11.8,21.6 L13.4,21.6', '#5a5450', 0.4, 0),
    // Tail feathers and the body with its pale covert edges.
    shaded('M6.6,16 L2.8,18.8 L3.4,17.2 L2.6,16.4 L6.2,14.6 Z', VULTURE, {}),
    shaded(body, VULTURE, {
      rim: [0.7, 0.8],
      light: 'M8,10.6 C9.4,9 11.6,8.6 13.6,9.2 C11.4,9.4 9.4,10 8,10.6 Z',
      extra: coverts + fill('M5,15.6 C8,17.4 12,17.6 17,15.4 V20 H5 Z', VULTURE.dark),
    }),
    wing,
    // White ruff, bare grey neck and head, hooked beak.
    fill(ellipse(15.1, 9.6, 1.9, 1.3), RUFF),
    limb('M15.2,9.4 C16.1,8 16.8,6.7 17.8,5.7', SKIN.mid, 1.1, 0),
    shaded(ellipse(18.6, 5.2, 1.6, 1.15), SKIN, { light: ellipse(18.2, 4.6, 0.8, 0.4) }),
    fill(
      'M19.8,4.5 C21,4.4 21.9,5 21.9,5.8 C21.9,6.4 21.4,6.6 21,6.2 C20.6,5.9 20.2,6 19.8,5.9 Z',
      BEAK,
    ),
    fill(ellipse(19.9, 5.2, 0.35, 0.55), '#cfc4a8'),
    dot(18.9, 4.9, 0.32, '#16110d'),
  ].join('')}</g>`;
}

export { PALE };

const LEOPARD: Ramp = { light: '#f0cc78', mid: '#dcae56', dark: '#b4863a' };
const ROSETTE = '#3a2616';

export function leopard(frame: Frame): string {
  const a = frame === 0;
  // Long, low body; tail curling up at the tip.
  const body =
    'M4.6,14.6 C4.6,12.6 7,11.8 10.4,11.8 C13.4,11.8 16,11.6 17.4,12.4 C18.8,13.4 18.6,15.6 17.2,16.6 C15,17.6 10.6,17.6 7.6,17.2 C5.8,16.9 4.6,16 4.6,14.6 Z';
  const head =
    'M16.6,10.6 C17.4,9.2 19.6,9 21,10.2 C22,11.1 22,12.8 21,13.4 C19.8,14 18,13.8 17.2,13 C16.6,12.4 16.4,11.4 16.6,10.6 Z';
  const rosettes = [
    [7, 13.4],
    [9.2, 12.8],
    [11.6, 13.6],
    [14, 12.8],
    [16, 14],
    [8.4, 15.4],
    [10.8, 15.8],
    [13.4, 15.4],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="0.7" fill="none" stroke="${ROSETTE}" stroke-width="0.35"/>`,
    )
    .join('');
  const paw = (x: number) => fill(ellipse(x, 21.5, 0.75, 0.4), LEOPARD.light);
  const legOf = (hip: [number, number], foot: [number, number], color: string) =>
    leg(hip, [hip[0] + (foot[0] - hip[0]) * 0.5, 18.6], foot, color, color, 1.1) + paw(foot[0]);
  return [
    legOf([8, 16], a ? [9, 21.2] : [7, 21.2], LEOPARD.dark),
    legOf([15.4, 16], a ? [14.4, 21.2] : [16.4, 21.2], LEOPARD.dark),
    limb('M4.8,14 C2.6,14.6 1.6,16.6 2,18.4 C2.2,19.4 3.2,19.6 3.6,18.8', LEOPARD.mid, 0.7, 0),
    `<path d="M4.8,14 C2.6,14.6 1.6,16.6 2,18.4" fill="none" stroke="${ROSETTE}" stroke-width="0.7" stroke-dasharray="0.5 0.8"/>`,
    shaded(body, LEOPARD, {
      light: 'M6,12.6 C9,12 13,11.8 16,12.2 C13,12.8 9,13 6,12.6 Z',
      extra: rosettes + fill('M0,16.4 C8,17 12,17 24,16.2 V24 H0 Z', '#f2e2b8'),
    }),
    legOf([9, 16.4], a ? [7.6, 21.4] : [10.2, 21.4], LEOPARD.mid),
    legOf([16.4, 16.2], a ? [17, 21.4] : [15.4, 21.4], LEOPARD.mid),
    shaded(head, LEOPARD, {
      extra:
        dot(18.4, 11, 0.3, ROSETTE) +
        dot(17.6, 12.4, 0.3, ROSETTE) +
        fill(ellipse(20.8, 12.4, 0.9, 0.6), '#f2e2b8'),
    }),
    fill(ellipse(17.6, 9.6, 0.7, 0.7), LEOPARD.mid),
    fill(ellipse(17.6, 9.7, 0.3, 0.3), ROSETTE),
    dot(19.6, 11, 0.35, '#1e1408'),
    dot(21.6, 11.8, 0.32, '#3a1e14'),
  ].join('');
}

// Easter egg (D132): the honey badger, a rare visitor. Low and broad, black below with a
// pale grey saddle from crown to tail.
const BADGER: Ramp = { light: '#4a443e', mid: '#2e2a26', dark: '#1c1916' };
const SADDLE: Ramp = { light: '#eeeae0', mid: '#d4cfc2', dark: '#aca697' };

export function badger(frame: Frame): string {
  const a = frame === 0;
  const body =
    'M4.4,17.4 C4.4,15.2 6.6,14 10,13.8 C13.4,13.6 16.4,13.8 18,15 C19.4,16.1 19.2,18.4 17.8,19.4 C15.8,20.4 11.6,20.6 8.2,20.3 C5.8,20 4.4,19.2 4.4,17.4 Z';
  const saddle =
    'M4.8,16.4 C5.6,14.6 8.4,13.7 11.4,13.6 C14.6,13.5 17.6,13.8 19.4,14.8 C20.6,15.4 21.6,15.6 22.2,16.2 C20.6,16.4 18.8,16.2 17,16.3 C14,16.5 10.6,16.8 8,16.9 C6.6,17 5.4,16.9 4.8,16.4 Z';
  const head =
    'M17.4,15.6 C18.2,14.6 20.2,14.6 21.6,15.4 C22.8,16 23.2,17.2 22.6,17.9 C21.8,18.6 20,18.6 18.8,18.2 C17.8,17.9 17.1,16.6 17.4,15.6 Z';
  const paw = (x: number) => fill(ellipse(x, 21.6, 0.75, 0.4), BADGER.dark);
  const stubby = (hip: [number, number], foot: [number, number], color: string) =>
    limb(`M${hip[0]},${hip[1]} L${foot[0]},${foot[1]}`, color, 1.5, 0) + paw(foot[0]);
  return [
    stubby([7.6, 19], a ? [8.4, 21.4] : [6.8, 21.4], BADGER.dark),
    stubby([16, 19], a ? [15.4, 21.4] : [16.8, 21.4], BADGER.dark),
    limb('M4.6,16.8 C3.6,16.6 3,15.8 2.8,15', BADGER.mid, 0.9, 0),
    shaded(body, BADGER, { light: 'M6,15.4 C9,14.4 13,14.2 16.6,14.8 C13,15 9,15.2 6,15.4 Z' }),
    shaded(saddle, SADDLE),
    stubby([8.6, 19.4], a ? [7.4, 21.6] : [9.6, 21.6], BADGER.mid),
    stubby([16.8, 19.2], a ? [17.6, 21.6] : [16.2, 21.6], BADGER.mid),
    shaded(head, BADGER, {
      extra: fill(
        'M17.6,15.2 C19,14.4 21,14.6 22.4,15.6 L22.2,16.2 C20.6,15.6 19,15.4 17.6,15.8 Z',
        SADDLE.mid,
      ),
    }),
    dot(21, 16.6, 0.3, '#0c0a08'),
    dot(23, 17.3, 0.35, '#0c0a08'),
  ].join('');
}

/** Ruth's wide-brimmed hat, worn by rangers after the ending (D132). 12×6 world px. */
export function ruthsHat(): string {
  const BRIM: Ramp = { light: '#b08a58', mid: '#8a6a40', dark: '#62482a' };
  return [
    shaded(ellipse(6, 4.4, 5.6, 1.3), BRIM),
    shaded('M3.4,4.2 C3.4,2 4.6,0.8 6,0.8 C7.4,0.8 8.6,2 8.6,4.2 Z', BRIM, {
      light: ellipse(5.2, 2, 1, 0.6),
    }),
    limb('M3.5,3.6 C5,4.1 7,4.1 8.5,3.6', '#4a2e18', 0.6, 0),
  ].join('');
}
