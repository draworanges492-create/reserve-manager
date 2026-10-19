import Phaser from 'phaser';
import { type ZoneDef, zoneDef } from '../../core/content';

export interface ZoneArea extends ZoneDef {
  rect: Phaser.Geom.Rectangle;
}

/** Reads a Tiled custom property. */
export function objectProp(obj: Phaser.Types.Tilemaps.TiledObject, name: string): unknown {
  const props = obj.properties as { name: string; value: unknown }[] | undefined;
  return props?.find((p) => p.name === name)?.value;
}

export function objectsIn(
  map: Phaser.Tilemaps.Tilemap,
  layer: string,
): Phaser.Types.Tilemaps.TiledObject[] {
  const found = map.getObjectLayer(layer);
  if (!found) throw new Error(`Map is missing object layer "${layer}"`);
  return found.objects;
}

/** Joins map geometry with zone data (names, unlock chapters) from zones.json. */
export function readZones(map: Phaser.Tilemaps.Tilemap): ZoneArea[] {
  return objectsIn(map, 'zones').map((obj) => {
    const id = String(objectProp(obj, 'zoneId'));
    const def = zoneDef(id);
    if (!def) throw new Error(`Zone "${id}" is missing from zones.json`);
    const rect = new Phaser.Geom.Rectangle(obj.x ?? 0, obj.y ?? 0, obj.width ?? 0, obj.height ?? 0);
    return { ...def, rect };
  });
}
