// Generates placeholder art (spec §12) so the game is playable with zero downloaded assets.
// Never overwrites a PNG that lacks the placeholder marker, so real art is safe.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { PixelCanvas } from './lib/canvas';
import { encodePng, isPlaceholderFile, PLACEHOLDER_MARKER } from './lib/png';
import { PAL } from './palette';
import { drawBuildings } from './placeholders/buildings';
import { drawIcons } from './placeholders/icons';
import { drawSprites } from './placeholders/sprites';
import { drawTile } from './placeholders/tiles';
import { drawBucket, drawDrop, drawWaterhole } from './placeholders/water';
import {
  TILE_NAMES,
  TILE_SIZE,
  TILESET_COLUMNS,
  TILESET_MARGIN,
  TILESET_SPACING,
  tilesetSize,
} from './tileset';

const ASSETS = join(import.meta.dirname, '..', 'public', 'assets');

function write(rel: string, contents: Buffer): void {
  const path = join(ASSETS, rel);
  if (existsSync(path) && !isPlaceholderFile(readFileSync(path))) {
    console.warn(`skip ${rel}: not a placeholder (real art?)`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  console.log(`wrote ${relative(process.cwd(), path)}`);
}

function writePng(rel: string, canvas: PixelCanvas): void {
  write(rel, encodePng(canvas.width, canvas.height, canvas.data));
}

function buildTileset(): PixelCanvas {
  const { width, height } = tilesetSize();
  const sheet = new PixelCanvas(width, height);
  const last = TILE_SIZE - 1;
  TILE_NAMES.forEach((name, i) => {
    const tile = drawTile(name);
    const px = TILESET_MARGIN + (i % TILESET_COLUMNS) * (TILE_SIZE + TILESET_SPACING);
    const py = TILESET_MARGIN + Math.floor(i / TILESET_COLUMNS) * (TILE_SIZE + TILESET_SPACING);
    // Copy the tile plus a 1 px extruded border of its own edge pixels.
    for (let y = -1; y <= TILE_SIZE; y++) {
      for (let x = -1; x <= TILE_SIZE; x++) {
        const src = tile.get(Math.min(last, Math.max(0, x)), Math.min(last, Math.max(0, y)));
        sheet.set(px + x, py + y, src);
      }
    }
  });
  return sheet;
}

function paletteGpl(): string {
  const lines = Object.entries(PAL).map(
    ([name, [r, g, b]]) =>
      `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${name}`,
  );
  return [
    'GIMP Palette',
    'Name: Reserve Manager',
    'Columns: 8',
    `# ${PLACEHOLDER_MARKER}`,
    ...lines,
    '',
  ].join('\n');
}

writePng('tilesets/terrain.png', buildTileset());
for (const [name, canvas] of Object.entries(drawSprites())) writePng(`sprites/${name}.png`, canvas);
for (const [name, canvas] of Object.entries(drawIcons())) writePng(`ui/${name}.png`, canvas);
writePng('sprites/waterhole.png', drawWaterhole());
for (const [name, canvas] of Object.entries(drawBuildings()))
  writePng(`sprites/${name}.png`, canvas);
writePng('sprites/bucket.png', drawBucket());
writePng('sprites/fx-drop.png', drawDrop());
write('palette.gpl', Buffer.from(paletteGpl()));
console.log(`palette: ${Object.keys(PAL).length} colours`);
