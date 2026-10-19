// Validates JSON content (spec §2): every file in src/data parses, the map agrees with the
// data, and content files reference each other correctly.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { TiledMap } from '../src/core/TiledFormat';
import { checkContent, type Content } from './data/checks';
import { checkStory, type StoryContent } from './data/storyChecks';
import { prop, type TiledObjectLayer } from '../src/core/TiledFormat';
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
const species = data<Content['species']>('species.json', 'species');
const staffRoles = data<Content['staffRoles']>('staff.json', 'roles');
const map = parsed.get(MAP_FILE) as TiledMap | undefined;

if (zones && map) errors.push(...checkMap(map, zones));
if (zones && waterholes && buildings && species && staffRoles && map) {
  errors.push(...checkContent({ zones, waterholes, buildings, species, staffRoles }, map));
} else if (errors.length === 0) {
  errors.push('zones, waterholes, buildings, species JSON and reserve.tmj must all exist');
}

// Story: dialogue graphs, chapters, journal (spec §9).
const dialogues = [...parsed.entries()]
  .filter(([file]) => file.includes(`${join('data', 'dialogue')}`))
  .flatMap(([, json]) => (json as { dialogues: StoryContent['dialogues'] }).dialogues);
const chapters = data<StoryContent['chapters']>('chapters.json', 'chapters');
const characters = data<StoryContent['characters']>('characters.json', 'characters');
const journal = data<StoryContent['journal']>('journal.json', 'entries');
if (
  zones &&
  buildings &&
  species &&
  staffRoles &&
  waterholes &&
  map &&
  chapters &&
  characters &&
  journal
) {
  const objects = (name: string) =>
    map.layers.find((l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === name)
      ?.objects ?? [];
  const zoneRects = new Map(
    objects('zones').map((o) => [
      String(prop(o, 'zoneId')),
      {
        x: o.x / map.tilewidth,
        y: o.y / map.tileheight,
        w: o.width / map.tilewidth,
        h: o.height / map.tileheight,
      },
    ]),
  );
  errors.push(
    ...checkStory(
      { dialogues, chapters, characters, journal },
      {
        zones: zones.map((z) => ({ ...z, rect: zoneRects.get(z.id) })),
        species: species.map((s) => s.id),
        buildings,
        staffRoles,
        waterholes: waterholes.map((w) => w.id),
        fences: objects('fence_segments').map((o) => String(prop(o, 'segmentId'))),
        events: [],
      },
    ),
  );
} else if (errors.length === 0) {
  errors.push('chapters.json, characters.json and journal.json must exist');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`validate-data: ${parsed.size} file(s) OK`);
