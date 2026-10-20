import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import type { GameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { BORDER_FENCE, raidChance, runCropRaids } from '../../src/sim/CropRaids';
import { must, newGame, withPopulation, withVegetation } from '../helpers/newGame';

const active = (extra: Partial<GameState> = {}): GameState => {
  const s = newGame();
  return { ...s, ...extra, flags: { ...s.flags, raids_active: true, ...extra.flags } };
};

describe('crop raids (D111)', () => {
  it('only happen once the story turns them on, and need elephants nearby', () => {
    expect(raidChance(newGame())).toBe(0);
    expect(raidChance(withPopulation(active(), 'plains', 'elephant', 0))).toBe(0);
  });

  it('the first raid is certain; later ones are a daily chance with a cooldown', () => {
    expect(raidChance(active())).toBe(1);
    const later = active({ counters: { cropRaids: 1, lastRaidDay: 0 } });
    expect(raidChance(later)).toBe(0); // cooldown
    const ready = { ...later, clock: { ...later.clock, day: BALANCE.cropRaids.cooldownDays } };
    expect(raidChance(ready)).toBeCloseTo(BALANCE.cropRaids.baseChance, 6);
    expect(raidChance(withVegetation(ready, 'plains', 20))).toBeCloseTo(
      BALANCE.cropRaids.baseChance * BALANCE.cropRaids.hungryMult,
      6,
    );
  });

  it('a mended border fence slows raids; a beehive fence nearly stops them', () => {
    const base = active({ counters: { cropRaids: 1, lastRaidDay: -10 } });
    const fence = {
      ...base,
      fences: {
        ...base.fences,
        [BORDER_FENCE]: { ...must(base.fences[BORDER_FENCE]), status: 'intact' as const },
      },
    };
    expect(raidChance(fence)).toBeCloseTo(
      BALANCE.cropRaids.baseChance * BALANCE.cropRaids.fenceMult,
      6,
    );
    const hives = {
      ...base,
      slots: {
        ...base.slots,
        beehive_east: {
          ...must(base.slots.beehive_east),
          building: { buildingId: 'beehive_fence', daysLeft: 0 },
        },
      },
    };
    expect(raidChance(hives)).toBeCloseTo(BALANCE.cropRaids.baseChance * 0.1, 6);
  });

  it('cost trust, or money with the compensation policy', () => {
    const raided = runCropRaids(active(), new Rng(1));
    expect(raided.state.scores.trust).toBe(newGame().scores.trust - BALANCE.cropRaids.trustLoss);
    expect(raided.state.counters.cropRaids).toBe(1);
    expect(raided.state.flags.crop_raid_happened).toBe(true);
    const paid = runCropRaids(active({ flags: { policy_compensation: true } }), new Rng(1)).state;
    expect(paid.resources.money).toBe(
      newGame().resources.money - BALANCE.cropRaids.compensationCost,
    );
    expect(paid.scores.trust).toBe(newGame().scores.trust - BALANCE.cropRaids.compensatedTrustLoss);
  });
});
