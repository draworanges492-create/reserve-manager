// Builds the five tile layers from the layout, deterministically from MAP_SEED.
import { Rng } from '../../src/core/Rng';
import { TREE_VARIANTS, type TreeKind } from '../art/trees';
import { gid, structureTiles, type TileName } from '../tileset';
import {
  DECO,
  FARMLAND,
  groundFor,
  MAP_HEIGHT as H,
  MAP_SEED,
  MAP_WIDTH as W,
  BUILD_SLOTS,
  STRUCTURE_PLACEMENTS,
  PARKING,
  riverCenter,
  ROADS,
  WATERHOLES,
  ZONES,
  type Rect,
} from './layout';

export interface TileLayers {
  ground: number[];
  water: number[];
  vegetation_deco: number[];
  objects: number[];
  collision: number[];
}

const index = (x: number, y: number): number => y * W + x;
const inMap = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H;
const inRect = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

export function zoneAt(x: number, y: number): string | null {
  for (const [id, rect] of Object.entries(ZONES)) if (inRect(rect, x, y)) return id;
  return null;
}

/** Smooth 0–1 value noise: random lattice every `cell` tiles, bilinear + smoothstep. */
function valueNoise(rng: Rng, cell: number): (x: number, y: number) => number {
  const gw = Math.ceil(W / cell) + 2;
  const gh = Math.ceil(H / cell) + 2;
  const lattice = Array.from({ length: gw * gh }, () => rng.next());
  const at = (gx: number, gy: number): number => lattice[gy * gw + gx] ?? 0;
  const smooth = (t: number): number => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

/** A big tree, by the tile its trunk stands on. */
export interface TreeSpot {
  kind: TreeKind;
  x: number;
  y: number;
  variant: number;
}

/** Minimum distance (tiles, each axis) between two big trees. */
const TREE_SPACING = 3;

export function buildTerrain(): TileLayers & { trees: TreeSpot[] } {
  const rng = new Rng(MAP_SEED);
  const groundNoise = valueNoise(rng, 6);
  const decoNoise = valueNoise(rng, 5);
  const empty = (): number[] => new Array<number>(W * H).fill(0);
  const layers: TileLayers = {
    ground: empty(),
    water: empty(),
    vegetation_deco: empty(),
    objects: empty(),
    collision: empty(),
  };
  const trees: TreeSpot[] = [];
  /** Tiles where decoration must not go (paths, water, buildings, slots). */
  const keepClear = new Set<number>();

  const setGround = (x: number, y: number, tile: TileName, clear = true): void => {
    if (!inMap(x, y)) return;
    layers.ground[index(x, y)] = gid(tile);
    if (clear) keepClear.add(index(x, y));
  };
  const setWater = (x: number, y: number, deep: boolean): void => {
    if (!inMap(x, y)) return;
    setGround(x, y, 'sand');
    layers.water[index(x, y)] = gid(deep ? 'water_deep' : 'water_shallow');
    if (deep) layers.collision[index(x, y)] = gid('collision');
  };
  const fillRect = (r: Rect, tile: TileName): void => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) setGround(x, y, tile);
  };

  // Base ground by zone.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) setGround(x, y, groundFor(zoneAt(x, y), groundNoise(x, y)), false);
  }

  // Village crop strips (rows with a path every 4th row).
  for (let y = FARMLAND.y; y < FARMLAND.y + FARMLAND.h; y++) {
    if (y % 4 === 3) continue;
    for (let x = FARMLAND.x; x < FARMLAND.x + FARMLAND.w; x++) setGround(x, y, 'farmland');
  }

  // Permanent river: deep centre, shallow edges, sandy banks.
  for (let y = 0; y < H; y++) {
    const cx = riverCenter(y);
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.abs(dx);
      if (d <= 2) setWater(cx + dx, y, d <= 1);
      else setGround(cx + dx, y, 'sand');
    }
  }

  // Waterholes are sprites that draw their own bank, mud and water (Phase 3, D104), so the
  // ground under them stays as it is; only keep decoration off it.
  for (const { at } of WATERHOLES) {
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (dx * dx + dy * dy <= 10 && inMap(at.x + dx, at.y + dy))
          keepClear.add(index(at.x + dx, at.y + dy));
  }

  for (const road of ROADS) fillRect(road, 'road');
  fillRect(PARKING, 'parking');

  for (const { structure, at, solid } of STRUCTURE_PLACEMENTS) {
    for (const { tile, x, y } of structureTiles(structure, at.x, at.y)) {
      layers.objects[index(x, y)] = gid(tile);
      keepClear.add(index(x, y));
      if (solid) layers.collision[index(x, y)] = gid('collision');
    }
  }
  for (const { rect } of BUILD_SLOTS) {
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) keepClear.add(index(x, y));
  }

  // Decoration, clumped by noise.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (keepClear.has(index(x, y))) continue;
      const options = DECO[zoneAt(x, y) ?? 'none'] ?? [];
      const density = 0.4 + 1.2 * decoNoise(x, y);
      const roll = rng.next();
      let acc = 0;
      for (const deco of options) {
        acc += deco.p * density;
        if (roll >= acc) continue;
        if ('tree' in deco) {
          // Big trees need room: none within TREE_SPACING tiles of another (D109).
          const crowded = trees.some(
            (t) => Math.abs(t.x - x) < TREE_SPACING && Math.abs(t.y - y) < TREE_SPACING,
          );
          if (!crowded)
            trees.push({ kind: deco.tree, x, y, variant: trees.length % TREE_VARIANTS });
        } else {
          layers.vegetation_deco[index(x, y)] = gid(deco.tile);
          if (deco.tile === 'boulder') layers.collision[index(x, y)] = gid('collision');
        }
        break;
      }
    }
  }

  return { ...layers, trees };
}
