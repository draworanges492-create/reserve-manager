// Structural and cross-reference checks for reserve.tmj, used by validate-data and tests.
import {
  OBJECT_LAYERS,
  prop,
  SLOT_TYPES,
  SPAWN_KINDS,
  TILE_LAYERS,
  type TiledMap,
  type TiledObject,
  type TiledObjectLayer,
  type TiledTileLayer,
} from '../../src/core/TiledFormat';

export interface ZoneDef {
  id: string;
  name: string;
  unlockChapter: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const boxOf = (o: TiledObject): Box => ({ x: o.x, y: o.y, w: o.width, h: o.height });
const contains = (b: Box, x: number, y: number): boolean =>
  x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function checkMap(map: TiledMap, zoneDefs: ZoneDef[]): string[] {
  const errors: string[] = [];
  const fail = (msg: string): void => {
    errors.push(`reserve.tmj: ${msg}`);
  };

  const tileLayer = (name: string): TiledTileLayer | undefined =>
    map.layers.find((l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === name);
  const objectLayer = (name: string): TiledObject[] =>
    map.layers.find((l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === name)
      ?.objects ?? [];

  if (map.width !== 120 || map.height !== 80)
    fail(`size must be 120×80, got ${map.width}×${map.height}`);

  const tileCount = map.tilesets.reduce((n, t) => Math.max(n, t.firstgid + t.tilecount - 1), 0);
  for (const name of TILE_LAYERS) {
    const layer = tileLayer(name);
    if (!layer) {
      fail(`missing tile layer "${name}"`);
      continue;
    }
    if (layer.data.length !== map.width * map.height) fail(`layer "${name}" has wrong data length`);
    if (layer.data.some((g) => g < 0 || g > tileCount))
      fail(`layer "${name}" uses unknown tile ids`);
  }
  for (const name of OBJECT_LAYERS) {
    if (!map.layers.some((l) => l.type === 'objectgroup' && l.name === name))
      fail(`missing object layer "${name}"`);
  }

  // Zones: every map zone has data, every data zone is on the map, no overlaps, in bounds.
  const mapW = map.width * map.tilewidth;
  const mapH = map.height * map.tileheight;
  const zones = objectLayer('zones');
  const zoneBoxes = new Map<string, Box>();
  for (const z of zones) {
    const id = String(prop(z, 'zoneId') ?? '');
    if (!zoneDefs.some((d) => d.id === id)) fail(`zone "${id}" has no entry in zones.json`);
    if (zoneBoxes.has(id)) fail(`zone "${id}" appears twice`);
    const box = boxOf(z);
    if (box.x < 0 || box.y < 0 || box.x + box.w > mapW || box.y + box.h > mapH)
      fail(`zone "${id}" is outside the map`);
    for (const [otherId, other] of zoneBoxes)
      if (overlaps(box, other)) fail(`zones "${id}" and "${otherId}" overlap`);
    zoneBoxes.set(id, box);
  }
  for (const d of zoneDefs)
    if (!zoneBoxes.has(d.id)) fail(`zones.json zone "${d.id}" is not on the map`);

  // Zones tile the whole map (no unzoned gaps), so a locked zone always borders open ground.
  const covered = [...zoneBoxes.values()].reduce((sum, b) => sum + b.w * b.h, 0);
  if (covered !== mapW * mapH) fail('zones must cover the whole map with no gaps');

  // At every chapter, the open zones form one connected area (DECISIONS D43).
  const touches = (a: Box, b: Box): boolean => {
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const sideBySide = (a.x + a.w === b.x || b.x + b.w === a.x) && overlapY > 0;
    const stacked = (a.y + a.h === b.y || b.y + b.h === a.y) && overlapX > 0;
    return sideBySide || stacked;
  };
  const chapters = [...new Set(zoneDefs.map((d) => d.unlockChapter))].sort((a, b) => a - b);
  for (const chapter of chapters) {
    const open = zoneDefs.filter((d) => d.unlockChapter <= chapter && zoneBoxes.has(d.id));
    const first = open[0];
    if (!first) continue;
    const reached = new Set([first.id]);
    for (let grew = true; grew;) {
      grew = false;
      for (const z of open) {
        const box = zoneBoxes.get(z.id);
        if (reached.has(z.id) || !box) continue;
        const linked = [...reached].some((id) => {
          const other = zoneBoxes.get(id);
          return other !== undefined && touches(box, other);
        });
        if (linked) {
          reached.add(z.id);
          grew = true;
        }
      }
    }
    const cut = open.filter((z) => !reached.has(z.id)).map((z) => z.id);
    if (cut.length)
      fail(`by chapter ${chapter}, zones ${cut.join(', ')} don't border the open area`);
  }

  const zoneContaining = (x: number, y: number): string | null => {
    for (const [id, box] of zoneBoxes) if (contains(box, x, y)) return id;
    return null;
  };
  const checkInZone = (o: TiledObject, what: string): void => {
    const zoneId = String(prop(o, 'zoneId') ?? '');
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    if (zoneContaining(cx, cy) !== zoneId)
      fail(`${what} "${o.name}" is not inside zone "${zoneId}"`);
  };

  const unique = (objects: TiledObject[], key: string, what: string): void => {
    const seen = new Set<string>();
    for (const o of objects) {
      const id = String(prop(o, key) ?? '');
      if (!id) fail(`${what} "${o.name}" has no ${key}`);
      if (seen.has(id)) fail(`duplicate ${key} "${id}"`);
      seen.add(id);
    }
  };

  const waterholes = objectLayer('waterholes');
  unique(waterholes, 'waterholeId', 'waterhole');
  waterholes.forEach((w) => checkInZone(w, 'waterhole'));

  const slots = objectLayer('build_slots');
  unique(slots, 'slotId', 'build slot');
  for (const s of slots) {
    const type = String(prop(s, 'slotType'));
    if (!(SLOT_TYPES as readonly string[]).includes(type))
      fail(`build slot "${s.name}" has bad slotType "${type}"`);
    checkInZone(s, 'build slot');
  }

  const fences = objectLayer('fence_segments');
  unique(fences, 'segmentId', 'fence segment');
  for (const f of fences) {
    if (!zoneBoxes.has(String(prop(f, 'zoneId')))) fail(`fence "${f.name}" has unknown zoneId`);
    if (!f.polyline || f.polyline.length < 2) fail(`fence "${f.name}" is not a polyline`);
  }

  for (const s of objectLayer('spawns')) {
    const kind = String(prop(s, 'kind'));
    if (!(SPAWN_KINDS as readonly string[]).includes(kind))
      fail(`spawn "${s.name}" has bad kind "${kind}"`);
  }
  for (const p of objectLayer('poacher_entries')) {
    if (p.x < 0 || p.y < 0 || p.x > mapW || p.y > mapH)
      fail(`poacher entry "${p.name}" is off the map`);
  }

  return errors;
}
