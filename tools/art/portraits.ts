// Character portraits (spec §8) at 2× detail (DECISIONS D106): 72×72 world px busts, four
// frames each (neutral, happy, worried, angry), outlined. Lit from the top left.
import { dot, ellipse, fill, limb, type Ramp, shaded } from './svg';

export type Expression = 'neutral' | 'happy' | 'worried' | 'angry';
export const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'worried', 'angry'];

const INK = '#2a1d14';
const WHITE = '#f6f2ea';

interface Look {
  skin: Ramp;
  /** Drawn behind the head (long hair, braids, back of a wrap). */
  back?: string;
  /** Drawn over the head (hair, hat, wrap). */
  top: string;
  clothes: string;
  /** Drawn last (glasses, beard). */
  front?: string;
  iris: string;
  lips: string;
}

const HEAD =
  'M23,30 C23,19 28.5,14 36,14 C43.5,14 49,19 49,30 C49,38 46.5,44 42,47 C39.5,48.6 32.5,48.6 30,47 C25.5,44 23,38 23,30 Z';

function eyes(e: Expression, iris: string, skin: Ramp): string {
  const out: string[] = [];
  for (const x of [30, 42]) {
    const open = e === 'happy' ? 1 : e === 'angry' ? 1.1 : e === 'worried' ? 1.7 : 1.5;
    out.push(fill(ellipse(x, 31, 2.6, open), WHITE));
    out.push(dot(x + 0.3, 31.1, Math.min(1.3, open), iris));
    out.push(dot(x + 0.3, 31.1, 0.55, '#120c08'));
    out.push(dot(x - 0.3, 30.6, 0.35, '#ffffff'));
    // Upper lid line and a soft crease below.
    out.push(
      limb(
        `M${x - 2.8},${31 - open * 0.4} Q${x},${31 - open - 0.9} ${x + 2.8},${31 - open * 0.4}`,
        INK,
        0.7,
        0,
      ),
    );
    out.push(
      limb(
        `M${x - 2},${32.8 + (e === 'happy' ? -0.3 : 0)} Q${x},${33.6} ${x + 2},${32.8}`,
        skin.dark,
        0.4,
        0,
      ),
    );
  }
  return out.join('');
}

function brows(e: Expression, color: string): string {
  // [outer, inner] heights per side; the inner ends carry the expression.
  const [outer, inner] =
    e === 'happy'
      ? [26.4, 26]
      : e === 'worried'
        ? [27.6, 25.2]
        : e === 'angry'
          ? [25.8, 28.2]
          : [26.8, 26.8];
  return (
    limb(`M26.4,${outer} Q29.6,${Math.min(outer, inner) - 1} 32.6,${inner}`, color, 1.3, 0) +
    limb(`M39.4,${inner} Q42.4,${Math.min(outer, inner) - 1} 45.6,${outer}`, color, 1.3, 0)
  );
}

function mouth(e: Expression, lips: string, skin: Ramp): string {
  switch (e) {
    case 'happy':
      return (
        fill('M31.2,42 Q36,47.2 40.8,42 Q36,43.4 31.2,42 Z', '#5a1e16') +
        fill('M32.4,42.4 Q36,43.6 39.6,42.4 L39.2,43.4 Q36,44.2 32.8,43.4 Z', WHITE) +
        limb('M30.6,41.8 Q36,47.6 41.4,41.8', lips, 0.8, 0) +
        limb('M29.4,40.4 Q30.2,41.6 30.8,42', skin.dark, 0.5, 0) +
        limb('M42.6,40.4 Q41.8,41.6 41.2,42', skin.dark, 0.5, 0)
      );
    case 'worried':
      return (
        limb('M32,44 Q34,42.6 36,43.4 Q38,44.2 40,43', INK, 0.8, 0) +
        fill(ellipse(36, 44.6, 2.2, 0.6), lips)
      );
    case 'angry':
      return (
        limb('M31.6,44 Q36,42 40.4,44', INK, 0.9, 0) + limb('M33,44.8 Q36,44 39,44.8', lips, 0.7, 0)
      );
    default:
      return limb('M32,43 Q36,43.8 40,43', INK, 0.8, 0) + fill(ellipse(36, 44.2, 2.6, 0.7), lips);
  }
}

function bust(look: Look, e: Expression): string {
  const { skin } = look;
  return [
    look.back ?? '',
    look.clothes,
    // Neck with the jaw's shadow.
    shaded('M30.4,44 L41.6,44 L42.4,56 L29.6,56 Z', skin, {
      rim: [2, 0],
      extra: fill('M28,44 L44,44 L44,47.6 Q36,50 28,47.6 Z', skin.dark),
    }),
    shaded(ellipse(23.4, 32, 2.2, 3.4), skin, { rim: [0.6, 0] }),
    shaded(ellipse(48.6, 32, 2.2, 3.4), skin, { rim: [0.8, 0] }),
    shaded(HEAD, skin, {
      rim: [2.2, 1.2],
      light: 'M27,24 C28,19 31.5,16.4 35,16.2 C31.4,18.6 29,21.6 27,24 Z',
      extra:
        // Nose shading and nostrils.
        limb('M37.4,32 Q38.6,36.4 37.8,38.4', skin.dark, 0.8, 0) +
        fill(ellipse(36.4, 38.8, 2.4, 1.2), skin.dark) +
        fill(ellipse(35.8, 38.2, 1.8, 0.9), skin.mid) +
        dot(34.8, 39, 0.45, INK) +
        dot(37.4, 39, 0.45, INK) +
        fill(ellipse(35, 36, 0.7, 1.4), skin.light),
    }),
    eyes(e, look.iris, skin),
    mouth(e, look.lips, skin),
    look.top,
    brows(e, look.top.includes('data-brow') ? '#bdb6a8' : INK),
    look.front ?? '',
  ].join('');
}

const DEEP: Ramp = { light: '#8a5a3c', mid: '#6e452c', dark: '#4e301e' };
const BROWN: Ramp = { light: '#a86e48', mid: '#8a5a3a', dark: '#663f26' };
const FAIR: Ramp = { light: '#f2cfae', mid: '#dcaa86', dark: '#b4825e' };
const TAN: Ramp = { light: '#c08a5c', mid: '#a06e46', dark: '#7a5030' };

/** Shoulders in a shirt, with a collar opening that shows the neck. */
function shirt(ramp: Ramp, extra = ''): string {
  return shaded('M4,72 C5,61 14,56 26,54.4 L36,58 L46,54.4 C58,56 67,61 68,72 Z', ramp, {
    rim: [3, 0],
    light: 'M8,72 C9,63 15,58.6 23,56.6 C17,60 12,65 11,72 Z',
    extra,
  });
}

const LOOKS: Record<string, Look> = {
  // Old head ranger: grey beard and brows, khaki shirt with epaulettes and badge, bush hat.
  tendai: {
    skin: DEEP,
    iris: '#3a2412',
    lips: '#5e3426',
    clothes: shirt(
      { light: '#d8c088', mid: '#bfa266', dark: '#8e7646' },
      fill('M28.4,55 L36,62 L43.6,55 L41,54 L36,58.6 L31,54 Z', '#a88c56') +
        fill('M14,58.6 L24,56.2 L24.6,58.2 L14.8,60.4 Z', '#8e7646') +
        fill('M48,56.2 L58,58.6 L57.2,60.4 L47.4,58.2 Z', '#8e7646') +
        shaded(ellipse(52, 64, 2.6, 3), { light: '#f0d070', mid: '#d4a83a', dark: '#9a7424' }, {}) +
        limb('M36,60 L36,72', '#8e7646', 0.6, 0),
    ),
    top:
      '<g data-brow="1">' +
      fill(
        'M24,24 C24,17 29,14.6 36,14.6 C43,14.6 48,17 48,24 C46,20 42,18.4 36,18.4 C30,18.4 26,20 24,24 Z',
        '#bdb6a8',
      ) +
      fill(ellipse(36, 16.4, 22, 3.4), '#6a5634') +
      shaded(
        'M24.6,16 C24.6,8.4 29.4,5.6 36,5.6 C42.6,5.6 47.4,8.4 47.4,16 Z',
        { light: '#a08a58', mid: '#867246', dark: '#665634' },
        { rim: [2, 0], light: ellipse(31, 8.6, 3.4, 1.4) },
      ) +
      fill('M24.6,13.6 L47.4,13.6 L47.4,16 L24.6,16 Z', '#3e3020') +
      '</g>',
    front:
      fill(
        'M27,41.6 C27.6,46.8 31.4,49.6 36,49.6 C40.6,49.6 44.4,46.8 45,41.6 C43,44.6 40,45.8 36,45.8 C32,45.8 29,44.6 27,41.6 Z',
        '#c8c0b2',
      ) + limb('M31,42 Q36,40.8 41,42', '#c8c0b2', 1.2, 0),
  },
  // Ecologist: long braids, round glasses, teal blouse with a pen in the pocket.
  amara: {
    skin: BROWN,
    iris: '#3a2412',
    lips: '#7a3a34',
    back: [21, 23.6, 48.4, 51]
      .map(
        (x) =>
          limb(`M${x},22 L${x + (x < 36 ? -1 : 1)},58`, '#1e1612', 2.4, 0) +
          `<path d="M${x},24 L${x + (x < 36 ? -1 : 1)},58" stroke="#3a2c22" stroke-width="2.4" stroke-dasharray="1 1.4" fill="none"/>`,
      )
      .join(''),
    clothes: shirt(
      { light: '#5ab0aa', mid: '#2e8c86', dark: '#1d625e' },
      fill('M29,54.4 L36,61 L43,54.4 L40.6,53.6 L36,57.6 L31.4,53.6 Z', '#247a74') +
        fill('M46,62 L54,62 L54,68 L46,68 Z', '#247a74') +
        limb('M48,59 L48,63', '#e8e2d4', 0.9, 0) +
        dot(48, 58.8, 0.6, '#c2402f'),
    ),
    top:
      fill(
        'M22.6,28 C22,17 28,12.6 36,12.6 C44,12.6 50,17 49.4,28 C48,21.4 43,18.4 36,18.6 C29,18.4 24,21.4 22.6,28 Z',
        '#1e1612',
      ) +
      [27, 31, 35, 39, 43]
        .map((x) => limb(`M${x},14.4 Q${x + 1},17 ${x + 0.4},19.2`, '#3a2c22', 0.7, 0))
        .join(''),
    front:
      [30, 42]
        .map(
          (x) =>
            `<circle cx="${x}" cy="31" r="4.2" fill="#cfe6ee" fill-opacity="0.18" stroke="#5a4a3e" stroke-width="0.8"/>`,
        )
        .join('') +
      limb('M34.2,30.6 Q36,29.6 37.8,30.6', '#5a4a3e', 0.7, 0) +
      limb('M25.8,30.4 L23.6,29.8', '#5a4a3e', 0.6, 0) +
      limb('M46.2,30.4 L48.4,29.8', '#5a4a3e', 0.6, 0),
  },
  // Village leader: bright patterned headwrap, beaded necklace, patterned wrap dress.
  wanjiru: {
    skin: DEEP,
    iris: '#2e1c10',
    lips: '#5a2e24',
    clothes:
      shirt(
        { light: '#e0884a', mid: '#c4622a', dark: '#8e421c' },
        [14, 22, 30, 38, 46, 54]
          .map(
            (x) => limb(`M${x},72 L${x + 6},58`, '#f2c04a', 1, 0) + dot(x + 3, 66, 0.9, '#2a6e8a'),
          )
          .join(''),
      ) +
      limb('M27,55 Q36,63.4 45,55', '#e8e2d4', 1.6, 0) +
      `<path d="M27,55 Q36,63.4 45,55" stroke="#c2402f" stroke-width="1.6" stroke-dasharray="1 1.2" fill="none"/>` +
      limb('M28.6,57.6 Q36,65.4 43.4,57.6', '#2a6e8a', 1.2, 0),
    top:
      shaded(
        'M21.4,26 C20,15.4 26,8 36,8 C46,8 52,15.4 50.6,26 C48,20.6 43,18.4 36,18.6 C29,18.4 24,20.6 21.4,26 Z',
        { light: '#f0c04a', mid: '#d89a2a', dark: '#a8701c' },
        {
          rim: [2, 0],
          extra:
            [12, 15, 18, 21]
              .map((y) => limb(`M20,${y + 4} Q36,${y - 4} 52,${y + 4}`, '#c2402f', 0.9, 0))
              .join('') + [26, 32, 38, 44].map((x) => dot(x, 13, 0.8, '#2a6e8a')).join(''),
        },
      ) +
      shaded(
        'M40,10 C44,4 52,4 54,9 C55,13 50,15 46,13 Z',
        { light: '#f0c04a', mid: '#d89a2a', dark: '#a8701c' },
        { rim: [1, 1], extra: limb('M42,9 Q48,5 53,10', '#c2402f', 0.9, 0) },
      ),
  },
  // Investor: slicked hair, grey suit, white shirt, red tie.
  victor: {
    skin: FAIR,
    iris: '#4a6a8a',
    lips: '#b06a62',
    clothes:
      shirt({ light: '#7a7e88', mid: '#5c606a', dark: '#3e424a' }) +
      fill('M29.4,54.6 L36,70 L42.6,54.6 L39.6,54 L36,58.4 L32.4,54 Z', '#f4f2ee') +
      fill('M34.6,58.6 L37.4,58.6 L38.4,66 L36,70 L33.6,66 Z', '#b02a26') +
      fill('M34.8,57 L37.2,57 L37.6,59 L34.4,59 Z', '#8e1e1a') +
      fill('M26,55 L33,57 L36,70 L30,64 Z', '#4a4e58') +
      fill('M46,55 L39,57 L36,70 L42,64 Z', '#4a4e58'),
    top:
      fill(
        'M23,28 C22,17 28,12.8 36,12.8 C44,12.8 50,17 49,26 C46,20 40,17.8 33,19.2 C28,20.2 24.6,23 23,28 Z',
        '#3e2c1e',
      ) +
      [18, 20, 22]
        .map((y) => limb(`M27,${y + 3} Q36,${y - 4} 47,${y}`, '#5a4430', 0.6, 0))
        .join('') +
      limb('M44,15.6 Q47,17 48.4,21', '#5a4430', 0.6, 0),
  },
  // Former poacher: young, cap, olive shirt, light stubble.
  kito: {
    skin: TAN,
    iris: '#3a2412',
    lips: '#6a3a2c',
    clothes: shirt(
      { light: '#7e9a5a', mid: '#5e7a40', dark: '#40562a' },
      fill('M29,54.4 L36,61 L43,54.4 L40.6,53.6 L36,57.6 L31.4,53.6 Z', '#4e6a34') +
        limb('M36,61 L36,72', '#40562a', 0.6, 0) +
        [64, 68].map((y) => dot(36.8, y, 0.6, '#d8d0b8')).join(''),
    ),
    top:
      fill('M23.4,24 C23.4,17 28,13.4 36,13.4 C44,13.4 48.6,17 48.6,24 Z', '#1e1612') +
      shaded(
        'M23,22 C23,13 28.6,9.4 36,9.4 C43.4,9.4 49,13 49,22 Z',
        { light: '#5a8ac8', mid: '#3a6aa8', dark: '#264a7a' },
        { rim: [2, 0], light: ellipse(30, 13, 3.6, 1.6), extra: dot(36, 9.8, 0.9, '#264a7a') },
      ) +
      fill('M40,20.2 C46,19.4 54,20 57,22.4 C53,23.6 46,23.6 40,22.6 Z', '#264a7a'),
    front: Array.from({ length: 40 }, (_, i) =>
      dot(28 + (i % 10) * 1.7, 42 + Math.floor(i / 10) * 1.5 + ((i * 7) % 3) * 0.3, 0.3, '#5a3a24'),
    ).join(''),
  },
};

/** portrait-<id> → four frames (neutral, happy, worried, angry). */
export function portraitFrames(id: string): string[] {
  const look = LOOKS[id];
  if (!look) throw new Error(`no portrait for ${id}`);
  return EXPRESSIONS.map((e) => bust(look, e));
}

export const PORTRAIT_IDS = Object.keys(LOOKS);
