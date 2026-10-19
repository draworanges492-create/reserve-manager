import { describe, expect, it } from 'vitest';
import { signed, waterholeTooltip } from '../../src/ui/waterholeTooltip';
import { newGame, withLevel } from '../helpers/newGame';

describe('waterholeTooltip', () => {
  it('explains why the level changes and how to act', () => {
    const state = withLevel(newGame(), 'waterhole_a', 50);
    expect(waterholeTooltip(state, 'waterhole_a')).toEqual([
      'Waterhole A · Muddy · 50/100',
      'Evaporation: −8/day (Dry season ×2)',
      'Overnight change: −8',
      'Dries out in about 6 day(s)', // 50 → 10 after 5 days (still drying), below 10 on day 6
      'Click or hold to refill (+5 each)',
    ]);
  });

  it('says when a waterhole is out of reach', () => {
    expect(waterholeTooltip(newGame(), 'waterhole_b').at(-1)).toBe('Locked until its zone opens');
  });

  it('formats signed numbers with a real minus sign', () => {
    expect([signed(3), signed(-8), signed(0)]).toEqual(['+3', '−8', '0']);
  });
});
