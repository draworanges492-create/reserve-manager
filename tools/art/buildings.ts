// Player-built structures (48×48 world px = one 2×2 build slot) at 2× detail (DECISIONS D106).
// Clickable, so they get the dark outline (D59).
import {
  door,
  GLASS,
  line,
  METAL,
  plank,
  PLASTER,
  post,
  rect,
  ROOF,
  STONE,
  stonework,
  THATCH,
  tinRoof,
  wall,
  windowPane,
  WOOD,
} from './parts';
import { dot, ellipse, fill, limb, shaded } from './svg';

const SHADE = '#3d5a2f';
const WATER = '#56809a';
const WATER_LIGHT = '#9cc4d8';
const RED = '#c2402f';

function tank(x: number, w: number): string {
  return [
    shaded(`M${x},31 L${x + w},31 L${x + w},43 L${x},43 Z`, STONE, {
      rim: [1, 0],
      extra: [34.5, 38, 41.5].map((y) => line(x, y, x + w, y, STONE.dark, 0.35)).join(''),
    }),
    rect(x, 29, w, 2, METAL.mid),
    rect(x, 29, w, 0.5, METAL.light),
    rect(x + 0.5, 30.2, w - 1, 0.8, WATER),
    line(x + 2, 30.5, x + 4, 30.5, WATER_LIGHT, 0.4),
  ].join('');
}

/** Galvanised windmill pump: lattice tower, full wind wheel, red tail vane, full tank. */
function boreholePump(): string {
  const braces: string[] = [];
  for (let y = 40; y > 15; y -= 5) {
    const k = (44 - y) / 31;
    const l = 9 + 7 * k;
    const r = 23 - 5 * k;
    braces.push(line(l, y, r, y, METAL.dark, 0.5), line(l, y, r, y - 5, METAL.mid, 0.4));
  }
  const blades = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return fill(
      `M${17 + c * 2},${9 + s * 2} L${17 + c * 8 - s * 1},${9 + s * 8 + c * 1} L${17 + c * 8 + s * 0.4},${9 + s * 8 - c * 0.4} Z`,
      i % 3 === 0 ? METAL.light : METAL.mid,
    );
  });
  return [
    fill(ellipse(24, 44, 19, 2.6), SHADE),
    tank(28, 16),
    line(9, 44, 16, 13, METAL.mid, 0.9),
    line(23, 44, 18, 13, METAL.dark, 0.9),
    ...braces,
    rect(17, 37, 11, 1.5, METAL.dark),
    rect(17, 37, 11, 0.5, METAL.light),
    ...blades,
    shaded(ellipse(17, 9, 1.8, 1.8), METAL, {}),
    line(19, 9, 26, 9, METAL.dark, 0.7),
    fill('M25,6 L30,5.4 L30,12.4 L25,11.6 Z', RED),
    rect(25, 6, 5, 0.6, '#e06a54'),
  ].join('');
}

/** Solar pump: a tilted panel array on a frame, a pump box and a full tank. */
function solarPump(): string {
  const cells: string[] = [];
  for (let x = 6; x < 30; x += 4)
    for (let y = 15; y < 29; y += 3.5) {
      cells.push(rect(x + 0.3, y + 0.3, 3.4, 2.9, '#2c4a66'));
      cells.push(rect(x + 0.3, y + 0.3, 3.4, 0.6, '#3f6688'));
    }
  return [
    fill(ellipse(24, 44, 19, 2.6), SHADE),
    line(9, 43, 9, 29.5, METAL.dark, 0.8),
    line(27, 43, 27, 26, METAL.dark, 0.8),
    line(9, 36, 27, 32, METAL.dark, 0.6),
    rect(5, 14, 26, 16, METAL.mid),
    rect(6, 15, 24, 14, GLASS),
    ...cells,
    line(7, 16, 13, 16, '#ffffff', 0.4),
    rect(5, 29.5, 26, 0.5, METAL.dark),
    // Pump box and cable.
    shaded('M17,36 L24,36 L24,43 L17,43 Z', METAL, {
      rim: [1, 0],
      extra: line(19, 38, 22, 38, METAL.dark, 0.4) + line(19, 39.5, 22, 39.5, METAL.dark, 0.4),
    }),
    dot(23, 37, 0.4, '#5ad06a'),
    limb('M27,30 C26,33 25,35 24,37', '#1e1a16', 0.4, 0),
    tank(30, 14),
  ].join('');
}

/** New ranger post: plaster walls, tin roof, radio mast, flag and sandbags. */
function rangerPost(): string {
  const bags = [
    [31, 41],
    [34, 41],
    [32.5, 39],
  ].map(([x, y]) =>
    shaded(
      ellipse((x ?? 0) + 1.5, (y ?? 0) + 1, 1.7, 1),
      { light: '#e3d4a4', mid: '#c9b680', dark: '#9e8c5c' },
      {},
    ),
  );
  return [
    fill(ellipse(24, 44, 20, 2.6), SHADE),
    wall(7, 24.5, 30, 18.5, 61),
    tinRoof(4, 39, 12, 24.5, 5, {
      seed: 62,
      rust: 0,
      ramp: { light: '#6e9a6a', mid: '#4f7a50', dark: '#3a5a3c' },
    }),
    windowPane(12.5, 29, 6, 6),
    door(23, 30, 7, 13),
    ...bags,
    // Radio mast and flag.
    line(9, 12.5, 9, 1.5, METAL.dark, 0.6),
    line(7, 4, 11, 4, METAL.dark, 0.5),
    line(7.6, 7, 10.4, 7, METAL.dark, 0.5),
    dot(9, 1.4, 0.5, RED),
    line(42.5, 43, 42.5, 5.5, WOOD.dark, 0.7),
    dot(42.5, 5.2, 0.6, '#e8c45a'),
    fill('M43,6 L48,6.6 L47.2,8.4 L48,10 L43,10 Z', RED),
    rect(43, 7.8, 4.6, 0.6, '#f0e6d0'),
  ].join('');
}

/** Wooden observation tower: braced stilts, ladder, railed platform under a thatch roof. */
function tower(): string {
  const thatchLines = Array.from({ length: 30 }, (_, i) => {
    const x = 6 + i * 1.2;
    return line(x, 7.2, 24 + (x - 24) * 0.4, 1.4, i % 3 === 0 ? THATCH.dark : THATCH.light, 0.35);
  });
  return [
    fill(ellipse(24, 44, 16, 2.6), SHADE),
    post(13, 18, 26, 3),
    post(32, 18, 26, 3),
    ...[22, 31].flatMap((y) => [
      line(15, y, 32, y + 8, WOOD.dark, 0.6),
      line(32, y, 15, y + 8, WOOD.mid, 0.6),
    ]),
    line(21, 44, 22, 19, WOOD.light, 0.6),
    line(26, 44, 25, 19, WOOD.mid, 0.6),
    ...Array.from({ length: 8 }, (_, i) =>
      line(21.6, 22 + i * 2.8, 25.4, 22 + i * 2.8, WOOD.light, 0.5),
    ),
    plank(10, 17, 28, 2.5),
    ...Array.from({ length: 8 }, (_, i) =>
      line(11 + i * 3.6, 11.5, 11 + i * 3.6, 17, WOOD.mid, 0.5),
    ),
    line(10, 11.5, 38, 11.5, WOOD.light, 0.7),
    line(11, 5, 11, 11.5, WOOD.dark, 0.6),
    line(37, 5, 37, 11.5, WOOD.dark, 0.6),
    fill('M24,0.8 L42,7.6 L6,7.6 Z', THATCH.mid),
    ...thatchLines,
    rect(6, 7.2, 36, 0.8, THATCH.dark),
  ].join('');
}

/** Building site: poles, planks, a ladder, a half-built wall, bricks and a cement sack. */
function scaffold(): string {
  const bricks: string[] = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3 - row; i++) {
      const x = 36 + i * 3 + row * 1.5;
      const y = 40.5 - row * 1.8;
      bricks.push(rect(x, y, 2.8, 1.6, ROOF.mid), rect(x, y, 2.8, 0.5, ROOF.light));
    }
  return [
    fill(ellipse(24, 44, 19, 2.6), '#8a6f4e'),
    fill(ellipse(24, 44.3, 15, 1.8), '#6b5440'),
    stonework(12, 34, 22, 9, 71),
    ...[9, 23, 37].map((x) => post(x, 14, 30)),
    plank(7, 16, 34, 1.5),
    plank(7, 28, 34, 1.5),
    line(10, 42, 24, 17, WOOD.light, 0.5),
    line(24, 42, 38, 17, WOOD.light, 0.5),
    ...bricks,
    shaded(
      'M2,38.4 C2,37.6 7,37.6 7,38.4 L7,43 L2,43 Z',
      { light: '#f2ead0', mid: '#ddcfa6', dark: '#b5a37e' },
      { rim: [0.6, 0], extra: rect(3.4, 40, 2, 1, PLASTER.dark) },
    ),
    line(30, 43.2, 33, 41, METAL.dark, 0.5),
    fill('M29,43.6 L31.4,42.6 L31.8,43.8 Z', METAL.light),
  ].join('');
}

/** Beehive fence: log hives hung on a wire between posts, a few bees about. */
function beehiveFence(): string {
  const hive = (x: number, y: number): string =>
    shaded(`M${x},${y} L${x + 6},${y} L${x + 6},${y + 4} L${x},${y + 4} Z`, WOOD, {
      rim: [0, 0.8],
      extra:
        line(x, y + 1.3, x + 6, y + 1.3, WOOD.dark, 0.3) +
        line(x, y + 2.7, x + 6, y + 2.7, WOOD.dark, 0.3) +
        dot(x + 5.2, y + 2, 0.6, '#2a1d14'),
    }) + rect(x - 0.5, y - 0.8, 7, 1, THATCH.mid);
  const bees = [
    [14, 20],
    [16, 18],
    [31, 22],
    [33, 19],
    [24, 15],
  ].map(
    ([x, y]) => dot(x ?? 0, y ?? 0, 0.5, '#e8c45a') + dot((x ?? 0) + 0.5, y ?? 0, 0.3, '#2a1d14'),
  );
  return [
    fill(ellipse(24, 44, 22, 2.4), SHADE),
    ...[3, 23, 43].map((x) => post(x, 22, 21.5, 2)),
    limb('M4,24 Q14,28 24,24 Q34,28 44,24', METAL.dark, 0.5, 0),
    line(13.5, 26.2, 13.5, 28.5, METAL.dark, 0.4),
    line(33.5, 26.2, 33.5, 28.5, METAL.dark, 0.4),
    hive(10.5, 28.5),
    hive(30.5, 28.5),
    ...bees,
    fill(ellipse(8, 42.6, 3, 1.4), '#6d8546'),
    fill(ellipse(39, 42.8, 3.4, 1.4), '#8fa05a'),
  ].join('');
}

/** Safari lodge (72×72, a 3×3 slot): stone base, big thatched roof, a deck with chairs. */
function lodge(): string {
  const straw = Array.from({ length: 70 }, (_, i) => {
    const x = 6 + (i % 35) * 1.75;
    const top = 6 + Math.abs(x - 36) * 0.35;
    return line(
      x,
      top + (i < 35 ? 2 : 10),
      x + 0.3,
      top + (i < 35 ? 6 : 14),
      i % 3 ? THATCH.dark : THATCH.light,
      0.4,
    );
  });
  return [
    fill(ellipse(36, 67, 33, 3.4), SHADE),
    // Deck in front, with a rail and two chairs.
    rect(4, 52, 64, 10, WOOD.mid),
    ...Array.from({ length: 16 }, (_, i) => line(4 + i * 4, 52, 4 + i * 4, 62, WOOD.dark, 0.4)),
    rect(4, 52, 64, 1, WOOD.light),
    ...[6, 18, 30, 42, 54, 66].map((x) => post(x, 56, 9, 1.5)),
    line(4, 57, 68, 57, WOOD.light, 0.8),
    rect(4, 61.5, 64, 1, WOOD.dark),
    ...[
      [46, 54],
      [54, 54],
    ].map(
      ([x, y]) =>
        rect(x ?? 0, y ?? 0, 4, 1.4, '#c2402f') +
        rect((x ?? 0) + 0.4, (y ?? 0) + 1.4, 0.6, 2, WOOD.dark) +
        rect((x ?? 0) + 3, (y ?? 0) + 1.4, 0.6, 2, WOOD.dark),
    ),
    // Stone walls with big windows and an open doorway.
    stonework(10, 32, 52, 20, 81),
    windowPane(15, 37, 9, 8, false),
    windowPane(48, 37, 9, 8, false),
    rect(31, 38, 10, 14, '#2a2018'),
    rect(32, 39, 8, 13, '#4a3424'),
    line(36, 39, 36, 52, '#2a2018', 0.5),
    // Big hipped thatch roof.
    fill('M2,34 L18,6 L54,6 L70,34 Z', THATCH.mid),
    fill('M2,34 L18,6 L22,6 L8,34 Z', THATCH.light),
    fill('M64,34 L50,6 L54,6 L70,34 Z', THATCH.dark),
    ...straw,
    rect(2, 33, 68, 1.5, THATCH.dark),
    rect(18, 5, 36, 1.5, WOOD.dark),
    ...[24, 36, 48].map((x) => rect(x - 0.8, 2, 1.6, 4, WOOD.dark)),
  ].join('');
}

/** Key → drawing. Keys must match src/config/assets.json and buildings.json ids. */
export const BUILDING_ART: Record<string, () => string> = {
  'building-borehole_pump': boreholePump,
  'building-solar_pump': solarPump,
  'building-ranger_post': rangerPost,
  'building-observation_tower': tower,
  'building-scaffold': scaffold,
  'building-beehive_fence': beehiveFence,
  'building-lodge': lodge,
};
