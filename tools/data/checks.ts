// Content checks for src/data JSON: ids, ranges and cross-references between files.
import assets from '../../src/config/assets.json';
import { BALANCE } from '../../src/config/balance';
import type { SpeciesDef } from '../../src/core/content';
import { prop, SLOT_TYPES, type TiledMap, type TiledObjectLayer } from '../../src/core/TiledFormat';

export interface Content {
  zones: { id: string; unlockChapter: number }[];
  waterholes: { id: string; name: string; startLevel: number; type: string }[];
  buildings: {
    id: string;
    name: string;
    slotType: string;
    cost: number;
    buildDays: number;
    unlockChapter: number;
    upgradeOf?: string;
    effects: { op: string; pumpKind?: string }[];
  }[];
  species: SpeciesDef[];
  staffRoles: {
    id: string;
    name: string;
    wage: number;
    unlockChapter: number;
    spriteKey: string;
  }[];
}

const DIETS = ['grazer', 'browser', 'predator', 'scavenger'];

/** Effect ops buildings may use (grows with later phases). */
const BUILDING_EFFECT_OPS = ['installPump', 'patrolBoost'];

export function checkContent(content: Content, map: TiledMap): string[] {
  const errors: string[] = [];
  const fail = (file: string, msg: string): void => {
    errors.push(`${file}: ${msg}`);
  };
  const duplicates = (ids: string[]): string[] => ids.filter((id, i) => ids.indexOf(id) !== i);

  for (const z of content.zones) {
    if (!(z.unlockChapter >= 1)) fail('zones.json', `zone "${z.id}" needs unlockChapter ≥ 1`);
  }

  // Waterholes: data and map must list the same ids.
  const mapHoles =
    map.layers
      .find((l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === 'waterholes')
      ?.objects.map((o) => String(prop(o, 'waterholeId'))) ?? [];
  const dataHoles = content.waterholes.map((w) => w.id);
  for (const id of duplicates(dataHoles)) fail('waterholes.json', `duplicate id "${id}"`);
  for (const id of dataHoles)
    if (!mapHoles.includes(id)) fail('waterholes.json', `"${id}" is not on the map`);
  for (const id of mapHoles)
    if (!dataHoles.includes(id)) fail('waterholes.json', `map waterhole "${id}" has no entry`);
  for (const w of content.waterholes) {
    if (w.startLevel < 0 || w.startLevel > BALANCE.water.maxLevel)
      fail('waterholes.json', `"${w.id}" startLevel must be 0–${BALANCE.water.maxLevel}`);
    if (w.type !== 'natural' && w.type !== 'pumped')
      fail('waterholes.json', `"${w.id}" has bad type "${w.type}"`);
  }

  // Buildings.
  const buildingIds = content.buildings.map((b) => b.id);
  for (const id of duplicates(buildingIds)) fail('buildings.json', `duplicate id "${id}"`);
  const pumpKinds = Object.keys(BALANCE.water.pumpRefillPerDay);
  for (const b of content.buildings) {
    if (!(SLOT_TYPES as readonly string[]).includes(b.slotType))
      fail('buildings.json', `"${b.id}" has bad slotType "${b.slotType}"`);
    if (!(b.cost > 0)) fail('buildings.json', `"${b.id}" needs a positive cost`);
    if (!(b.buildDays > 0)) fail('buildings.json', `"${b.id}" needs buildDays > 0`);
    if (!(b.unlockChapter >= 1)) fail('buildings.json', `"${b.id}" needs unlockChapter ≥ 1`);
    if (b.upgradeOf && !buildingIds.includes(b.upgradeOf))
      fail('buildings.json', `"${b.id}" upgrades unknown building "${b.upgradeOf}"`);
    for (const e of b.effects) {
      if (!BUILDING_EFFECT_OPS.includes(e.op))
        fail('buildings.json', `"${b.id}" has unknown effect op "${e.op}"`);
      if (e.op === 'installPump' && !pumpKinds.includes(e.pumpKind ?? ''))
        fail('buildings.json', `"${b.id}" installs unknown pumpKind "${e.pumpKind}"`);
    }
  }
  // Staff roles.
  const roleIds = content.staffRoles.map((r) => r.id);
  for (const id of duplicates(roleIds)) fail('staff.json', `duplicate id "${id}"`);
  for (const r of content.staffRoles) {
    if (!(r.wage >= 0)) fail('staff.json', `"${r.id}" needs a wage ≥ 0`);
    if (!(r.unlockChapter >= 1)) fail('staff.json', `"${r.id}" needs unlockChapter ≥ 1`);
    if (!(r.spriteKey in assets.spritesheets))
      fail('staff.json', `"${r.id}" spriteKey "${r.spriteKey}" is not in assets.json`);
  }

  // Species.
  const speciesIds = content.species.map((sp) => sp.id);
  const zoneIds = content.zones.map((z) => z.id);
  for (const id of duplicates(speciesIds)) fail('species.json', `duplicate id "${id}"`);
  for (const sp of content.species) {
    const where = `"${sp.id}"`;
    if (!DIETS.includes(sp.diet)) fail('species.json', `${where} has bad diet "${sp.diet}"`);
    if (!(sp.r >= 0)) fail('species.json', `${where} needs r ≥ 0`);
    if (!(sp.minViable >= 1)) fail('species.json', `${where} needs minViable ≥ 1`);
    for (const zoneId of Object.keys(sp.startPopulation))
      if (!zoneIds.includes(zoneId))
        fail('species.json', `${where} starts in unknown zone "${zoneId}"`);
    for (const other of [...sp.predators, ...sp.prey])
      if (!speciesIds.includes(other))
        fail('species.json', `${where} references unknown species "${other}"`);
    if (!(sp.spriteKey in assets.spritesheets))
      fail('species.json', `${where} spriteKey "${sp.spriteKey}" is not in assets.json`);
    // Spec §0 rule 8: a fact may only be marked verified once real text replaces the TODO.
    for (const fact of sp.facts)
      if (fact.verified && fact.text.includes('TODO'))
        fail('species.json', `${where} has a "verified" fact that still says TODO`);
  }
  return errors;
}
