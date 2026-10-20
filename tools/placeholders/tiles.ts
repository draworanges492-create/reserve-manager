// Placeholder terrain tiles. Ground is muted and unlabelled so animals stay readable
// (DECISIONS D13/D19). Plants are in plants.ts, map buildings in structures.ts.
import { Rng } from '../../src/core/Rng';
import { PixelCanvas, type Rgba } from '../lib/canvas';
import { PAL } from '../palette';
import {
  type BaseTileName,
  STRUCTURES,
  type StructureName,
  TILE_SIZE as S,
  type TileName,
} from '../tileset';
import { acacia, boulder, bush, grassTuft, tree } from './plants';
import { structurePiece } from './structures';

type Speck = readonly [Rgba, number];

function ground(base: Rgba, seed: number, specks: readonly Speck[]): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillRect(0, 0, S, S, base);
  const rng = new Rng(seed);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      for (const [color, p] of specks) {
        if (rng.chance(p)) {
          c.set(x, y, color);
          break;
        }
      }
    }
  }
  return c;
}

function blades(c: PixelCanvas, rng: Rng, count: number, color: Rgba): PixelCanvas {
  for (let i = 0; i < count; i++) {
    const x = rng.int(3, S - 4);
    const y = rng.int(8, S - 3);
    c.line(x, y, x + rng.int(-1, 1), y - rng.int(2, 4), color);
  }
  return c;
}

function ripples(c: PixelCanvas, rng: Rng, count: number, color: Rgba): PixelCanvas {
  for (let i = 0; i < count; i++) {
    const x = rng.int(1, S - 5);
    const y = rng.int(2, S - 3);
    c.line(x, y, x + 2, y, color);
  }
  return c;
}

function cracks(c: PixelCanvas, rng: Rng, count: number, color: Rgba): PixelCanvas {
  for (let i = 0; i < count; i++) {
    let x = rng.int(2, S - 3);
    let y = rng.int(2, S - 3);
    for (let step = 0; step < 7; step++) {
      c.set(x, y, color);
      x = Math.min(S - 1, Math.max(0, x + rng.int(-1, 1)));
      y = Math.min(S - 1, Math.max(0, y + rng.int(-1, 1)));
    }
  }
  return c;
}

const DRAWERS: Record<BaseTileName, () => PixelCanvas> = {
  grass: () =>
    ground(PAL.grass, 1, [
      [PAL.grassLight, 0.06],
      [PAL.grassDark, 0.06],
    ]),
  grass_b: () =>
    blades(
      ground(PAL.grass, 2, [
        [PAL.grassLight, 0.05],
        [PAL.grassDark, 0.07],
      ]),
      new Rng(22),
      3,
      PAL.grassLight,
    ),
  grass_lush: () =>
    ground(PAL.grass, 3, [
      [PAL.grassDark, 0.16],
      [PAL.grassLight, 0.03],
    ]),
  grass_dry: () =>
    ground(PAL.grassDry, 4, [
      [PAL.dirt, 0.06],
      [PAL.grass, 0.04],
    ]),
  grass_dry_b: () =>
    ground(PAL.grassDry, 5, [
      [PAL.dirt, 0.1],
      [PAL.sand, 0.04],
    ]),
  scrub: () =>
    ground(PAL.grassDark, 6, [
      [PAL.grass, 0.1],
      [PAL.treeDark, 0.05],
    ]),
  dirt: () =>
    ground(PAL.dirt, 7, [
      [PAL.dirtDark, 0.08],
      [PAL.sand, 0.03],
    ]),
  road: () =>
    ground(PAL.sand, 8, [
      [PAL.dirt, 0.1],
      [PAL.grassDry, 0.03],
    ]),
  sand: () => ground(PAL.sand, 9, [[PAL.grassDry, 0.05]]),
  rock_ground: () =>
    ground(PAL.rock, 10, [
      [PAL.rockDark, 0.12],
      [PAL.sand, 0.04],
    ]),
  farmland: () => {
    const c = ground(PAL.dirt, 11, [[PAL.dirtDark, 0.05]]);
    for (let y = 0; y < S; y++) {
      if (y % 6 === 1 || y % 6 === 2) c.fillRect(0, y, S, 1, PAL.grassDry);
      if (y % 6 === 4) c.fillRect(0, y, S, 1, PAL.dirtDark);
    }
    return c;
  },
  parking: () => {
    const c = ground(PAL.rock, 12, [[PAL.rockDark, 0.08]]);
    c.fillRect(11, 3, 1, 18, PAL.sand);
    return c;
  },
  dry_bed: () => cracks(ground(PAL.dirt, 13, [[PAL.sand, 0.08]]), new Rng(131), 4, PAL.dirtDark),
  water_shallow: () =>
    ripples(ground(PAL.water, 14, [[PAL.waterLight, 0.03]]), new Rng(141), 3, PAL.waterLight),
  water_deep: () =>
    ripples(ground(PAL.waterDeep, 15, [[PAL.water, 0.04]]), new Rng(142), 3, PAL.water),
  tree,
  tree_b: acacia,
  bush,
  grass_tuft: grassTuft,
  boulder,
  collision: () => {
    const c = new PixelCanvas(S, S);
    const magenta = [PAL.debug[0], PAL.debug[1], PAL.debug[2], 160] as const;
    c.line(0, 0, S - 1, S - 1, magenta);
    c.line(S - 1, 0, 0, S - 1, magenta);
    return c;
  },
};

export function drawTile(name: TileName): PixelCanvas {
  if (name in DRAWERS) return DRAWERS[name as BaseTileName]();
  const match = /^(.+)_(\d+)$/.exec(name);
  const structure = match?.[1];
  if (!match || !structure || !(structure in STRUCTURES)) throw new Error(`no drawer for ${name}`);
  return structurePiece(structure as StructureName, Number(match[2]));
}
