import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/Rng';
import { isDegraded, runVegetation, vegetationBreakdown } from '../../src/sim/Vegetation';
import { newGame, withPopulation, withVegetation, must } from '../helpers/newGame';

const empty = (state = newGame()) =>
  withPopulation(
    withPopulation(withPopulation(state, 'plains', 'impala', 0), 'plains', 'zebra', 0),
    'plains',
    'lion',
    0,
  );
const wet = (state = newGame()) => ({ ...state, clock: { ...state.clock, day: 30 } });

describe('vegetationBreakdown (spec §6.2)', () => {
  it('regrows faster the barer the ground, scaled by season', () => {
    // 1.5 × dry 0.4 × (100 − 55)/100 = 0.27
    expect(vegetationBreakdown(empty(), 'plains').regrowth).toBeCloseTo(0.27, 5);
    // 1.5 × wet 1.5 × 0.45 = 1.0125
    expect(vegetationBreakdown(wet(empty()), 'plains').regrowth).toBeCloseTo(1.0125, 5);
    expect(vegetationBreakdown(withVegetation(empty(), 'plains', 100), 'plains').regrowth).toBe(0);
  });

  it('counts grazers and browsers only, spread over the zone area', () => {
    // 80 impala × 0.02 + 24 zebra × 0.04 + 6 elephants × 0.2 = 3.76; predators don't graze.
    const state = newGame();
    const expected = (3.76 * 250) / must(state.zones.plains).area;
    expect(vegetationBreakdown(state, 'plains').grazing).toBeCloseTo(expected, 5);
  });
});

describe('runVegetation', () => {
  it('applies the change, clamps, and reports crossing the degraded line', () => {
    const start = withVegetation(newGame(), 'plains', 25.1);
    const crowded = withPopulation(start, 'plains', 'impala', 2000);
    const { state, events } = runVegetation(crowded, new Rng(1));
    expect(must(state.zones.plains).vegetation).toBeLessThan(25);
    expect(isDegraded(must(state.zones.plains).vegetation)).toBe(true);
    expect(events).toContainEqual({
      type: 'zoneDegradedChanged',
      payload: { zoneId: 'plains', degraded: true },
    });

    const stripped = runVegetation(
      withPopulation(start, 'plains', 'impala', 100000),
      new Rng(1),
    ).state;
    expect(must(stripped.zones.plains).vegetation).toBe(0);
  });
});
