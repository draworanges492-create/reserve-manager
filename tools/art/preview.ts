// Dev aid: `tsx tools/art/preview.ts <out.png> [zoom]` renders the world art on three grounds.
import { writeFileSync } from 'node:fs';
import { hex, PixelCanvas } from '../lib/canvas';
import { encodePng } from '../lib/png';
import { elephant, impala, zebra } from './animals';
import { hyena, lion, vulture } from './predators';
import { BUILDING_ART } from './buildings';
import { ranger, visitor } from './people';
import { PORTRAIT_IDS, portraitFrames } from './portraits';
import { acacia, boulder, bush, grassTuft, tree } from './plants';
import { raster, sheet } from './raster';
import { STRUCTURE_ART } from './structures';
import { WATERHOLE_FRAMES } from './water';

const out = process.argv[2];
if (!out) throw new Error('usage: tsx tools/art/preview.ts <out.png> [zoom]');
const zoom = Number(process.argv[3] ?? 4);
const both = (f: (n: 0 | 1) => string, s: number) => sheet([f(0), f(1)], s, s);
const items = [
  both(impala, 24),
  both(zebra, 24),
  both(lion, 24),
  both(hyena, 24),
  both(vulture, 24),
  both(elephant, 48),
  both(ranger, 24),
  both(visitor, 24),
];
const scenery = [
  ...[tree, acacia, bush, boulder, grassTuft].map((f) =>
    raster(f(), '', 24, 24, { outline: false }),
  ),
  ...Object.values(STRUCTURE_ART).map((f, i) =>
    raster(f(), '', i === 0 ? 72 : 48, 48, { outline: false }),
  ),
];
const built = Object.values(BUILDING_ART).map((f) => raster(f(), '', 48, 48));
const water = WATERHOLE_FRAMES.map((f) => raster(f(), '', 96, 96, { outline: false }));
const which = process.argv[4] ?? 'animals';
if (which === 'scenery') items.splice(0, items.length, ...scenery);
if (which === 'built') items.splice(0, items.length, ...built);
if (which === 'portraits')
  items.splice(0, items.length, ...PORTRAIT_IDS.map((id) => sheet(portraitFrames(id), 72, 72)));
if (which === 'water') items.splice(0, items.length, ...water);
const grounds = ['#7d8a52', '#a39a62', '#8a6f4e'].map((c) => hex(c));
const pad = 4;
const width = items.reduce((w, i) => w + i.width + pad, pad);
const height =
  Math.max(...items.map((i) => i.height)) * grounds.length + pad * (grounds.length + 1);
const canvas = new PixelCanvas(width, height);
let y = pad;
for (const g of grounds) {
  let x = pad;
  const rowH = Math.max(...items.map((i) => i.height));
  canvas.fillRect(0, y - pad / 2, width, rowH + pad, g);
  for (const img of items) {
    canvas.blit(img, x, y + rowH - img.height);
    x += img.width + pad;
  }
  y += rowH + pad;
}
const big = new PixelCanvas(canvas.width * zoom, canvas.height * zoom);
for (let py = 0; py < canvas.height; py++)
  for (let px = 0; px < canvas.width; px++)
    big.fillRect(px * zoom, py * zoom, zoom, zoom, canvas.get(px, py));
writeFileSync(out, encodePng(big.width, big.height, big.data));
