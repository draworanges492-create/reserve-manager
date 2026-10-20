// Terrain tileset layout, shared by the placeholder generator and the map generator.
import { ART_SCALE, TILE_SIZE } from '../src/config/game';

/** Tile size in the tileset image: world tiles are drawn at ART_SCALE× detail (D106). */
export const TILE_ART = TILE_SIZE * ART_SCALE;

/** Single-tile terrain and decoration. */
export const BASE_TILES = [
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
  'collision',
] as const;

/**
 * Map buildings drawn as one picture and cut into tiles (size in tiles), so they can be
 * bigger and more detailed than a single 24 px tile (DECISIONS D105).
 */
export const STRUCTURES = {
  hq_office: { w: 3, h: 2 },
  ranger_post_ruin: { w: 2, h: 2 },
  gate: { w: 2, h: 2 },
  hut: { w: 2, h: 2 },
  pump_ruin: { w: 2, h: 2 },
} as const;

export type BaseTileName = (typeof BASE_TILES)[number];
export type StructureName = keyof typeof STRUCTURES;
/** A structure piece is `<structure>_<index>`, index = row × width + column. */
export type TileName = BaseTileName | `${StructureName}_${number}`;

function structurePieces(): TileName[] {
  return (Object.keys(STRUCTURES) as StructureName[]).flatMap((name) => {
    const { w, h } = STRUCTURES[name];
    return Array.from({ length: w * h }, (_, i): TileName => `${name}_${i}`);
  });
}

export const TILE_NAMES: readonly TileName[] = [...BASE_TILES, ...structurePieces()];

/** The tiles of a structure placed with its top-left tile at (x, y). */
export function structureTiles(
  name: StructureName,
  x: number,
  y: number,
): { tile: TileName; x: number; y: number }[] {
  const { w, h } = STRUCTURES[name];
  const out: { tile: TileName; x: number; y: number }[] = [];
  for (let row = 0; row < h; row++)
    for (let col = 0; col < w; col++)
      out.push({ tile: `${name}_${row * w + col}`, x: x + col, y: y + row });
  return out;
}

export const TILESET_NAME = 'terrain';
export const TILESET_COLUMNS = 8;
// 1 px margin + 2 px spacing hold an extruded copy of each tile's edge, which stops
// seams appearing between tiles when the camera sits on a fractional position.
export const TILESET_MARGIN = 1;
export const TILESET_SPACING = 2;

export function tilesetSize(count = TILE_NAMES.length): { width: number; height: number } {
  const rows = Math.ceil(count / TILESET_COLUMNS);
  const span = (n: number): number => 2 * TILESET_MARGIN + n * TILE_ART + (n - 1) * TILESET_SPACING;
  return { width: span(TILESET_COLUMNS), height: span(rows) };
}

/** Tiled global tile id (firstgid = 1; 0 means empty). */
export function gid(name: TileName): number {
  const i = TILE_NAMES.indexOf(name);
  if (i < 0) throw new Error(`unknown tile ${name}`);
  return i + 1;
}

export { TILE_SIZE };
