// Hand-placed layout for the reserve map (spec §5), in tile coordinates.
// About 40% of the map is unzoned buffer bush: the spec's zone sizes add up to
// 5,800 of 9,600 tiles (DECISIONS D16).
import type { TileName } from '../tileset';

export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 80;
export const MAP_SEED = 20261019;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

export const ZONES: Record<string, Rect> = {
  north: { x: 0, y: 0, w: 40, h: 30 },
  outcrop: { x: 42, y: 2, w: 25, h: 20 },
  woodland: { x: 70, y: 0, w: 35, h: 30 },
  river: { x: 2, y: 34, w: 30, h: 25 },
  plains: { x: 36, y: 30, w: 40, h: 30 },
  east_border: { x: 100, y: 32, w: 20, h: 40 },
  hq: { x: 46, y: 63, w: 20, h: 15 },
};

/** River centre line x for row y: a gentle meander down the west side. */
export function riverCenter(y: number): number {
  return Math.round(20 + 4 * Math.sin(y / 9) + 2 * Math.sin(y / 4.3));
}

export const WATERHOLES: { id: string; zoneId: string; at: Point }[] = [
  { id: 'waterhole_a', zoneId: 'plains', at: { x: 54, y: 44 } }, // dry at start
  { id: 'waterhole_b', zoneId: 'river', at: { x: 27, y: 46 } },
];

export const ROADS: Rect[] = [
  { x: 56, y: 46, w: 2, h: 34 }, // gate → HQ → Waterhole A
  { x: 30, y: 56, w: 26, h: 2 }, // west to the river zone
  { x: 30, y: 49, w: 2, h: 7 }, // up to Waterhole B
  { x: 58, y: 62, w: 47, h: 2 }, // east to the border
];
export const PARKING: Rect = { x: 60, y: 72, w: 5, h: 5 };
export const FARMLAND: Rect = { x: 113, y: 34, w: 6, h: 36 };

export const OBJECT_TILES: { tile: TileName; at: Point; solid: boolean }[] = [
  { tile: 'hq_office', at: { x: 51, y: 67 }, solid: true },
  { tile: 'ranger_post_ruin', at: { x: 61, y: 66 }, solid: true },
  { tile: 'gate', at: { x: 56, y: 77 }, solid: false },
  { tile: 'gate', at: { x: 57, y: 77 }, solid: false },
  { tile: 'pump_ruin', at: { x: 57, y: 43 }, solid: true },
  { tile: 'hut', at: { x: 119, y: 38 }, solid: true },
  { tile: 'hut', at: { x: 119, y: 47 }, solid: true },
  { tile: 'hut', at: { x: 119, y: 56 }, solid: true },
  { tile: 'hut', at: { x: 119, y: 66 }, solid: true },
];

export const BUILD_SLOTS: { id: string; slotType: string; zoneId: string; rect: Rect }[] = [
  { id: 'pump_a', slotType: 'pump', zoneId: 'plains', rect: { x: 57, y: 43, w: 2, h: 2 } },
  { id: 'pump_b', slotType: 'pump', zoneId: 'river', rect: { x: 29, y: 44, w: 2, h: 2 } },
  { id: 'tower_plains', slotType: 'tower', zoneId: 'plains', rect: { x: 44, y: 36, w: 2, h: 2 } },
  { id: 'tower_outcrop', slotType: 'tower', zoneId: 'outcrop', rect: { x: 54, y: 10, w: 2, h: 2 } },
  { id: 'post_hq', slotType: 'post', zoneId: 'hq', rect: { x: 60, y: 66, w: 2, h: 2 } },
  { id: 'post_woodland', slotType: 'post', zoneId: 'woodland', rect: { x: 86, y: 14, w: 2, h: 2 } },
  { id: 'post_east', slotType: 'post', zoneId: 'east_border', rect: { x: 104, y: 48, w: 2, h: 2 } },
  { id: 'lodge_hq', slotType: 'lodge', zoneId: 'hq', rect: { x: 48, y: 72, w: 3, h: 3 } },
];

export const SPAWNS: { kind: string; at: Point; species?: string }[] = [
  { kind: 'animal', at: { x: 46, y: 40 }, species: 'impala' },
  { kind: 'animal', at: { x: 66, y: 52 }, species: 'zebra' },
  { kind: 'animal', at: { x: 70, y: 37 }, species: 'lion' },
  { kind: 'visitor', at: { x: 56, y: 79 } },
  { kind: 'staff', at: { x: 52, y: 69 } },
];

export const POACHER_ENTRIES: Point[] = [
  { x: 0, y: 12 },
  { x: 45, y: 0 },
  { x: 88, y: 0 },
  { x: 119, y: 42 },
  { x: 119, y: 72 },
];

/** Gate opening in the HQ south fence, in tiles along y = hq bottom edge. */
export const GATE_SPAN = { from: 55, to: 59 };

/** Decoration chance per tile, by zone ('none' = unzoned bush). Scaled by noise for clumping. */
export const DECO: Record<string, { tile: TileName; p: number }[]> = {
  woodland: [
    { tile: 'tree', p: 0.2 },
    { tile: 'tree_b', p: 0.08 },
    { tile: 'bush', p: 0.08 },
  ],
  north: [
    { tile: 'tree_b', p: 0.05 },
    { tile: 'bush', p: 0.05 },
    { tile: 'grass_tuft', p: 0.05 },
  ],
  river: [
    { tile: 'tree', p: 0.06 },
    { tile: 'bush', p: 0.08 },
    { tile: 'grass_tuft', p: 0.06 },
  ],
  plains: [
    { tile: 'tree_b', p: 0.012 },
    { tile: 'bush', p: 0.025 },
    { tile: 'grass_tuft', p: 0.06 },
  ],
  outcrop: [
    { tile: 'boulder', p: 0.14 },
    { tile: 'bush', p: 0.04 },
  ],
  east_border: [
    { tile: 'tree', p: 0.03 },
    { tile: 'bush', p: 0.04 },
  ],
  hq: [{ tile: 'grass_tuft', p: 0.03 }],
  none: [
    { tile: 'bush', p: 0.08 },
    { tile: 'tree', p: 0.04 },
    { tile: 'grass_tuft', p: 0.04 },
  ],
};

/** Ground tile by zone and a 0–1 noise value (noise makes patches instead of static). */
export function groundFor(zoneId: string | null, n: number): TileName {
  switch (zoneId) {
    case 'hq':
      return n < 0.75 ? 'dirt' : 'grass_dry';
    case 'plains':
      return n < 0.45 ? 'grass_dry' : n < 0.75 ? 'grass_dry_b' : 'grass';
    case 'river':
      return n < 0.5 ? 'grass_lush' : 'grass';
    case 'woodland':
      return n < 0.55 ? 'grass' : n < 0.8 ? 'grass_b' : 'grass_lush';
    case 'north':
      return n < 0.35 ? 'grass_dry' : n < 0.75 ? 'grass' : 'grass_b';
    case 'outcrop':
      return n < 0.7 ? 'rock_ground' : 'grass_dry';
    case 'east_border':
      return n < 0.5 ? 'grass' : 'grass_dry';
    default:
      return n < 0.6 ? 'scrub' : 'grass';
  }
}
