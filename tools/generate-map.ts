// Writes public/assets/maps/reserve.tmj (spec §5) from tools/map/layout.ts.
// Refuses to overwrite without --force, because that would discard edits made in Tiled.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  BUILD_SLOTS,
  GATE_SPAN,
  MAP_HEIGHT,
  MAP_WIDTH,
  POACHER_ENTRIES,
  SPAWNS,
  WATERHOLES,
  ZONES,
  type Point,
} from './map/layout';
import { buildTerrain } from './map/terrain';
import {
  OBJECT_LAYERS,
  TILE_LAYERS,
  type TiledMap,
  type TiledObject,
  type TiledObjectLayer,
  type TiledProperty,
  type TiledTileLayer,
} from '../src/core/TiledFormat';
import {
  TILE_NAMES,
  TILE_SIZE as T,
  TILESET_COLUMNS,
  TILESET_MARGIN,
  TILESET_NAME,
  TILESET_SPACING,
  tilesetSize,
} from './tileset';

const OUT = join(import.meta.dirname, '..', 'public', 'assets', 'maps', 'reserve.tmj');

if (existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(
    'reserve.tmj already exists. Re-run with --force to overwrite (discards Tiled edits).',
  );
  process.exit(1);
}

let nextObjectId = 1;
const props = (values: Record<string, string>): TiledProperty[] =>
  Object.entries(values).map(([name, value]) => ({ name, type: 'string', value }));

function obj(fields: Partial<TiledObject> & Pick<TiledObject, 'x' | 'y'>): TiledObject {
  return {
    id: nextObjectId++,
    name: '',
    type: '',
    width: 0,
    height: 0,
    rotation: 0,
    visible: true,
    ...fields,
  };
}
const centerOf = (p: Point): { x: number; y: number } => ({
  x: (p.x + 0.5) * T,
  y: (p.y + 0.5) * T,
});
const point = (p: Point, name: string, type: string, values: Record<string, string>): TiledObject =>
  obj({ ...centerOf(p), name, type, point: true, properties: props(values) });

function fenceSegments(): TiledObject[] {
  const segments: TiledObject[] = [];
  const line = (
    id: string,
    zoneId: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void => {
    segments.push(
      obj({
        x: x0 * T,
        y: y0 * T,
        name: id,
        type: 'fence',
        polyline: [
          { x: 0, y: 0 },
          { x: (x1 - x0) * T, y: (y1 - y0) * T },
        ],
        properties: props({ segmentId: id, zoneId }),
      }),
    );
  };
  for (const [zoneId, r] of Object.entries(ZONES)) {
    const [left, top, right, bottom] = [r.x, r.y, r.x + r.w, r.y + r.h];
    line(`${zoneId}_n`, zoneId, left, top, right, top);
    line(`${zoneId}_e`, zoneId, right, top, right, bottom);
    line(`${zoneId}_w`, zoneId, left, top, left, bottom);
    if (zoneId === 'hq') {
      line('hq_s_w', zoneId, left, bottom, GATE_SPAN.from, bottom);
      line('hq_gate', zoneId, GATE_SPAN.from, bottom, GATE_SPAN.to, bottom);
      line('hq_s_e', zoneId, GATE_SPAN.to, bottom, right, bottom);
    } else {
      line(`${zoneId}_s`, zoneId, left, bottom, right, bottom);
    }
  }
  return segments;
}

const terrain = buildTerrain();
let layerId = 1;
const tileLayer = (name: (typeof TILE_LAYERS)[number]): TiledTileLayer => ({
  id: layerId++,
  name,
  type: 'tilelayer',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  x: 0,
  y: 0,
  opacity: 1,
  visible: name !== 'collision',
  data: terrain[name],
});

const objectsByLayer: Record<(typeof OBJECT_LAYERS)[number], TiledObject[]> = {
  zones: Object.entries(ZONES).map(([zoneId, r]) =>
    obj({
      x: r.x * T,
      y: r.y * T,
      width: r.w * T,
      height: r.h * T,
      name: zoneId,
      type: 'zone',
      properties: props({ zoneId }),
    }),
  ),
  waterholes: WATERHOLES.map((w) =>
    point(w.at, w.id, 'waterhole', { waterholeId: w.id, zoneId: w.zoneId }),
  ),
  spawns: SPAWNS.map((s, i) =>
    point(s.at, `${s.kind}_${i}`, 'spawn', {
      kind: s.kind,
      ...(s.species ? { species: s.species } : {}),
    }),
  ),
  build_slots: BUILD_SLOTS.map((s) =>
    obj({
      x: s.rect.x * T,
      y: s.rect.y * T,
      width: s.rect.w * T,
      height: s.rect.h * T,
      name: s.id,
      type: 'build_slot',
      properties: props({ slotId: s.id, slotType: s.slotType, zoneId: s.zoneId }),
    }),
  ),
  fence_segments: fenceSegments(),
  poacher_entries: POACHER_ENTRIES.map((p, i) => point(p, `entry_${i}`, 'poacher_entry', {})),
};

const objectLayer = (name: (typeof OBJECT_LAYERS)[number]): TiledObjectLayer => ({
  id: layerId++,
  name,
  type: 'objectgroup',
  draworder: 'topdown',
  x: 0,
  y: 0,
  opacity: 1,
  visible: true,
  objects: objectsByLayer[name],
});

const sheet = tilesetSize();
const map: TiledMap = {
  compressionlevel: -1,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.11.0',
  type: 'map',
  version: '1.10',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tilewidth: T,
  tileheight: T,
  properties: props({ generatedBy: 'tools/generate-map.ts' }),
  layers: [...TILE_LAYERS.map(tileLayer), ...OBJECT_LAYERS.map(objectLayer)],
  nextlayerid: layerId,
  nextobjectid: nextObjectId,
  tilesets: [
    {
      firstgid: 1,
      name: TILESET_NAME,
      image: '../tilesets/terrain.png',
      imagewidth: sheet.width,
      imageheight: sheet.height,
      tilewidth: T,
      tileheight: T,
      margin: TILESET_MARGIN,
      spacing: TILESET_SPACING,
      columns: TILESET_COLUMNS,
      tilecount: TILE_NAMES.length,
    },
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map));
console.log(
  `wrote public/assets/maps/reserve.tmj (${MAP_WIDTH}×${MAP_HEIGHT}, ${nextObjectId - 1} objects)`,
);
