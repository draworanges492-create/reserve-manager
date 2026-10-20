// Placeholder animal and people sprites: saturated colours, 1 px dark outline,
// 2-frame walk cycle, facing right (DECISIONS D12/D13).
import { PixelCanvas, type Rgba, sameColor, stripOf } from '../lib/canvas';
import { PAL } from '../palette';

type Frame = 0 | 1;
const SMALL = 24;
const LARGE = 48;

function finish(c: PixelCanvas): PixelCanvas {
  c.outline(PAL.outline);
  return c;
}

/** Thin leg: upper part in `color`, lower part darker, plus a hoof or paw. */
function leg(c: PixelCanvas, x: number, top: number, color: Rgba, lower: Rgba, width = 1) {
  c.fillRect(x, top, width, 21 - top, color);
  c.fillRect(x, 19, width, 2, lower);
}

function impala(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  const [far1, far2] = frame === 0 ? [9, 17] : [8, 16];
  const [near1, near2] = frame === 0 ? [7, 15] : [6, 14];
  // Far legs are a shade darker, so the four legs read separately.
  leg(c, far1, 14, PAL.impalaDark, PAL.impalaDark);
  leg(c, far2, 14, PAL.impalaDark, PAL.impalaDark);
  // Body: red-brown saddle, tan flank, white belly.
  c.fillEllipse(11.5, 12.5, 6.5, 3.2, PAL.impala);
  c.fillEllipse(11.5, 12.5, 6.5, 3.2, PAL.impalaDark, (_x, y) => y <= 10);
  c.fillEllipse(11.5, 12.5, 6.5, 3.2, PAL.impalaLight, (_x, y) => y === 13);
  c.fillEllipse(11.5, 12.5, 6.5, 3.2, PAL.white, (_x, y) => y >= 14);
  leg(c, near1, 14, PAL.impala, PAL.impalaDark);
  leg(c, near2, 14, PAL.impala, PAL.impalaDark);
  // White rump and a short tail.
  c.fillRect(5, 12, 2, 2, PAL.white);
  c.line(4, 10, 4, 12, PAL.white);
  // Neck, head, pale muzzle and an ear.
  c.line(15, 11, 18, 6, PAL.impala);
  c.line(16, 11, 19, 6, PAL.impala);
  c.line(17, 11, 19, 8, PAL.impalaLight);
  c.fillEllipse(19.5, 5.5, 2.6, 1.6, PAL.impala);
  c.fillRect(21, 6, 1, 1, PAL.impalaLight);
  c.set(17, 4, PAL.impala);
  c.set(19, 5, PAL.outline); // eye
  finish(c);
  // Lyre-shaped horns go on after the outline pass so they stay 1 px thin.
  c.line(19, 3, 18, 1, PAL.outline);
  c.set(19, 0, PAL.outline);
  c.line(20, 3, 20, 1, PAL.outline);
  c.set(21, 0, PAL.outline);
  c.set(4, 13, PAL.outline); // black tail tip
  return c;
}

function zebra(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  const legsAt = frame === 0 ? [7, 9, 15, 17] : [6, 10, 14, 18];
  for (const x of legsAt) leg(c, x, 14, PAL.white, PAL.white);
  c.fillEllipse(11, 12.5, 7, 3.6, PAL.white);
  // Neck and head (long, with a dark muzzle), tail with a dark tuft.
  for (let i = 0; i < 3; i++) c.line(15 + i, 11, 18 + i, 6, PAL.white);
  c.fillEllipse(20.5, 7, 2.8, 1.8, PAL.white);
  c.line(3, 11, 3, 15, PAL.white);
  c.set(17, 4, PAL.white); // ear
  // Stripes: upright on the body, slanting on the rump, banded on the legs; pale belly.
  c.recolor((x, y, cur) => {
    if (!sameColor(cur, PAL.white)) return null;
    if (y >= 17) return y % 2 === 0 ? PAL.outline : null;
    if (y >= 15 && x > 5 && x < 17) return null;
    if (x >= 21) return PAL.grey; // muzzle
    const slant = x < 8 ? Math.floor(y / 2) : 0;
    return (x + slant) % 3 === 0 ? PAL.outline : null;
  });
  c.line(16, 9, 18, 4, PAL.outline); // mane
  c.set(17, 8, PAL.white);
  c.set(18, 6, PAL.white);
  c.set(20, 6, PAL.outline); // eye
  c.set(23, 7, PAL.outline);
  c.fillRect(3, 15, 1, 2, PAL.outline);
  return finish(c);
}

function lion(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  const [far1, far2, near1, near2] = frame === 0 ? [9, 17, 7, 15] : [8, 16, 6, 14];
  leg(c, far1, 14, PAL.lionDark, PAL.lionDark, 2);
  leg(c, far2, 14, PAL.lionDark, PAL.lionDark, 2);
  // Tail curling up with a dark tuft.
  c.line(4, 13, 2, 10, PAL.lionGold);
  c.line(2, 10, 2, 8, PAL.lionGold);
  c.fillRect(1, 7, 2, 2, PAL.maneDark);
  // Body: tawny, darker along the back, pale belly.
  c.fillEllipse(10.5, 13, 7, 3.3, PAL.lionGold);
  c.fillEllipse(10.5, 13, 7, 3.3, PAL.lionDark, (_x, y) => y <= 10);
  c.fillEllipse(10.5, 13, 7, 3.3, PAL.impalaLight, (_x, y) => y >= 15);
  leg(c, near1, 14, PAL.lionGold, PAL.lionDark, 2);
  leg(c, near2, 14, PAL.lionGold, PAL.lionDark, 2);
  // Mane: shaggy, darker towards the back and bottom.
  c.fillEllipse(17, 10.5, 4.2, 4.8, PAL.lionMane);
  c.fillEllipse(17, 10.5, 4.2, 4.8, PAL.maneDark, (x, y) => x <= 14 || y >= 14);
  c.set(15, 7, PAL.maneDark);
  c.set(16, 13, PAL.maneDark);
  // Face with a pale muzzle, nose, eye and a round ear.
  c.fillEllipse(19.3, 10.5, 2.4, 2.3, PAL.lionGold);
  c.fillRect(20, 11, 2, 2, PAL.impalaLight);
  c.set(18, 7, PAL.lionGold);
  c.set(19, 9, PAL.outline);
  c.set(21, 11, PAL.outline);
  return finish(c);
}

function elephant(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(LARGE, LARGE);
  const [far1, far2, near1, near2] = frame === 0 ? [17, 31, 12, 27] : [16, 32, 11, 28];
  const bigLeg = (x: number, color: Rgba) => {
    c.fillRect(x, 29, 5, 14, color);
    c.fillRect(x + 4, 29, 1, 14, PAL.elephantDark);
    c.fillRect(x, 42, 5, 1, PAL.elephantLight); // toenails
    c.set(x + 1, 42, PAL.elephantDark);
    c.set(x + 3, 42, PAL.elephantDark);
  };
  bigLeg(far1, PAL.elephantDark);
  bigLeg(far2, PAL.elephantDark);
  // Tail with a tuft.
  c.line(8, 21, 6, 30, PAL.elephant);
  c.fillRect(5, 30, 2, 2, PAL.elephantDark);
  // Body: lit back, shaded belly, a few wrinkles.
  c.fillEllipse(22, 24, 14, 10, PAL.elephant);
  c.fillEllipse(22, 24, 14, 10, PAL.elephantLight, (x, y) => y <= 16 && x < 30);
  c.fillEllipse(22, 24, 14, 10, PAL.elephantDark, (_x, y) => y >= 31);
  for (const x of [14, 18, 22]) c.line(x, 22, x + 1, 27, PAL.elephantDark);
  bigLeg(near1, PAL.elephant);
  bigLeg(near2, PAL.elephant);
  // Head and domed forehead.
  c.fillEllipse(36, 19, 7, 7, PAL.elephant);
  c.fillEllipse(36, 17, 4, 3, PAL.elephantLight);
  // Trunk: tapering, ringed, curling at the tip.
  for (let y = 22; y <= 37; y++) {
    const w = y < 30 ? 4 : 3;
    const x = 40 + Math.round((y - 22) * 0.2);
    c.fillRect(x, y, w, 1, y % 3 === 0 ? PAL.elephantDark : PAL.elephant);
  }
  c.fillRect(44, 36, 2, 2, PAL.elephant);
  c.set(45, 35, PAL.elephant);
  // Big ear flap with a lit rim and darker inside.
  c.fillEllipse(31, 21, 6, 8, PAL.elephant);
  c.fillEllipse(31.5, 22, 4.5, 6.5, PAL.elephantDark);
  c.fillEllipse(31, 21, 6, 8, PAL.elephantLight, (x, y) => y <= 14 || x <= 25);
  // Tusk and eye.
  c.line(39, 27, 43, 30, PAL.white);
  c.line(39, 28, 42, 30, PAL.plaster);
  c.set(38, 17, PAL.outline);
  return finish(c);
}

interface Outfit {
  shirt: typeof PAL.red;
  trousers: typeof PAL.red;
  hat: typeof PAL.red;
}

function person(outfit: Outfit, frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  for (const x of frame === 0 ? [10, 13] : [9, 14]) c.line(x, 16, x, 21, outfit.trousers);
  c.fillRect(9, 9, 6, 7, outfit.shirt);
  c.fillRect(14, 9, 1, 7, PAL.outline); // shaded side (outline colour reads as a fold)
  c.fillRect(9, 15, 6, 1, PAL.woodDark); // belt
  c.set(11, 9, PAL.skin); // open collar
  c.line(8, 10, 8, 14, outfit.shirt);
  c.line(15, 10, 15, 14, outfit.shirt);
  c.set(8, 15, PAL.skin);
  c.set(15, 15, PAL.skin);
  c.fillEllipse(12, 6, 2.5, 2.5, PAL.skin);
  c.fillRect(10, 3, 5, 2, outfit.hat);
  c.fillRect(8, 5, 9, 1, outfit.hat); // brim
  c.set(13, 6, PAL.outline); // eye
  return finish(c);
}

function shadow(width: number, height: number): PixelCanvas {
  const c = new PixelCanvas(width, height);
  c.fillEllipse(width / 2, height / 2, width / 2, height / 2, [0, 0, 0, 90]);
  return c;
}

const both = (draw: (f: Frame) => PixelCanvas): PixelCanvas => stripOf([draw(0), draw(1)]);

/** Sprite file name (without extension) → image. Keys must match src/config/assets.json. */
export function drawSprites(): Record<string, PixelCanvas> {
  return {
    impala: both(impala),
    zebra: both(zebra),
    lion: both(lion),
    elephant: both(elephant),
    ranger: both((f) => person({ shirt: PAL.red, trousers: PAL.wood, hat: PAL.roof }, f)),
    visitor: both((f) => person({ shirt: PAL.blue, trousers: PAL.sand, hat: PAL.white }, f)),
    'shadow-sm': shadow(20, 6),
    'shadow-lg': shadow(40, 10),
  };
}
