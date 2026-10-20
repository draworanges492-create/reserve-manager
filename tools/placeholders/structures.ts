// Map buildings, each drawn as one picture and cut into 24 px tiles (DECISIONS D105).
// Map colours and no outline (D13), but with shading and detail (D104).
import { Rng } from '../../src/core/Rng';
import { PixelCanvas } from '../lib/canvas';
import { PAL } from '../palette';
import { STRUCTURES, type StructureName, TILE_SIZE } from '../tileset';
import {
  door,
  plank,
  post,
  rubble,
  SHADE,
  stonework,
  tinRoof,
  wall,
  weeds,
  windowPane,
} from './parts';
import { canopy } from './plants';

function blank(name: StructureName): PixelCanvas {
  const { w, h } = STRUCTURES[name];
  return new PixelCanvas(w * TILE_SIZE, h * TILE_SIZE);
}

/** Reserve headquarters: plaster office with a tin roof, veranda, sign and water tank. */
function hqOffice(): PixelCanvas {
  const c = blank('hq_office');
  c.fillRect(3, 44, 66, 3, SHADE);
  // Rainwater tank on the right.
  c.fillRect(61, 24, 9, 19, PAL.metal);
  c.fillRect(62, 24, 1, 19, PAL.plaster);
  c.fillRect(68, 24, 2, 19, PAL.metalDark);
  for (let y = 27; y < 43; y += 4) c.fillRect(61, y, 9, 1, PAL.metalDark);
  c.fillEllipse(65.5, 24, 4.5, 1.6, PAL.metalDark);
  c.fillEllipse(65.5, 23.6, 3.5, 1, PAL.metal);
  c.line(60, 26, 57, 26, PAL.metalDark); // gutter pipe
  // Walls, then the roof that overhangs them.
  wall(c, 4, 21, 54, 21, 11);
  tinRoof(c, 1, 60, 3, 20, 7, 12);
  c.fillRect(2, 21, 58, 1, PAL.plasterShade); // eave shadow on the wall
  // Windows either side, door in the middle under a sign board.
  windowPane(c, 11, 26, 9, 8);
  windowPane(c, 42, 26, 9, 8);
  door(c, 27, 28, 8, 13);
  c.fillRect(24, 23, 14, 4, PAL.woodDark);
  c.fillRect(25, 24, 12, 2, PAL.woodLight);
  for (const x of [27, 28, 30, 31, 33, 35]) c.set(x, 24, PAL.woodDark); // painted lettering
  c.set(36, 30, PAL.thatch); // lantern
  c.set(36, 31, PAL.sand);
  // Veranda: plank floor and posts holding up the roof edge.
  for (let x = 4; x < 58; x++) {
    c.set(x, 41, x % 5 === 0 ? PAL.woodDark : PAL.woodLight);
    c.set(x, 42, PAL.wood);
    c.set(x, 43, PAL.woodDark);
  }
  for (const x of [5, 23, 38, 55]) post(c, x, 21, 20);
  // Steps and a potted plant.
  c.fillRect(27, 44, 8, 1, PAL.rock);
  c.fillRect(26, 45, 10, 1, PAL.rockDark);
  c.fillRect(57, 39, 3, 3, PAL.roof);
  canopy(c, 58.5, 37, 2.6, 2.2, 5, 3);
  return c;
}

/** The burnt-out old ranger post: half the roof gone, boarded window, rubble. */
function rangerPostRuin(): PixelCanvas {
  const c = blank('ranger_post_ruin');
  c.fillRect(4, 43, 40, 3, SHADE);
  wall(c, 6, 22, 34, 20, 21);
  // Soot and damp stains, cracks and a hole knocked through the wall.
  const rng = new Rng(22);
  for (let i = 0; i < 40; i++) c.set(rng.int(7, 38), rng.int(23, 30), PAL.rockDark);
  c.line(30, 24, 33, 30, PAL.mudDark);
  c.line(33, 30, 31, 35, PAL.mudDark);
  c.line(10, 33, 13, 38, PAL.mudDark);
  c.fillEllipse(35, 34, 3, 2.5, PAL.mudDark);
  // Left half of the roof survives; on the right only charred rafters remain.
  tinRoof(c, 3, 24, 8, 21, 4, 23, 0.15);
  for (const x of [26, 31, 36, 41]) c.line(x - 3, 21, x, 10, PAL.woodDark);
  c.line(22, 11, 42, 11, PAL.woodDark);
  c.line(23, 21, 43, 21, PAL.wood);
  // Fallen roof sheet leaning on the wall.
  for (let i = 0; i < 9; i++) c.line(38 + i, 30 + i, 44, 26 + i, i % 2 ? PAL.roofDark : PAL.roof);
  // Empty doorway, boarded-up window.
  c.fillRect(16, 29, 7, 13, PAL.mudDark);
  c.fillRect(17, 29, 1, 13, PAL.woodDark);
  windowPane(c, 27, 27, 7, 6, false);
  c.line(26, 27, 34, 32, PAL.woodLight);
  c.line(26, 32, 34, 27, PAL.wood);
  // Broken door on the ground, rubble and weeds.
  plank(c, 9, 44, 9, 2);
  rubble(c, 4, 43, 38, 24, 14);
  weeds(c, 7, 42, 25);
  weeds(c, 40, 42, 26);
  return c;
}

/** The main gate: stone pillars, a timber crossbeam and a crooked sign; one leaf hangs loose. */
function gate(): PixelCanvas {
  const c = blank('gate');
  for (const x of [0, 39]) {
    c.fillRect(x + 1, 44, 9, 2, SHADE);
    stonework(c, x + 1, 10, 7, 34);
    c.fillRect(x, 8, 9, 3, PAL.plaster); // capstone
    c.fillRect(x, 10, 9, 1, PAL.plasterShade);
  }
  // Crossbeam.
  c.fillRect(2, 4, 44, 4, PAL.wood);
  c.fillRect(2, 4, 44, 1, PAL.woodLight);
  c.fillRect(2, 7, 44, 1, PAL.woodDark);
  for (const x of [1, 46]) c.fillRect(x, 3, 1, 6, PAL.woodDark);
  // Sign hanging on chains, one side slipped lower.
  c.line(15, 8, 15, 11, PAL.metalDark);
  c.line(33, 8, 33, 14, PAL.metalDark);
  for (let x = 13; x <= 35; x++) {
    const drop = Math.round(((x - 13) / 22) * 3);
    c.fillRect(x, 11 + drop, 1, 6, PAL.woodLight);
    c.set(x, 11 + drop, PAL.thatch);
    c.set(x, 16 + drop, PAL.woodDark);
    if (x % 3 !== 0 && x > 15 && x < 33) c.set(x, 13 + drop + (x % 2), PAL.woodDark); // lettering
  }
  // The right gate leaf hangs off one hinge, swung open.
  for (let i = 0; i < 14; i++) {
    c.set(38 - i, 22 + Math.round(i * 0.9), PAL.woodDark);
    c.set(38 - i, 34 + Math.round(i * 0.5), PAL.wood);
  }
  for (const [x0, y0, x1, y1] of [
    [38, 22, 38, 34],
    [31, 28, 31, 37],
    [25, 34, 25, 40],
  ] as const)
    c.line(x0, y0, x1, y1, PAL.wood);
  weeds(c, 3, 44, 31, 5);
  weeds(c, 44, 44, 32, 5);
  return c;
}

/** Round thatched hut (rondavel) with ochre walls. */
function hut(): PixelCanvas {
  const c = blank('hut');
  c.fillEllipse(24.5, 43, 18, 3, SHADE);
  // Cylindrical wall: lit left, shaded right, darker band at the foot.
  c.fillRect(10, 25, 28, 14, PAL.sand);
  c.fillEllipse(24, 39, 14, 3.5, PAL.sand);
  c.recolor((x, y, cur) => {
    if (y < 25 || cur[3] === 0) return null;
    if (y >= 38) return PAL.dirt;
    if (x <= 12) return PAL.plaster;
    if (x >= 31) return PAL.grassDry;
    return null;
  });
  c.fillEllipse(24, 40, 14, 2.5, PAL.dirtDark, (_x, y) => y >= 41);
  // Door with a rounded top, small window.
  c.fillRect(20, 31, 7, 10, PAL.woodDark);
  c.fillRect(21, 30, 5, 1, PAL.woodDark);
  c.fillRect(21, 32, 5, 9, PAL.wood);
  c.fillRect(21, 32, 1, 9, PAL.woodLight);
  c.fillRect(30, 29, 4, 4, PAL.mudDark);
  c.set(30, 29, PAL.woodDark);
  // Conical thatch roof with straw texture and a ragged eave.
  const rng = new Rng(41);
  for (let y = 4; y <= 27; y++) {
    const half = 19 * ((y - 4) / 23) + 1;
    for (let x = Math.round(24 - half); x <= Math.round(24 + half); x++) {
      const t = (x - (24 - half)) / (half * 2);
      let color = t < 0.3 ? PAL.sand : t > 0.72 ? PAL.thatchDark : PAL.thatch;
      if (rng.chance(0.18)) color = rng.chance(0.5) ? PAL.thatchDark : PAL.sand;
      c.set(x, y, color);
    }
  }
  for (let x = 5; x <= 43; x++) if (rng.chance(0.6)) c.set(x, 28, PAL.thatchDark);
  c.fillRect(6, 27, 37, 1, PAL.thatchDark);
  c.fillRect(23, 2, 2, 3, PAL.woodDark); // roof knot
  // Clay pot by the wall.
  c.fillEllipse(40, 40, 2.5, 2.5, PAL.roof);
  c.set(39, 39, PAL.roofLight);
  c.fillRect(39, 37, 3, 1, PAL.roofDark);
  return c;
}

/** The old broken windmill pump over Waterhole A's borehole. */
function pumpRuin(): PixelCanvas {
  const c = blank('pump_ruin');
  c.fillRect(3, 43, 42, 3, SHADE);
  // Cracked, dry concrete tank.
  c.fillRect(26, 31, 19, 12, PAL.rock);
  c.fillRect(26, 31, 1, 12, PAL.metal);
  c.fillRect(44, 31, 1, 12, PAL.rockDark);
  c.fillRect(26, 29, 19, 2, PAL.metal);
  c.fillRect(27, 30, 17, 1, PAL.mudDark);
  c.line(33, 31, 35, 37, PAL.rockDark);
  c.line(35, 37, 34, 42, PAL.rockDark);
  c.fillRect(39, 39, 3, 2, PAL.rockDark); // chipped corner
  // Rusted lattice tower, leaning a little.
  const rust = (i: number) => (i % 2 ? PAL.roofDark : PAL.metalDark);
  c.line(6, 44, 14, 12, PAL.metalDark);
  c.line(22, 44, 17, 12, PAL.metalDark);
  for (let i = 0, y = 38; y > 14; y -= 6, i++) {
    const l = 6 + ((44 - y) / 32) * 8;
    const r = 22 - ((44 - y) / 32) * 5;
    c.line(l, y, r, y, rust(i));
    c.line(l, y, r, y - 6, rust(i + 1));
  }
  // Hub with only three bent blades left; one blade lies in the grass.
  c.fillEllipse(15.5, 10, 2, 2, PAL.metalDark);
  c.line(15, 9, 9, 3, PAL.metal);
  c.line(16, 9, 10, 3, PAL.metalDark);
  c.line(17, 10, 24, 7, PAL.metal);
  c.line(17, 11, 23, 9, PAL.metalDark);
  c.line(15, 12, 12, 19, PAL.metal);
  c.line(18, 9, 21, 6, PAL.roofDark); // snapped tail vane
  c.line(4, 42, 12, 40, PAL.metal);
  c.line(4, 43, 12, 41, PAL.metalDark);
  // Pipe from the pump rod to the tank.
  c.line(15, 38, 26, 38, PAL.metalDark);
  c.line(15, 37, 26, 37, PAL.metal);
  weeds(c, 9, 44, 51, 6);
  weeds(c, 24, 44, 52, 4);
  rubble(c, 27, 44, 16, 53, 6);
  return c;
}

const DRAWN: Record<StructureName, () => PixelCanvas> = {
  hq_office: hqOffice,
  ranger_post_ruin: rangerPostRuin,
  gate,
  hut,
  pump_ruin: pumpRuin,
};

const cache = new Map<StructureName, PixelCanvas>();

/** The whole picture of a structure (for previews). */
export function drawStructure(name: StructureName): PixelCanvas {
  let full = cache.get(name);
  if (!full) {
    full = DRAWN[name]();
    cache.set(name, full);
  }
  return full;
}

/** One 24 px piece of a structure; `index` = row × width + column. */
export function structurePiece(name: StructureName, index: number): PixelCanvas {
  const full = drawStructure(name);
  const { w } = STRUCTURES[name];
  const ox = (index % w) * TILE_SIZE;
  const oy = Math.floor(index / w) * TILE_SIZE;
  const piece = new PixelCanvas(TILE_SIZE, TILE_SIZE);
  for (let y = 0; y < TILE_SIZE; y++)
    for (let x = 0; x < TILE_SIZE; x++) piece.set(x, y, full.get(ox + x, oy + y));
  return piece;
}
