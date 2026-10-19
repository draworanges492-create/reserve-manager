import { describe, expect, it } from 'vitest';
import buildings from '../../src/data/buildings.json';
import waterholes from '../../src/data/waterholes.json';
import zones from '../../src/data/zones.json';
import { checkContent } from '../../tools/data/checks';
import { WORLD_MAP } from '../helpers/newGame';

const content = {
  zones: zones.zones,
  waterholes: waterholes.waterholes,
  buildings: buildings.buildings,
};

describe('content checks', () => {
  it('pass for the shipped data', () => {
    expect(checkContent(content, WORLD_MAP)).toEqual([]);
  });

  it('catch a dangling upgrade reference and an unknown pump kind', () => {
    const broken = {
      ...content,
      buildings: [
        ...content.buildings,
        {
          id: 'x',
          name: 'X',
          slotType: 'pump',
          cost: 1,
          buildDays: 1,
          unlockChapter: 1,
          upgradeOf: 'missing',
          effects: [{ op: 'installPump', pumpKind: 'windmill' }],
        },
      ],
    };
    const errors = checkContent(broken, WORLD_MAP);
    expect(errors.some((e) => e.includes('"missing"'))).toBe(true);
    expect(errors.some((e) => e.includes('"windmill"'))).toBe(true);
  });

  it('catch a waterhole that is not on the map', () => {
    const extra = {
      ...content,
      waterholes: [...content.waterholes, { id: 'w9', name: 'W9', startLevel: 1, type: 'natural' }],
    };
    expect(checkContent(extra, WORLD_MAP)).toContain('waterholes.json: "w9" is not on the map');
  });
});
