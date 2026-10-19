import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkMap } from '../../tools/map/checks';
import type { TiledMap, TiledObjectLayer } from '../../src/core/TiledFormat';
import zonesData from '../../src/data/zones.json';

const map = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../public/assets/maps/reserve.tmj'), 'utf8'),
) as TiledMap;

describe('reserve.tmj', () => {
  it('passes all structural and cross-reference checks', () => {
    expect(checkMap(map, zonesData.zones)).toEqual([]);
  });

  it('has the seven zones from the spec', () => {
    const zones = map.layers.find(
      (l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === 'zones',
    );
    expect(zones?.objects.map((o) => o.name).sort()).toEqual([
      'east_border',
      'hq',
      'north',
      'outcrop',
      'plains',
      'river',
      'woodland',
    ]);
  });

  it('reports a dangling zone reference', () => {
    const broken = { ...map, layers: map.layers.map((l) => ({ ...l })) } as TiledMap;
    const errors = checkMap(
      broken,
      zonesData.zones.filter((z) => z.id !== 'north'),
    );
    expect(errors.some((e) => e.includes('"north"'))).toBe(true);
  });

  it('reports a zone that would open with a gap to the playable area', () => {
    // Opening the outcrop in Chapter 1 while the plains wait until Chapter 2 leaves the
    // outcrop cut off from the HQ, the only other Chapter 1 zone.
    const defs = zonesData.zones.map((z) =>
      z.id === 'outcrop'
        ? { ...z, unlockChapter: 1 }
        : z.id === 'plains'
          ? { ...z, unlockChapter: 2 }
          : z,
    );
    expect(checkMap(map, defs)).toContain(
      "reserve.tmj: by chapter 1, zones outcrop don't border the open area",
    );
  });
});
