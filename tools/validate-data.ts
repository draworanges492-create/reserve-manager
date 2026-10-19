// Validates JSON content (spec §2): every file in src/data parses, the map agrees with the
// data, and content files reference each other correctly.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { TiledMap } from '../src/core/TiledFormat';
import { checkContent, type Content } from './data/checks';
import { checkMap, type ZoneDef } from './map/checks';

const ROOT = join(import.meta.dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const MAP_FILE = join(ROOT, 'public', 'assets', 'maps', 'reserve.tmj');

function listJson(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listJson(path);
    return name.endsWith('.json') ? [path] : [];
  });
}

const errors: string[] = [];
const parsed = new Map<string, unknown>();
for (const file of [...listJson(DATA_DIR), MAP_FILE]) {
  try {
    parsed.set(file, JSON.parse(readFileSync(file, 'utf8')));
  } catch (err) {
    errors.push(`${file}: ${(err as Error).message}`);
  }
}

const data = <T>(name: string, key: string): T | undefined =>
  (parsed.get(join(DATA_DIR, name)) as Record<string, T> | undefined)?.[key];
const zones = data<ZoneDef[]>('zones.json', 'zones');
const waterholes = data<Content['waterholes']>('waterholes.json', 'waterholes');
const buildings = data<Content['buildings']>('buildings.json', 'buildings');
const map = parsed.get(MAP_FILE) as TiledMap | undefined;

if (zones && map) errors.push(...checkMap(map, zones));
if (zones && waterholes && buildings && map) {
  errors.push(...checkContent({ zones, waterholes, buildings }, map));
} else if (errors.length === 0) {
  errors.push('zones.json, waterholes.json, buildings.json and reserve.tmj must all exist');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`validate-data: ${parsed.size} file(s) OK`);
