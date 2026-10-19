// Placeholder HUD icons (12×12), outlined like sprites so they read on any panel.
import { PixelCanvas } from '../lib/canvas';
import { PAL } from '../palette';

const SIZE = 12;

function sun(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  for (const [x0, y0, x1, y1] of [
    [6, 0, 6, 2],
    [6, 9, 6, 11],
    [0, 6, 2, 6],
    [9, 6, 11, 6],
    [2, 2, 3, 3],
    [9, 2, 8, 3],
    [2, 10, 3, 9],
    [10, 10, 9, 9],
  ] as const)
    c.line(x0, y0, x1, y1, PAL.impala);
  c.fillEllipse(6, 6, 3, 3, PAL.lionGold);
  return c;
}

function raindrop(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(6, 7.5, 3.5, 3.5, PAL.blue);
  for (let y = 1; y <= 5; y++)
    c.fillRect(6 - Math.floor(y / 2), y, 1 + 2 * Math.floor(y / 2), 1, PAL.blue);
  c.set(5, 7, PAL.white);
  c.set(5, 8, PAL.white);
  c.outline(PAL.outline);
  return c;
}

function pause(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillRect(3, 2, 2, 8, PAL.uiText);
  c.fillRect(7, 2, 2, 8, PAL.uiText);
  return c;
}

/** Icon key → image. Keys must match src/config/assets.json. */
export function drawIcons(): Record<string, PixelCanvas> {
  return { 'icon-dry': sun(), 'icon-wet': raindrop(), 'icon-pause': pause() };
}
