// Validates JSON content (spec §2): every file in src/data parses, and the map
// agrees with the data (zone ids, layer names, cross-references).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkMap, type ZoneDef } from './map/checks';
import type { TiledMap } from './map/tiled';

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

const zones = (parsed.get(join(DATA_DIR, 'zones.json')) as { zones: ZoneDef[] } | undefined)?.zones;
const map = parsed.get(MAP_FILE) as TiledMap | undefined;
if (zones && map) errors.push(...checkMap(map, zones));

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`validate-data: ${parsed.size} file(s) OK`);
