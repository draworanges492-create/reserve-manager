// Character portraits (spec §8): 72×72 busts, frames neutral / happy / worried / angry.
import type { Rgba } from '../lib/canvas';
import { PixelCanvas, stripOf } from '../lib/canvas';
import { PAL } from '../palette';

const S = 72;
type Expression = 'neutral' | 'happy' | 'worried' | 'angry';
const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'worried', 'angry'];

interface Look {
  skin: Rgba;
  hair: Rgba;
  shirt: Rgba;
  /** Extra details drawn after the face. */
  extras?: (c: PixelCanvas) => void;
  hairStyle: 'short' | 'braids' | 'wrap' | 'slick' | 'cap';
  beard?: Rgba;
}

function face(c: PixelCanvas, look: Look, expression: Expression): void {
  // Shoulders and neck.
  c.fillEllipse(36, 70, 30, 16, look.shirt);
  c.fillRect(31, 46, 10, 10, look.skin);
  // Head.
  c.fillEllipse(36, 32, 15, 18, look.skin);
  if (look.beard) c.fillEllipse(36, 42, 12, 8, look.beard, (_x, y) => y >= 40);

  // Hair / headwear.
  switch (look.hairStyle) {
    case 'short':
      c.fillEllipse(36, 19, 15, 8, look.hair, (_x, y) => y <= 21);
      break;
    case 'braids':
      c.fillEllipse(36, 20, 16, 10, look.hair, (_x, y) => y <= 23);
      for (const x of [21, 24, 48, 51]) c.fillRect(x, 22, 2, 26, look.hair);
      break;
    case 'wrap':
      c.fillEllipse(36, 16, 18, 12, look.hair, (_x, y) => y <= 23);
      c.fillEllipse(48, 12, 6, 5, look.hair);
      break;
    case 'slick':
      c.fillEllipse(35, 18, 15, 7, look.hair, (_x, y) => y <= 22);
      c.line(25, 20, 44, 15, PAL.outline);
      break;
    case 'cap':
      c.fillEllipse(36, 18, 16, 8, look.hair, (_x, y) => y <= 20);
      c.fillRect(36, 19, 20, 3, look.hair); // peak
      break;
  }

  // Eyes and brows: the brows carry most of the expression.
  const eyeY = 31;
  for (const x of [30, 42]) {
    c.fillRect(x - 1, eyeY, 3, 3, PAL.white);
    c.fillRect(x, eyeY + 1, 2, 2, PAL.outline);
  }
  const brow = (x0: number, y0: number, x1: number, y1: number): void =>
    c.line(x0, y0, x1, y1, PAL.outline);
  if (expression === 'happy') {
    brow(27, 26, 32, 25);
    brow(40, 25, 45, 26);
  } else if (expression === 'worried') {
    brow(27, 27, 32, 25); // inner ends up
    brow(40, 25, 45, 27);
  } else if (expression === 'angry') {
    brow(27, 25, 32, 28); // inner ends down
    brow(40, 28, 45, 25);
  } else {
    brow(27, 27, 32, 27);
    brow(40, 27, 45, 27);
  }

  // Mouth.
  const my = 41;
  if (expression === 'happy') {
    c.line(31, my, 33, my + 2, PAL.outline);
    c.line(33, my + 2, 39, my + 2, PAL.outline);
    c.line(39, my + 2, 41, my, PAL.outline);
  } else if (expression === 'worried') {
    c.line(32, my + 2, 40, my + 1, PAL.outline);
  } else if (expression === 'angry') {
    c.line(31, my + 2, 33, my, PAL.outline);
    c.line(33, my, 39, my, PAL.outline);
    c.line(39, my, 41, my + 2, PAL.outline);
  } else {
    c.line(32, my + 1, 40, my + 1, PAL.outline);
  }
  look.extras?.(c);
}

const LOOKS: Record<string, Look> = {
  // Old head ranger: grey hair and beard, khaki shirt, hat brim.
  tendai: {
    skin: PAL.wood,
    hair: PAL.rock,
    beard: PAL.rock,
    shirt: PAL.grassDry,
    hairStyle: 'short',
    extras: (c) => {
      c.fillRect(18, 13, 36, 3, PAL.dirtDark);
      c.fillEllipse(36, 11, 12, 5, PAL.dirt);
    },
  },
  // Ecologist: braids, glasses, teal top.
  amara: {
    skin: PAL.roof,
    hair: PAL.outline,
    shirt: PAL.water,
    hairStyle: 'braids',
    extras: (c) => {
      for (const x of [30, 42]) {
        c.line(x - 4, 29, x + 4, 29, PAL.rockDark);
        c.line(x - 4, 35, x + 4, 35, PAL.rockDark);
        c.line(x - 4, 29, x - 4, 35, PAL.rockDark);
        c.line(x + 4, 29, x + 4, 35, PAL.rockDark);
      }
      c.line(34, 31, 38, 31, PAL.rockDark);
    },
  },
  // Village leader: bright headwrap.
  wanjiru: { skin: PAL.wood, hair: PAL.impala, shirt: PAL.lionMane, hairStyle: 'wrap' },
  // Investor: slick hair, suit, red tie.
  victor: {
    skin: PAL.skin,
    hair: PAL.dirtDark,
    shirt: PAL.rockDark,
    hairStyle: 'slick',
    extras: (c) => {
      c.fillRect(32, 56, 8, 16, PAL.white);
      c.fillRect(35, 57, 3, 15, PAL.red);
    },
  },
  // Former poacher: cap, green shirt.
  kito: { skin: PAL.dirt, hair: PAL.blue, shirt: PAL.tree, hairStyle: 'cap' },
};

/** portrait-<id> → strip of 4 frames (neutral, happy, worried, angry). */
export function drawPortraits(): Record<string, PixelCanvas> {
  const out: Record<string, PixelCanvas> = {};
  for (const [id, look] of Object.entries(LOOKS)) {
    out[`portrait-${id}`] = stripOf(
      EXPRESSIONS.map((e) => {
        const c = new PixelCanvas(S, S);
        face(c, look, e);
        c.outline(PAL.outline);
        return c;
      }),
    );
  }
  return out;
}

/** Magnifying glass marking a clue to examine. */
export function drawClueMarker(): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  c.fillEllipse(6.5, 6.5, 5, 5, PAL.lionGold);
  c.fillEllipse(6.5, 6.5, 3, 3, PAL.waterLight);
  c.line(10, 10, 14, 14, PAL.wood);
  c.line(11, 10, 15, 14, PAL.wood);
  c.outline(PAL.outline);
  return c;
}
