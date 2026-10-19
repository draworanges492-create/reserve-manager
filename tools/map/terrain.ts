// Builds the five tile layers from the layout, deterministically from MAP_SEED.
import { Rng } from '../../src/core/Rng';
import { gid, type TileName } from '../tileset';
import {
  DECO,
  FARMLAND,
  groundFor,
  MAP_HEIGHT as H,
  MAP_SEED,
  MAP_WIDTH as W,
  BUILD_SLOTS,
  OBJECT_TILES,
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

export function buildTerrain(): TileLayers {
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

  // Waterholes: A starts as a dry bed (filled in Phase 3); B is a small pond.
  const [holeA, holeB] = WATERHOLES;
  if (holeA) {
    const { x, y } = holeA.at;
    fillRect({ x: x - 1, y: y - 1, w: 3, h: 3 }, 'dry_bed');
    for (const [dx, dy] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ] as const)
      setGround(x + dx, y + dy, 'dry_bed');
  }
  if (holeB) {
    const { x, y } = holeB.at;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= 1) setWater(x + dx, y + dy, true);
        else if (d2 <= 5) setWater(x + dx, y + dy, false);
        else if (d2 <= 8) setGround(x + dx, y + dy, 'sand');
      }
    }
  }

  for (const road of ROADS) fillRect(road, 'road');
  fillRect(PARKING, 'parking');

  for (const { tile, at, solid } of OBJECT_TILES) {
    layers.objects[index(at.x, at.y)] = gid(tile);
    keepClear.add(index(at.x, at.y));
    if (solid) layers.collision[index(at.x, at.y)] = gid('collision');
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
      for (const { tile, p } of options) {
        acc += p * density;
        if (roll < acc) {
          layers.vegetation_deco[index(x, y)] = gid(tile);
          if (tile === 'boulder') layers.collision[index(x, y)] = gid('collision');
          break;
        }
      }
    }
  }

  return layers;
}
