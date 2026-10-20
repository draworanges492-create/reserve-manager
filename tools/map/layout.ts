// Hand-placed layout for the reserve map (spec §5), in tile coordinates.
// Zones tile the whole map edge to edge, and every zone borders one that unlocks no
// later than it does, so the playable area grows outward without gaps (DECISIONS D43).
// That makes zones ~1.6× the spec's "approx." sizes (which only add up to 5,800 tiles).
import type { StructureName, TileName } from '../tileset';

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
  north: { x: 0, y: 0, w: 48, h: 32 },
  outcrop: { x: 48, y: 0, w: 28, h: 32 },
  woodland: { x: 76, y: 0, w: 44, h: 32 },
  river: { x: 0, y: 32, w: 36, h: 48 },
  plains: { x: 36, y: 32, w: 48, h: 36 },
  hq: { x: 36, y: 68, w: 48, h: 12 },
  east_border: { x: 84, y: 32, w: 36, h: 48 },
};

/** River centre line x for row y: a gentle meander down the west side. */
export function riverCenter(y: number): number {
  return Math.round(20 + 4 * Math.sin(y / 9) + 2 * Math.sin(y / 4.3));
}

export const WATERHOLES: { id: string; zoneId: string; at: Point }[] = [
  { id: 'waterhole_a', zoneId: 'plains', at: { x: 53, y: 45 } }, // nearly dry at start
  { id: 'waterhole_b', zoneId: 'river', at: { x: 27, y: 46 } },
];

export const ROADS: Rect[] = [
  { x: 56, y: 46, w: 2, h: 34 }, // gate → HQ → Waterhole A
  { x: 30, y: 56, w: 26, h: 2 }, // west to the river zone
  { x: 30, y: 49, w: 2, h: 7 }, // up to Waterhole B
  { x: 58, y: 62, w: 47, h: 2 }, // east to the border
];
export const PARKING: Rect = { x: 61, y: 74, w: 5, h: 4 };
export const FARMLAND: Rect = { x: 113, y: 34, w: 6, h: 36 };

/** Map buildings (top-left tile). Solid ones block herds. */
export const STRUCTURE_PLACEMENTS: { structure: StructureName; at: Point; solid: boolean }[] = [
  { structure: 'hq_office', at: { x: 50, y: 72 }, solid: true },
  { structure: 'ranger_post_ruin', at: { x: 61, y: 71 }, solid: true },
  { structure: 'gate', at: { x: 56, y: 78 }, solid: false }, // the road runs through it
  { structure: 'pump_ruin', at: { x: 57, y: 42 }, solid: true }, // under build slot pump_a
  { structure: 'hut', at: { x: 118, y: 38 }, solid: true },
  { structure: 'hut', at: { x: 118, y: 47 }, solid: true },
  { structure: 'hut', at: { x: 118, y: 56 }, solid: true },
  { structure: 'hut', at: { x: 118, y: 66 }, solid: true },
];

/** Pump slots name the waterhole they feed (`waterholeId`). */
export const BUILD_SLOTS: {
  id: string;
  slotType: string;
  zoneId: string;
  rect: Rect;
  waterholeId?: string;
}[] = [
  {
    id: 'pump_a',
    slotType: 'pump',
    zoneId: 'plains',
    rect: { x: 57, y: 42, w: 2, h: 2 },
    waterholeId: 'waterhole_a',
  },
  {
    id: 'pump_b',
    slotType: 'pump',
    zoneId: 'river',
    rect: { x: 30, y: 43, w: 2, h: 2 },
    waterholeId: 'waterhole_b',
  },
  { id: 'tower_plains', slotType: 'tower', zoneId: 'plains', rect: { x: 44, y: 36, w: 2, h: 2 } },
  { id: 'tower_outcrop', slotType: 'tower', zoneId: 'outcrop', rect: { x: 54, y: 10, w: 2, h: 2 } },
  { id: 'post_hq', slotType: 'post', zoneId: 'hq', rect: { x: 60, y: 70, w: 2, h: 2 } },
  { id: 'post_woodland', slotType: 'post', zoneId: 'woodland', rect: { x: 86, y: 14, w: 2, h: 2 } },
  { id: 'post_east', slotType: 'post', zoneId: 'east_border', rect: { x: 104, y: 48, w: 2, h: 2 } },
  { id: 'lodge_hq', slotType: 'lodge', zoneId: 'hq', rect: { x: 42, y: 72, w: 3, h: 3 } },
];

export const SPAWNS: { kind: string; at: Point; species?: string }[] = [
  { kind: 'animal', at: { x: 46, y: 40 }, species: 'impala' },
  { kind: 'animal', at: { x: 66, y: 52 }, species: 'zebra' },
  { kind: 'animal', at: { x: 70, y: 37 }, species: 'lion' },
  { kind: 'animal', at: { x: 44, y: 60 }, species: 'elephant' },
  { kind: 'animal', at: { x: 78, y: 46 }, species: 'hyena' },
  { kind: 'animal', at: { x: 64, y: 36 }, species: 'vulture' },
  { kind: 'visitor', at: { x: 56, y: 79 } },
  { kind: 'staff', at: { x: 51, y: 74 } },
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
