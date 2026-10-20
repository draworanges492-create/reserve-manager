// Every world-art file the game loads, rendered at 2× detail (DECISIONS D106).
// Paths are relative to public/assets and must match src/config/assets.json.
import type { PixelCanvas } from '../lib/canvas';
import type { StructureName } from '../tileset';
import { elephant, type Frame, impala, zebra } from './animals';
import { BUILDING_ART } from './buildings';
import { bucket, clueMarker, drop, dust, shadowArt } from './fx';
import { ranger, visitor } from './people';
import { PORTRAIT_IDS, portraitFrames } from './portraits';
import { hyena, lion, vulture } from './predators';
import { raster, sheet } from './raster';
import { STRUCTURE_ART } from './structures';
import { TREE_ART, TREE_SIZES, TREE_VARIANTS, type TreeKind } from './trees';
import { WATERHOLE_FRAMES } from './water';

const walk = (draw: (f: Frame) => string, size: number) => sheet([draw(0), draw(1)], size, size);

export function drawWorldArt(): Record<string, PixelCanvas> {
  const out: Record<string, PixelCanvas> = {
    'sprites/impala.png': walk(impala, 24),
    'sprites/zebra.png': walk(zebra, 24),
    'sprites/lion.png': walk(lion, 24),
    'sprites/hyena.png': walk(hyena, 24),
    'sprites/vulture.png': walk(vulture, 24),
    'sprites/elephant.png': walk(elephant, 48),
    'sprites/ranger.png': walk(ranger, 24),
    'sprites/visitor.png': walk(visitor, 24),
    'sprites/shadow-sm.png': raster(shadowArt(20, 6), '', 20, 6, { outline: false }),
    'sprites/shadow-lg.png': raster(shadowArt(40, 10), '', 40, 10, { outline: false }),
    'sprites/waterhole.png': sheet(
      WATERHOLE_FRAMES.map((f) => f()),
      96,
      96,
      { outline: false },
    ),
    'sprites/bucket.png': raster(bucket(), '', 12, 12),
    'sprites/fx-drop.png': raster(drop(), '', 3, 3, { outline: false }),
    'sprites/fx-dust.png': raster(dust(), '', 4, 4, { outline: false }),
    'sprites/clue-marker.png': raster(clueMarker(), '', 16, 16),
  };
  for (const [key, draw] of Object.entries(BUILDING_ART))
    out[`sprites/${key}.png`] = raster(draw(), '', 48, 48);
  for (const kind of Object.keys(TREE_ART) as TreeKind[]) {
    const { w, h } = TREE_SIZES[kind];
    for (let v = 0; v < TREE_VARIANTS; v++)
      out[`sprites/tree-${kind}-${v}.png`] = raster(TREE_ART[kind](v), '', w, h, {
        outline: false,
      });
  }
  for (const id of PORTRAIT_IDS)
    out[`portraits/portrait-${id}.png`] = sheet(portraitFrames(id), 72, 72);
  return out;
}

const structureCache = new Map<StructureName, PixelCanvas>();

/** A whole map building at 2× detail (cut into tiles by tiles.ts). */
export function structureImage(name: StructureName, w: number, h: number): PixelCanvas {
  let img = structureCache.get(name);
  if (!img) {
    img = raster(STRUCTURE_ART[name](), '', w, h, { outline: false });
    structureCache.set(name, img);
  }
  return img;
}
