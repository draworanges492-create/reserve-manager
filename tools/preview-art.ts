// Dev aid: writes an enlarged contact sheet of all placeholder art to the path given:
// terrain tiles, map buildings, player buildings, waterhole states, then animals and people
// on three different grounds to judge readability.
import { writeFileSync } from 'node:fs';
import { PixelCanvas } from './lib/canvas';
import { encodePng } from './lib/png';
import { PAL } from './palette';
import { drawBuildings } from './placeholders/buildings';
import { drawSprites } from './placeholders/sprites';
import { drawStructure } from './placeholders/structures';
import { drawTile } from './placeholders/tiles';
import { drawWaterhole } from './placeholders/water';
import { BASE_TILES, STRUCTURES, type StructureName } from './tileset';

const SCALE = Number(process.argv[3] ?? 4);
const out = process.argv[2];
if (!out) throw new Error('usage: tsx tools/preview-art.ts <out.png> [scale]');

const GAP = 4;
const rows: PixelCanvas[][] = [
  BASE_TILES.map((name) => drawTile(name)),
  (Object.keys(STRUCTURES) as StructureName[]).map((name) => drawStructure(name)),
  Object.values(drawBuildings()),
  [drawWaterhole()],
  Object.values(drawSprites()),
];
const grounds = [PAL.grass, PAL.grassDry, PAL.dirt];
const width = Math.max(...rows.map((r) => r.reduce((w, img) => w + img.width + GAP * 2, GAP)));
const height = rows.reduce((h, r) => h + Math.max(...r.map((img) => img.height)) + GAP * 3, GAP);
const sheet = new PixelCanvas(Math.min(width, 900), height);
sheet.fillRect(0, 0, sheet.width, sheet.height, PAL.uiPanel);
let y = GAP;
rows.forEach((row, r) => {
  let x = GAP;
  const rowH = Math.max(...row.map((img) => img.height));
  row.forEach((img, i) => {
    const ground = r === 4 ? (grounds[i % grounds.length] ?? PAL.grass) : PAL.grass;
    sheet.fillRect(x, y, img.width + GAP, rowH + GAP, ground);
    sheet.blit(img, x + GAP / 2, y + GAP / 2);
    x += img.width + GAP * 2;
  });
  y += rowH + GAP * 3;
});
const big = new PixelCanvas(sheet.width * SCALE, sheet.height * SCALE);
for (let py = 0; py < sheet.height; py++)
  for (let px = 0; px < sheet.width; px++)
    big.fillRect(px * SCALE, py * SCALE, SCALE, SCALE, sheet.get(px, py));
writeFileSync(out, encodePng(big.width, big.height, big.data));
