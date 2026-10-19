import { describe, expect, it } from 'vitest';
import { pickSpot, spriteCountFor, stepToward } from '../../src/entities/herdMath';

describe('spriteCountFor', () => {
  it('draws one sprite per animal up to the cap', () => {
    expect(spriteCountFor(3, 12)).toBe(3);
    expect(spriteCountFor(80, 12)).toBe(12);
    expect(spriteCountFor(0, 12)).toBe(0);
  });
});

describe('pickSpot', () => {
  const area = { x: 0, y: 0, w: 100, h: 100 };
  let seed = 0.1;
  const random = (): number => (seed = (seed * 9301 + 0.49297) % 1);

  it('stays inside the area and near the centre', () => {
    for (let i = 0; i < 50; i++) {
      const p = pickSpot({ x: 50, y: 50 }, 20, area, () => false, random);
      expect(p).not.toBeNull();
      if (!p) return;
      expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThanOrEqual(21);
    }
  });

  it('avoids blocked ground and gives up when everything is blocked', () => {
    const p = pickSpot({ x: 50, y: 50 }, 20, area, (x) => x < 50, random);
    expect(p && p.x >= 50).toBe(true);
    expect(pickSpot({ x: 50, y: 50 }, 20, area, () => true, random)).toBeNull();
  });
});

describe('stepToward', () => {
  it('moves by the step and reports arrival', () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 3)).toEqual({ x: 3, y: 0, arrived: false });
    expect(stepToward({ x: 9, y: 0 }, { x: 10, y: 0 }, 3)).toEqual({ x: 10, y: 0, arrived: true });
  });
});
