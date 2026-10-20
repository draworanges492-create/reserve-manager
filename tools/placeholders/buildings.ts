// Player-built structures (48×48 = one 2×2-tile build slot). Map colours, but with a dark
// outline because they're clickable (DECISIONS D59).
import { PixelCanvas } from '../lib/canvas';
import { PAL } from '../palette';
import { door, plank, post, stonework, tinRoof, wall, windowPane } from './parts';

const S = 48;

function finish(c: PixelCanvas): PixelCanvas {
  c.outline(PAL.outline);
  return c;
}

/** Galvanised windmill pump: lattice tower, full wind wheel, tail vane and a full tank. */
function boreholePump(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 19, 3, PAL.treeDark); // ground shade
  // Concrete tank, brim-full.
  c.fillRect(28, 30, 16, 13, PAL.rock);
  c.fillRect(28, 30, 1, 13, PAL.metal);
  c.fillRect(43, 30, 1, 13, PAL.rockDark);
  for (let y = 34; y < 43; y += 4) c.fillRect(29, y, 14, 1, PAL.rockDark);
  c.fillRect(28, 28, 16, 2, PAL.metal);
  c.fillRect(29, 29, 14, 1, PAL.water);
  c.set(31, 29, PAL.waterLight);
  c.set(32, 29, PAL.white);
  // Tower legs and cross bracing.
  c.line(9, 44, 16, 13, PAL.metal);
  c.line(23, 44, 18, 13, PAL.metalDark);
  for (let y = 40; y > 15; y -= 6) {
    const k = (44 - y) / 31;
    const l = Math.round(9 + 7 * k);
    const r = Math.round(23 - 5 * k);
    c.line(l, y, r, y, PAL.metalDark);
    c.line(l, y, r, y - 6, PAL.metal);
  }
  // Pipe to the tank.
  c.fillRect(17, 37, 11, 2, PAL.metalDark);
  c.fillRect(17, 37, 11, 1, PAL.metal);
  // Wind wheel: eight blades around a hub, then the tail vane.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.line(
      17 + Math.cos(a) * 2,
      9 + Math.sin(a) * 2,
      17 + Math.cos(a) * 8,
      9 + Math.sin(a) * 8,
      i < 4 ? PAL.metal : PAL.metalDark,
    );
    c.set(Math.round(17 + Math.cos(a) * 7), Math.round(9 + Math.sin(a) * 7), PAL.plaster);
  }
  c.fillEllipse(17, 9, 2, 2, PAL.metalDark);
  c.set(16, 8, PAL.metal);
  c.line(19, 9, 27, 9, PAL.metalDark);
  c.fillRect(25, 6, 5, 6, PAL.red);
  c.fillRect(25, 6, 5, 1, PAL.roofLight);
  return finish(c);
}

/** Solar pump: a tilted panel array on a frame, a pump box and a full tank. */
function solarPump(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 19, 3, PAL.treeDark);
  // Frame legs.
  c.line(9, 42, 9, 30, PAL.metalDark);
  c.line(27, 42, 27, 26, PAL.metalDark);
  c.line(9, 36, 27, 32, PAL.metalDark);
  // Panel, tilted towards the sun: cells with a bright top row and a metal frame.
  c.fillRect(5, 14, 26, 16, PAL.metal);
  c.fillRect(6, 15, 24, 14, PAL.waterDeep);
  for (let x = 6; x < 30; x += 6) c.fillRect(x, 15, 1, 14, PAL.glass);
  for (let y = 15; y < 29; y += 5) c.fillRect(6, y, 24, 1, PAL.glass);
  c.fillRect(7, 16, 4, 2, PAL.water);
  c.fillRect(13, 16, 4, 2, PAL.water);
  c.set(8, 16, PAL.white);
  c.fillRect(5, 29, 26, 1, PAL.metalDark);
  // Pump box with a little vent, cable to it.
  c.fillRect(17, 36, 7, 7, PAL.metal);
  c.fillRect(17, 36, 7, 1, PAL.plaster);
  c.fillRect(23, 37, 1, 6, PAL.metalDark);
  c.fillRect(19, 38, 3, 1, PAL.metalDark);
  c.fillRect(19, 40, 3, 1, PAL.metalDark);
  c.line(27, 30, 24, 37, PAL.outline);
  // Tank.
  c.fillRect(30, 31, 14, 12, PAL.rock);
  c.fillRect(30, 31, 1, 12, PAL.metal);
  c.fillRect(43, 31, 1, 12, PAL.rockDark);
  c.fillRect(30, 29, 14, 2, PAL.metal);
  c.fillRect(31, 30, 12, 1, PAL.water);
  c.set(33, 30, PAL.white);
  return finish(c);
}

/** New ranger post: plaster walls, tin roof, radio mast and flag. */
function rangerPost(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 20, 3, PAL.treeDark);
  wall(c, 7, 25, 30, 18, 61);
  tinRoof(c, 4, 39, 12, 24, 5, 62, 0);
  windowPane(c, 12, 29, 6, 6);
  door(c, 23, 30, 7, 13);
  windowPane(c, 33, 29, 3, 6, false);
  // Sandbags by the door.
  for (const [x, y] of [
    [31, 41],
    [34, 41],
    [32, 39],
  ] as const) {
    c.fillRect(x, y, 3, 2, PAL.sand);
    c.set(x, y, PAL.plaster);
  }
  // Radio mast and flagpole.
  c.line(9, 12, 9, 2, PAL.metalDark);
  c.line(7, 4, 11, 4, PAL.metalDark);
  c.line(8, 7, 10, 7, PAL.metalDark);
  c.line(42, 43, 42, 6, PAL.woodDark);
  c.set(42, 5, PAL.thatch);
  c.fillRect(43, 6, 5, 4, PAL.red);
  c.fillRect(43, 8, 5, 1, PAL.roofDark);
  return finish(c);
}

/** Wooden observation tower: braced stilts, ladder, railed platform under a thatch roof. */
function tower(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 16, 3, PAL.treeDark);
  // Stilts and bracing.
  post(c, 13, 18, 26, 3);
  post(c, 32, 18, 26, 3);
  for (let y = 22; y < 42; y += 9) {
    c.line(15, y, 32, y + 8, PAL.woodDark);
    c.line(32, y, 15, y + 8, PAL.wood);
  }
  // Ladder.
  c.line(21, 44, 22, 19, PAL.woodLight);
  c.line(26, 44, 25, 19, PAL.wood);
  for (let y = 22; y < 44; y += 3) c.line(22, y, 25, y, PAL.woodLight);
  // Platform with railing.
  plank(c, 10, 17, 28, 3);
  for (let x = 11; x < 38; x += 4) c.line(x, 11, x, 16, PAL.wood);
  c.line(10, 11, 37, 11, PAL.woodLight);
  // Thatch roof on two posts.
  c.line(11, 5, 11, 11, PAL.woodDark);
  c.line(36, 5, 36, 11, PAL.woodDark);
  for (let y = 1; y <= 6; y++) {
    const half = 8 + y * 2.5;
    for (let x = Math.round(24 - half); x <= Math.round(24 + half); x++) {
      const t = (x - (24 - half)) / (half * 2);
      c.set(x, y, t < 0.3 ? PAL.sand : t > 0.7 ? PAL.thatchDark : PAL.thatch);
    }
  }
  c.fillRect(8, 7, 32, 1, PAL.thatchDark);
  return finish(c);
}

/** Building site: poles, planks, a ladder, bricks and a cement sack. */
function scaffold(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(24, 44, 19, 3, PAL.dirt);
  c.fillEllipse(24, 44, 15, 2, PAL.dirtDark);
  for (const x of [9, 23, 37]) post(c, x, 14, 30);
  for (const y of [16, 28]) plank(c, 7, y, 34, 2);
  c.line(10, 42, 24, 17, PAL.woodLight);
  c.line(24, 42, 38, 17, PAL.woodLight);
  // Half-built wall rising inside.
  stonework(c, 12, 34, 22, 9);
  // Brick stack and cement sack.
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3 - row; i++) {
      const x = 36 + i * 3 + row;
      const y = 40 - row * 2;
      c.fillRect(x, y, 3, 2, PAL.roof);
      c.set(x, y, PAL.roofLight);
    }
  c.fillRect(2, 38, 5, 5, PAL.plaster);
  c.fillRect(2, 38, 5, 1, PAL.plasterShade);
  c.set(4, 40, PAL.rockDark);
  return finish(c);
}

/** Dust puff particle for finished buildings and mended fences. */
export function drawDust(): PixelCanvas {
  const c = new PixelCanvas(4, 4);
  c.fillRect(1, 0, 2, 4, PAL.sand);
  c.fillRect(0, 1, 4, 2, PAL.sand);
  c.set(1, 1, PAL.grassDry);
  return c;
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
