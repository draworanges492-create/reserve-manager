// Placeholder terrain tiles. Ground is muted and unlabelled so animals stay readable
// (DECISIONS D13/D19); buildings carry a 2-letter label.
import { Rng } from '../../src/core/Rng';
import { PixelCanvas, sameColor, TRANSPARENT, type Rgba } from '../lib/canvas';
import { PAL } from '../palette';
import { TILE_SIZE as S, type TileName } from '../tileset';

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

function label(c: PixelCanvas, text: string, y: number, color: Rgba = PAL.uiText): PixelCanvas {
  c.text(text, Math.floor((S - (text.length * 4 - 1)) / 2), y, color);
  return c;
}

function tree(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(12, 21.5, 8, 2.5, PAL.treeDark);
  c.fillRect(11, 14, 3, 8, PAL.wood);
  c.fillEllipse(12, 10, 10, 8, PAL.tree);
  c.fillEllipse(12, 10, 10, 8, PAL.treeDark, (_x, y) => y >= 13);
  const rng = new Rng(151);
  c.recolor((x, y, cur) =>
    y < 9 && x < 14 && sameColor(cur, PAL.tree) && rng.chance(0.25) ? PAL.grass : null,
  );
  return c;
}

function acacia(): PixelCanvas {
  const c = new PixelCanvas(S, S);
  c.fillEllipse(12, 21.5, 7, 2, PAL.treeDark);
  c.line(12, 21, 10, 9, PAL.wood);
  c.line(13, 21, 11, 9, PAL.wood);
  c.line(11, 9, 7, 6, PAL.wood);
  c.line(11, 9, 16, 6, PAL.wood);
  c.fillEllipse(12, 5, 11, 3.5, PAL.tree);
  c.fillEllipse(12, 5, 11, 3.5, PAL.treeDark, (_x, y) => y >= 6);
  return c;
}

const DRAWERS: Record<TileName, () => PixelCanvas> = {
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
  bush: () => {
    const c = new PixelCanvas(S, S);
    c.fillEllipse(12, 16, 7, 5, PAL.tree);
    c.fillEllipse(12, 16, 7, 5, PAL.treeDark, (_x, y) => y >= 18);
    return c;
  },
  grass_tuft: () => blades(new PixelCanvas(S, S), new Rng(191), 6, PAL.grassLight),
  boulder: () => {
    const c = new PixelCanvas(S, S);
    c.fillEllipse(12, 15, 8, 6, PAL.rock);
    c.fillEllipse(12, 15, 8, 6, PAL.rockDark, (_x, y) => y >= 17);
    c.fillEllipse(9, 12, 3, 2, PAL.sand);
    return c;
  },
  hq_office: () => {
    const c = new PixelCanvas(S, S);
    c.fillRect(3, 9, 18, 13, PAL.sand);
    c.fillRect(2, 3, 20, 7, PAL.roof);
    c.fillRect(2, 9, 20, 1, PAL.wood);
    c.fillRect(10, 15, 4, 7, PAL.wood);
    c.fillRect(5, 12, 3, 3, PAL.waterDeep);
    c.fillRect(16, 12, 3, 3, PAL.waterDeep);
    return label(c, 'HQ', 4);
  },
  ranger_post_ruin: () => {
    const c = new PixelCanvas(S, S);
    c.fillRect(4, 10, 16, 12, PAL.rockDark);
    c.fillRect(3, 6, 10, 4, PAL.roof);
    c.fillRect(15, 10, 3, 4, TRANSPARENT);
    cracks(c, new Rng(211), 2, PAL.outline);
    return label(c, 'RP', 14);
  },
  gate: () => {
    const c = new PixelCanvas(S, S);
    c.fillRect(1, 4, 3, 18, PAL.wood);
    c.fillRect(20, 4, 3, 18, PAL.wood);
    c.line(4, 8, 19, 10, PAL.wood);
    c.line(4, 9, 19, 11, PAL.wood);
    c.fillRect(7, 13, 10, 7, PAL.wood);
    return label(c, 'GT', 14);
  },
  hut: () => {
    const c = new PixelCanvas(S, S);
    c.fillEllipse(12, 16, 8, 6, PAL.sand);
    for (let y = 3; y <= 12; y++) {
      const half = y - 2;
      c.fillRect(12 - half, y, half * 2, 1, PAL.grassDry);
    }
    c.fillRect(11, 17, 3, 5, PAL.dirtDark);
    return c;
  },
  pump_ruin: () => {
    const c = new PixelCanvas(S, S);
    c.fillRect(4, 15, 16, 7, PAL.rock);
    c.line(7, 15, 12, 3, PAL.wood);
    c.line(17, 15, 12, 3, PAL.wood);
    c.fillEllipse(12, 9, 3, 3, PAL.rockDark);
    return label(c, 'PU', 16, PAL.uiPanel);
  },
  collision: () => {
    const c = new PixelCanvas(S, S);
    const magenta = [PAL.debug[0], PAL.debug[1], PAL.debug[2], 160] as const;
    c.line(0, 0, S - 1, S - 1, magenta);
    c.line(S - 1, 0, 0, S - 1, magenta);
    return c;
  },
};

export function drawTile(name: TileName): PixelCanvas {
  return DRAWERS[name]();
}
