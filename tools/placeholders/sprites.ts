// Placeholder animal and people sprites: saturated colours, 1 px dark outline,
// 2-frame walk cycle, facing right (DECISIONS D12/D13).
import { PixelCanvas, sameColor, stripOf } from '../lib/canvas';
import { PAL } from '../palette';

type Frame = 0 | 1;
const SMALL = 24;
const LARGE = 48;

function finish(c: PixelCanvas): PixelCanvas {
  c.outline(PAL.outline);
  return c;
}

function impala(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  for (const x of frame === 0 ? [7, 9, 14, 16] : [6, 10, 13, 17]) c.line(x, 15, x, 21, PAL.impala);
  c.fillEllipse(11, 13, 6.5, 3.5, PAL.impala);
  c.fillEllipse(11, 13, 6.5, 3.5, PAL.impalaLight, (_x, y) => y >= 15);
  c.line(16, 11, 18, 7, PAL.impala);
  c.line(17, 11, 19, 7, PAL.impala);
  c.fillEllipse(19.5, 6.5, 2.5, 1.6, PAL.impala);
  c.set(4, 12, PAL.white);
  c.set(19, 6, PAL.outline);
  finish(c);
  // Horns go on after the outline pass so they stay 1 px thin.
  c.line(18, 4, 17, 1, PAL.outline);
  c.line(20, 4, 20, 1, PAL.outline);
  return c;
}

function zebra(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  for (const x of frame === 0 ? [7, 9, 15, 17] : [6, 10, 14, 18]) c.line(x, 15, x, 21, PAL.white);
  c.fillEllipse(11, 13, 7, 4, PAL.white);
  c.line(16, 11, 18, 6, PAL.white);
  c.line(17, 11, 19, 6, PAL.white);
  c.fillEllipse(20, 7, 2.6, 1.8, PAL.white);
  c.line(3, 12, 3, 15, PAL.white);
  c.recolor((x, y, cur) => {
    if (!sameColor(cur, PAL.white)) return null;
    const stripe = y >= 17 ? y % 2 === 0 : (x + Math.floor(y / 3)) % 3 === 0;
    return stripe ? PAL.outline : null;
  });
  c.line(16, 9, 18, 5, PAL.outline); // mane
  c.set(22, 7, PAL.outline);
  return finish(c);
}

function lion(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(SMALL, SMALL);
  for (const x of frame === 0 ? [7, 9, 15, 17] : [6, 10, 14, 18])
    c.line(x, 15, x, 21, PAL.lionGold);
  c.line(4, 13, 2, 9, PAL.lionGold);
  c.fillRect(1, 7, 2, 2, PAL.lionMane);
  c.fillEllipse(11, 13.5, 7, 3.5, PAL.lionGold);
  c.fillEllipse(17.5, 10, 4, 4.5, PAL.lionMane);
  c.fillEllipse(19, 10.5, 2.5, 2.3, PAL.lionGold);
  c.set(21, 11, PAL.outline);
  c.set(19, 9, PAL.outline);
  return finish(c);
}

function elephant(frame: Frame): PixelCanvas {
  const c = new PixelCanvas(LARGE, LARGE);
  for (const x of frame === 0 ? [12, 18, 27, 33] : [11, 19, 26, 34]) {
    c.fillRect(x, 30, 4, 13, PAL.elephant);
    c.fillRect(x, 42, 4, 1, PAL.elephantLight);
  }
  c.line(8, 22, 6, 29, PAL.elephant);
  c.fillEllipse(22, 24, 14, 10, PAL.elephant);
  c.fillEllipse(36, 20, 7, 7, PAL.elephant);
  c.fillEllipse(32, 21, 5, 7, PAL.elephantLight);
  for (let i = 0; i < 3; i++) c.line(40 + i, 22, 42 + i, 36, PAL.elephant);
  c.line(40, 27, 44, 29, PAL.white);
  c.set(38, 18, PAL.outline);
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
  c.line(8, 10, 8, 14, outfit.shirt);
  c.line(15, 10, 15, 14, outfit.shirt);
  c.set(8, 15, PAL.skin);
  c.set(15, 15, PAL.skin);
  c.fillEllipse(12, 6, 2.5, 2.5, PAL.skin);
  c.fillRect(9, 3, 7, 2, outfit.hat);
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
