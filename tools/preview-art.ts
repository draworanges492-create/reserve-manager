// Dev aid: writes an 6×-enlarged contact sheet of all placeholder art to the path given.
import { writeFileSync } from 'node:fs';
import { PixelCanvas } from './lib/canvas';
import { encodePng } from './lib/png';
import { PAL } from './palette';
import { drawSprites } from './placeholders/sprites';
import { drawTile } from './placeholders/tiles';
import { TILE_NAMES, TILE_SIZE } from './tileset';

const SCALE = 6;
const out = process.argv[2];
if (!out) throw new Error('usage: tsx tools/preview-art.ts <out.png>');

const sprites = Object.values(drawSprites());
const cols = 9;
const cell = 50;
const rows = Math.ceil(TILE_NAMES.length / cols) + 2;
const sheet = new PixelCanvas(cols * cell, rows * cell);
sheet.fillRect(0, 0, sheet.width, sheet.height, PAL.uiPanel);
TILE_NAMES.forEach((name, i) => {
  const x = (i % cols) * cell + 2;
  const y = Math.floor(i / cols) * cell + 2;
  sheet.fillRect(x, y, TILE_SIZE, TILE_SIZE, PAL.grass); // shows transparent deco on grass
  sheet.blit(drawTile(name), x, y);
});
// Sprites on three different grounds to judge readability.
const grounds = [PAL.grassDry, PAL.grass, PAL.dirt];
let sx = 2;
const sy = Math.ceil(TILE_NAMES.length / cols) * cell + 2;
sprites.forEach((s, i) => {
  const g = grounds[i % grounds.length] ?? PAL.grass;
  sheet.fillRect(sx, sy, s.width + 4, Math.max(s.height + 4, 52), g);
  sheet.blit(s, sx + 2, sy + 2);
  sx += s.width + 8;
});
const big = new PixelCanvas(sheet.width * SCALE, sheet.height * SCALE);
for (let y = 0; y < sheet.height; y++)
  for (let x = 0; x < sheet.width; x++)
    big.fillRect(x * SCALE, y * SCALE, SCALE, SCALE, sheet.get(x, y));
writeFileSync(out, encodePng(big.width, big.height, big.data));
