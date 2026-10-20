// Map buildings at 2× detail (DECISIONS D105, D106), in world pixels. Scenery, so no outline.
import { Rng } from '../../src/core/Rng';
import type { StructureName } from '../tileset';
import {
  door,
  groundShadow,
  line,
  METAL,
  plank,
  PLASTER,
  post,
  rect,
  ROOF,
  rubble,
  RUST,
  STONE,
  stonework,
  THATCH,
  tinRoof,
  wall,
  weeds,
  windowPane,
  WOOD,
} from './parts';
import { foliage } from './plants';
import { dot, ellipse, fill, limb, shaded } from './svg';

/** Reserve headquarters: plaster office, tin roof, veranda, sign board and water tank. */
function hqOffice(): string {
  const tank = [
    shaded('M61,24 L70,24 L70,42.6 C68,43.4 63,43.4 61,42.6 Z', METAL, { rim: [1.5, 0] }),
    ...[27, 30.5, 34, 37.5, 41].map((y) => line(61, y, 70, y, METAL.dark, 0.4)),
    fill(ellipse(65.5, 24, 4.5, 1.4), METAL.dark),
    fill(ellipse(65.5, 23.7, 3.6, 0.9), METAL.light),
    line(60.5, 26, 57.5, 26, METAL.dark, 0.7),
  ];
  const veranda = [plank(4, 40.5, 54, 1.5)];
  for (let x = 5; x < 58; x += 2.5) veranda.push(line(x, 42, x, 43.5, WOOD.dark, 0.3));
  veranda.push(rect(4, 42, 54, 1.5, WOOD.mid), rect(4, 43, 54, 0.5, WOOD.dark));
  return [
    groundShadow(2, 43.5, 68, 3),
    ...tank,
    wall(4, 20.5, 54, 21, 11),
    tinRoof(1, 60, 3, 20.5, 7, { seed: 12 }),
    rect(2, 21, 57, 1, PLASTER.dark),
    windowPane(11, 26, 9, 8),
    windowPane(42, 26, 9, 8),
    door(27, 28, 8, 12.5),
    // Sign board with painted lettering and a lantern.
    rect(23.5, 22.5, 15, 4.5, WOOD.dark),
    rect(24, 23, 14, 3.5, '#efe2b8'),
    ...[25, 26.5, 28, 30.5, 32, 33.5, 35].map((x, i) =>
      rect(x, 24, i % 3 === 2 ? 0.8 : 1.2, 1.5, '#6a3a26'),
    ),
    rect(36.5, 29, 1.5, 2, '#e8c45a'),
    rect(36.5, 28.5, 1.5, 0.5, WOOD.dark),
    ...veranda,
    ...[5, 23, 38, 55].map((x) => post(x, 21, 19.5)),
    // Steps and a potted plant.
    rect(27, 43.5, 8, 1, STONE.light),
    rect(26, 44.5, 10, 1, STONE.mid),
    rect(56.6, 38.6, 3, 2.8, ROOF.mid),
    rect(56.6, 38.6, 3, 0.6, ROOF.light),
    foliage(58.1, 36.8, 2.4, 2, 5, 8),
  ].join('');
}

/** The burnt-out old ranger post: half the roof gone, soot, a boarded window. */
function rangerPostRuin(): string {
  const rng = new Rng(22);
  const soot = Array.from({ length: 50 }, () =>
    dot(7 + rng.next() * 32, 22.5 + rng.next() * 8, 0.3 + rng.next() * 0.5, '#5e5a52'),
  );
  return [
    groundShadow(4, 42.5, 40, 3),
    wall(6, 22, 34, 20, 21),
    ...soot,
    limb('M30,24 L33,30 L31,35', '#4f4838', 0.4, 0),
    limb('M10,33 L13,38', '#4f4838', 0.4, 0),
    fill(ellipse(35, 34, 3, 2.5), '#3f3a2e'),
    fill(ellipse(35.4, 34.4, 2, 1.6), '#2a2620'),
    tinRoof(3, 24, 8, 21.5, 4, { seed: 23, rust: 0.25 }),
    // Charred rafters where the right half of the roof was.
    ...[26, 30, 34, 38, 42].map((x) => line(x - 3, 21.5, x, 10.5, '#3a2a1e', 0.9)),
    line(22, 11, 42.5, 11, '#3a2a1e', 0.9),
    line(23, 21.5, 43, 21.5, WOOD.mid, 0.8),
    // A fallen roof sheet leaning against the wall.
    shaded('M37,29 L44.6,25.6 L46,39 L39.4,42 Z', ROOF, {
      extra:
        [38, 39.5, 41, 42.5, 44]
          .map((x) =>
            line(x, 28.6 + (x - 37) * -0.4, x + 1.2, 41.6 + (x - 37) * -0.4, ROOF.dark, 0.35),
          )
          .join('') + dot(41, 33, 0.8, RUST),
    }),
    // Empty doorway, boarded window.
    rect(16, 29, 7, 13, '#2a2620'),
    rect(16, 29, 0.5, 13, WOOD.dark),
    windowPane(27, 27, 7, 6, false),
    line(26, 27.4, 34.4, 32.4, WOOD.light, 1),
    line(26, 32.4, 34.4, 27.4, WOOD.mid, 1),
    plank(8.5, 43.6, 9, 1.4),
    rubble(4, 43, 38, 24, 18),
    weeds(7, 42, 25),
    weeds(40, 42, 26),
    weeds(20, 42.5, 27, 3),
  ].join('');
}

/** The main gate: stone pillars, timber crossbeam, a slipped sign and a loose gate leaf. */
function gate(): string {
  const signRow: string[] = [];
  for (let x = 13; x < 35; x += 0.5) {
    const drop = ((x - 13) / 22) * 3;
    signRow.push(rect(x, 11 + drop, 0.5, 6, '#c8a878'));
    signRow.push(rect(x, 11 + drop, 0.5, 0.5, '#e2c896'));
    signRow.push(rect(x, 16.5 + drop, 0.5, 0.5, WOOD.dark));
  }
  const letters = [16, 17.5, 19, 21.5, 23, 24.5, 27, 28.5, 30].map((x) =>
    rect(x, 13 + ((x - 13) / 22) * 3, 1, 2, '#5a3020'),
  );
  return [
    groundShadow(0.5, 44, 10, 2),
    groundShadow(38.5, 44, 10, 2),
    stonework(1, 10, 7, 34, 31),
    stonework(40, 10, 7, 34, 32),
    rect(0, 8, 9, 2.5, PLASTER.light),
    rect(0, 10, 9, 0.8, PLASTER.dark),
    rect(39, 8, 9, 2.5, PLASTER.light),
    rect(39, 10, 9, 0.8, PLASTER.dark),
    // Crossbeam with end caps.
    rect(2, 4, 44, 4, WOOD.mid),
    rect(2, 4, 44, 1, WOOD.light),
    rect(2, 7.2, 44, 0.8, WOOD.dark),
    line(6, 5.8, 42, 5.8, WOOD.dark, 0.3),
    rect(1, 3, 1, 6, WOOD.dark),
    rect(46, 3, 1, 6, WOOD.dark),
    // Hanging sign, one chain slipped.
    line(15, 8, 15, 11, METAL.dark, 0.5),
    line(33, 8, 33, 14, METAL.dark, 0.5),
    ...signRow,
    ...letters,
    // The loose right-hand gate leaf, hanging from one hinge.
    limb('M38.6,22 L25.4,34.8', WOOD.dark, 1, 0),
    limb('M38.6,34 L25.4,40.6', WOOD.mid, 1, 0),
    limb('M38.6,22 L38.6,34', WOOD.mid, 1, 0),
    limb('M31.6,28.4 L31.6,37.6', WOOD.mid, 0.9, 0),
    limb('M25.4,34.8 L25.4,40.6', WOOD.mid, 0.9, 0),
    limb('M38,23 L26.4,39.6', WOOD.light, 0.5, 0),
    dot(38.8, 22.4, 0.6, METAL.dark),
    weeds(3, 44, 33, 6),
    weeds(44, 44, 34, 6),
  ].join('');
}

/** Round thatched hut (rondavel) with ochre walls. */
function hut(): string {
  const rng = new Rng(41);
  const straw: string[] = [];
  for (let i = 0; i < 160; i++) {
    const y = 5 + rng.next() * 21;
    const half = 19 * ((y - 4) / 23) + 1;
    const x = 24 + (rng.next() * 2 - 1) * half * 0.95;
    const t = (x - (24 - half)) / (half * 2);
    const color =
      t < 0.3 ? THATCH.light : t > 0.72 ? '#7a6030' : rng.chance(0.5) ? THATCH.dark : THATCH.light;
    straw.push(line(x, y, x + (x - 24) * 0.04, y + 1.2, color, 0.35));
  }
  const fringe = Array.from({ length: 40 }, (_, i) => {
    const x = 5.2 + i * 0.95;
    return line(x, 27, x + 0.2, 28 + (i % 3) * 0.5, THATCH.dark, 0.45);
  });
  return [
    fill(ellipse(24.5, 43.4, 18, 2.6), 'rgba(0,0,0,0.25)'),
    // Cylindrical wall: lit left, shaded right, darker band at the foot.
    shaded(
      'M10,25 L38,25 L38,39 C38,42.6 31.8,44 24,44 C16.2,44 10,42.6 10,39 Z',
      { light: '#e3cf9a', mid: '#c9a76e', dark: '#9e7f4c' },
      {
        rim: [4, 0],
        light: 'M10,25 L14,25 L14,43 C11.4,42.4 10,41 10,39 Z',
        extra: fill('M0,38 C8,41 40,41 48,38 V48 H0 Z', '#8a6a42'),
      },
    ),
    // Door with a rounded top, small window.
    fill('M20,41.6 L20,33 C20,30.6 27,30.6 27,33 L27,41.8 Z', WOOD.dark),
    fill('M21,41.6 L21,33.4 C21,31.6 26,31.6 26,33.4 L26,41.8 Z', WOOD.mid),
    rect(21, 33, 0.5, 8.6, WOOD.light),
    line(23.5, 31.8, 23.5, 41.6, WOOD.dark, 0.3),
    rect(30, 29, 4, 4, '#3a3024'),
    rect(30, 29, 4, 0.6, WOOD.dark),
    // Conical thatch roof.
    fill('M24,3 L43.6,27.4 C38,29.2 10,29.2 4.4,27.4 Z', THATCH.mid),
    ...straw,
    ...fringe,
    rect(23, 1.5, 2, 3, WOOD.dark),
    rect(23, 1.5, 0.5, 3, WOOD.light),
    // Clay pot by the wall.
    shaded(ellipse(40.5, 40.6, 2.4, 2.2), ROOF, { light: ellipse(39.8, 39.8, 0.8, 0.6) }),
    rect(39, 38.2, 3, 0.8, ROOF.dark),
  ].join('');
}

/** The old broken windmill pump over Waterhole A's borehole. */
function pumpRuin(): string {
  const braces: string[] = [];
  for (let i = 0, y = 38; y > 14; y -= 5, i++) {
    const k = (44 - y) / 32;
    const l = 6 + k * 8;
    const r = 22 - k * 5;
    braces.push(line(l, y, r, y, i % 2 ? RUST : METAL.dark, 0.5));
    braces.push(line(l, y, r, y - 5, i % 2 ? METAL.dark : RUST, 0.4));
  }
  return [
    groundShadow(3, 42.8, 42, 3),
    // Cracked, empty concrete tank.
    shaded('M26,31 L45,31 L45,43 L26,43 Z', STONE, {
      rim: [1, 0],
      extra:
        line(33, 31, 35, 37, STONE.dark, 0.5) +
        line(35, 37, 34, 43, STONE.dark, 0.5) +
        rect(39, 39, 3, 2, STONE.dark) +
        dot(29, 36, 0.6, '#6d8546') +
        dot(30, 36.6, 0.5, '#8fa05a'),
    }),
    rect(26, 29, 19, 2, METAL.mid),
    rect(26, 29, 19, 0.5, METAL.light),
    rect(27, 30.5, 17, 0.8, '#3a3024'),
    // Rusted lattice tower, leaning slightly.
    line(6, 44, 14, 12, METAL.dark, 0.9),
    line(22, 44, 17, 12, METAL.dark, 0.9),
    line(6.4, 43, 14.2, 13, RUST, 0.35),
    ...braces,
    // Hub with three bent blades left; a fallen blade in the grass.
    shaded(ellipse(15.5, 10, 2, 2), METAL, {}),
    limb('M15,9 L9,3', METAL.mid, 0.9, 0),
    limb('M14.6,8.6 L9.6,3.4', METAL.light, 0.35, 0),
    limb('M17,10 L24,7', METAL.mid, 0.9, 0),
    limb('M15,12 L12,19', METAL.mid, 0.9, 0),
    dot(11, 5, 0.6, RUST),
    limb('M18,9 L21,6', RUST, 0.6, 0),
    limb('M4,42 L12,40', METAL.mid, 1, 0),
    limb('M4,42.6 L12,40.6', RUST, 0.35, 0),
    // Pipe from the pump rod to the tank.
    rect(15, 37, 11, 1.5, METAL.dark),
    rect(15, 37, 11, 0.5, METAL.light),
    weeds(9, 44, 51, 8),
    weeds(24, 44, 52, 5),
    rubble(27, 44, 16, 53, 8),
  ].join('');
}

export const STRUCTURE_ART: Record<StructureName, () => string> = {
  hq_office: hqOffice,
  ranger_post_ruin: rangerPostRuin,
  gate,
  hut,
  pump_ruin: pumpRuin,
};

export { ROOF };
