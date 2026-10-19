// Player-built structures (48×48 = one 2×2-tile build slot). Map colours, but with a dark
// outline because they're clickable (DECISIONS D59).
import { PixelCanvas } from '../lib/canvas';
import { PAL } from '../palette';

const S = 48;

function finish(c: PixelCanvas): PixelCanvas {
  c.outline(PAL.outline);
  return c;
}

function boreholePump(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 18, 3, PAL.treeDark); // ground shade
  // Lattice tower with a small wind wheel, feeding a round tank.
  c.line(14, 44, 20, 10, PAL.rock);
  c.line(26, 44, 20, 10, PAL.rock);
  for (let y = 16; y < 44; y += 7)
    c.line(14 + (44 - y) * 0.2, y, 26 - (44 - y) * 0.2, y, PAL.rockDark);
  c.fillEllipse(20, 9, 6, 6, PAL.rockDark);
  for (const [dx, dy] of [
    [0, -6],
    [6, 0],
    [0, 6],
    [-6, 0],
  ] as const)
    c.line(20, 9, 20 + dx, 9 + dy, PAL.sand);
  c.fillRect(29, 30, 14, 13, PAL.rock);
  c.fillRect(29, 30, 14, 2, PAL.waterLight);
  c.line(26, 36, 29, 36, PAL.rockDark);
  return finish(c);
}

function solarPump(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 18, 3, PAL.treeDark);
  c.fillRect(8, 22, 22, 12, PAL.waterDeep); // panel
  for (let x = 13; x < 30; x += 5) c.line(x, 22, x, 33, PAL.water);
  c.line(8, 28, 29, 28, PAL.water);
  c.line(18, 34, 18, 43, PAL.rockDark);
  c.fillRect(31, 30, 12, 13, PAL.rock);
  c.fillRect(31, 30, 12, 2, PAL.waterLight);
  return finish(c);
}

function rangerPost(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 19, 3, PAL.treeDark);
  c.fillRect(8, 24, 30, 19, PAL.sand);
  for (let y = 12; y <= 24; y++) {
    const half = (y - 12) * 1.4 + 2;
    c.fillRect(Math.round(23 - half), y, Math.round(half * 2), 1, PAL.roof);
  }
  c.fillRect(20, 32, 6, 11, PAL.wood);
  c.fillRect(11, 28, 5, 5, PAL.waterDeep);
  c.fillRect(30, 28, 5, 5, PAL.waterDeep);
  c.line(40, 43, 40, 10, PAL.wood); // flagpole
  c.fillRect(41, 10, 6, 4, PAL.red);
  return finish(c);
}

function tower(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 16, 3, PAL.treeDark);
  c.line(14, 44, 18, 14, PAL.wood);
  c.line(34, 44, 30, 14, PAL.wood);
  for (let y = 22; y < 44; y += 8) c.line(15, y, 33, y, PAL.wood);
  c.fillRect(12, 9, 24, 6, PAL.dirt); // platform
  c.fillRect(12, 2, 24, 3, PAL.roof);
  c.line(13, 5, 13, 9, PAL.wood);
  c.line(34, 5, 34, 9, PAL.wood);
  return finish(c);
}

function scaffold(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 18, 3, PAL.dirt);
  for (const x of [10, 24, 38]) c.line(x, 44, x, 16, PAL.wood);
  for (const y of [18, 30, 42]) c.line(9, y, 39, y, PAL.wood);
  c.line(10, 42, 24, 18, PAL.sand);
  c.line(24, 42, 38, 18, PAL.sand);
  c.fillRect(28, 34, 9, 7, PAL.rock); // stacked materials
  return finish(c);
}

/** Key → image. Keys must match src/config/assets.json and buildings.json ids. */
export function drawBuildings(): Record<string, PixelCanvas> {
  return {
    'building-borehole_pump': boreholePump(),
    'building-solar_pump': solarPump(),
    'building-ranger_post': rangerPost(),
    'building-observation_tower': tower(),
    'building-scaffold': scaffold(),
  };
}
