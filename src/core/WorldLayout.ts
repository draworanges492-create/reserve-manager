// Static geometry read from the Tiled map: zone rectangles and waterhole positions,
// in tiles. The map is the source of truth for "where"; src/data holds "what".
import { prop, type TiledMap, type TiledObject, type TiledObjectLayer } from './TiledFormat';

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldLayout {
  zones: Record<string, TileRect>;
  /** Waterhole centres in tiles (fractional: a point in the middle of a tile is x + 0.5). */
  waterholes: Record<string, { zoneId: string; x: number; y: number }>;
  /** Places buildings can go (spec §5 build_slots), in tiles. */
  slots: Record<string, { slotType: string; zoneId: string; rect: TileRect; waterholeId?: string }>;
  /** Fence segments: owning zone, the zone across the fence (null = map edge), and ends in tiles. */
  fences: Record<string, { zoneId: string; borders: string | null; from: Point; to: Point }>;
}

export interface Point {
  x: number;
  y: number;
}

/** Zone containing a tile point, or null outside every zone. */
function zoneAt(zones: WorldLayout['zones'], x: number, y: number): string | null {
  for (const [id, r] of Object.entries(zones))
    if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return id;
  return null;
}

function objects(map: TiledMap, name: string): TiledObject[] {
  const layer = map.layers.find(
    (l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === name,
  );
  if (!layer) throw new Error(`Map is missing object layer "${name}"`);
  return layer.objects;
}

export function readWorldLayout(map: TiledMap): WorldLayout {
  const tw = map.tilewidth;
  const th = map.tileheight;
  const zones: WorldLayout['zones'] = {};
  for (const o of objects(map, 'zones')) {
    zones[String(prop(o, 'zoneId'))] = {
      x: o.x / tw,
      y: o.y / th,
      w: o.width / tw,
      h: o.height / th,
    };
  }
  const waterholes: WorldLayout['waterholes'] = {};
  for (const o of objects(map, 'waterholes')) {
    waterholes[String(prop(o, 'waterholeId'))] = {
      zoneId: String(prop(o, 'zoneId')),
      x: o.x / tw,
      y: o.y / th,
    };
  }
  const slots: WorldLayout['slots'] = {};
  for (const o of objects(map, 'build_slots')) {
    const waterholeId = prop(o, 'waterholeId');
    slots[String(prop(o, 'slotId'))] = {
      slotType: String(prop(o, 'slotType')),
      zoneId: String(prop(o, 'zoneId')),
      rect: { x: o.x / tw, y: o.y / th, w: o.width / tw, h: o.height / th },
      ...(waterholeId ? { waterholeId: String(waterholeId) } : {}),
    };
  }
  const fences: WorldLayout['fences'] = {};
  for (const o of objects(map, 'fence_segments')) {
    const [a, b] = o.polyline ?? [];
    if (!a || !b) continue;
    const from = { x: (o.x + a.x) / tw, y: (o.y + a.y) / th };
    const to = { x: (o.x + b.x) / tw, y: (o.y + b.y) / th };
    const zoneId = String(prop(o, 'zoneId'));
    // Probe half a tile either side of the fence's midpoint; the side that isn't the owner
    // is what the fence borders.
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const horizontal = from.y === to.y;
    const sides = horizontal
      ? [zoneAt(zones, mx, my - 0.5), zoneAt(zones, mx, my + 0.5)]
      : [zoneAt(zones, mx - 0.5, my), zoneAt(zones, mx + 0.5, my)];
    const borders = sides.find((z) => z !== zoneId) ?? null;
    fences[String(prop(o, 'segmentId'))] = { zoneId, borders, from, to };
  }
  return { zones, waterholes, slots, fences };
}
