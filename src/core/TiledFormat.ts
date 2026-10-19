// Subset of the Tiled JSON map format (https://doc.mapeditor.org/en/stable/reference/json-map-format/).
export interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool';
  value: string | number | boolean;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  point?: boolean;
  polyline?: { x: number; y: number }[];
  properties?: TiledProperty[];
}

export interface TiledTileLayer {
  id: number;
  name: string;
  type: 'tilelayer';
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
  data: number[];
}

export interface TiledObjectLayer {
  id: number;
  name: string;
  type: 'objectgroup';
  draworder: 'topdown';
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
  objects: TiledObject[];
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  margin: number;
  spacing: number;
  columns: number;
  tilecount: number;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: (TiledTileLayer | TiledObjectLayer)[];
  tilesets: TiledTileset[];
  [extra: string]: unknown;
}

export function prop(obj: TiledObject, name: string): string | number | boolean | undefined {
  return obj.properties?.find((p) => p.name === name)?.value;
}

export const TILE_LAYERS = ['ground', 'water', 'vegetation_deco', 'objects', 'collision'] as const;
export const OBJECT_LAYERS = [
  'zones',
  'waterholes',
  'spawns',
  'build_slots',
  'fence_segments',
  'poacher_entries',
] as const;
export const SLOT_TYPES = ['tower', 'post', 'pump', 'lodge'] as const;
export const SPAWN_KINDS = ['animal', 'visitor', 'staff'] as const;
