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
  return { zones, waterholes, slots };
}
