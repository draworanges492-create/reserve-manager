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
});
