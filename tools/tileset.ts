// Terrain tileset layout, shared by the placeholder generator and the map generator.
import { TILE_SIZE } from '../src/config/game';

export const TILE_NAMES = [
  'grass',
  'grass_b',
  'grass_lush',
  'grass_dry',
  'grass_dry_b',
  'scrub',
  'dirt',
  'road',
  'sand',
  'rock_ground',
  'farmland',
  'parking',
  'dry_bed',
  'water_shallow',
  'water_deep',
  'tree',
  'tree_b',
  'bush',
  'grass_tuft',
  'boulder',
  'hq_office',
  'ranger_post_ruin',
  'gate',
  'hut',
  'pump_ruin',
  'collision',
] as const;

export type TileName = (typeof TILE_NAMES)[number];

export const TILESET_NAME = 'terrain';
export const TILESET_COLUMNS = 8;
// 1 px margin + 2 px spacing hold an extruded copy of each tile's edge, which stops
// seams appearing between tiles when the camera sits on a fractional position.
export const TILESET_MARGIN = 1;
export const TILESET_SPACING = 2;

export function tilesetSize(count = TILE_NAMES.length): { width: number; height: number } {
  const rows = Math.ceil(count / TILESET_COLUMNS);
  const span = (n: number): number =>
    2 * TILESET_MARGIN + n * TILE_SIZE + (n - 1) * TILESET_SPACING;
  return { width: span(TILESET_COLUMNS), height: span(rows) };
}

/** Tiled global tile id (firstgid = 1; 0 means empty). */
export function gid(name: TileName): number {
  return TILE_NAMES.indexOf(name) + 1;
}

export { TILE_SIZE };
