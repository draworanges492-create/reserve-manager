import { describe, expect, it } from 'vitest';
import { speciesDef } from '../../src/core/content';
import { Rng } from '../../src/core/Rng';
import {
  carryingCapacity,
  killsPerPredator,
  runPopulation,
  stochasticRound,
} from '../../src/sim/Population';
import { runDayTick } from '../../src/sim/tick';
import { runBalance } from '../../tools/sim-balance';
import { newGame, withLevel, withPopulation, withVegetation, must } from '../helpers/newGame';

const impala = must(speciesDef('impala'));
const lion = must(speciesDef('lion'));
const only = (species: string, n: number, state = newGame()) => {
  let s = state;
  for (const id of ['impala', 'zebra', 'lion'])
    s = withPopulation(s, 'plains', id, id === species ? n : 0);
  return s;
};
const watered = (state = newGame()) => withLevel(state, 'waterhole_a', 80);
const days = (state: ReturnType<typeof newGame>, n: number) => {
  for (let i = 0; i < n; i++) state = runPopulation(state, new Rng(i)).state;
  return state;
};

describe('carryingCapacity (spec §6.3)', () => {
  it('scales with area, density, vegetation and water', () => {
    const area = must(newGame().zones.plains).area;
    const withWater = carryingCapacity(watered(), 'plains', impala);
    expect(withWater).toBeCloseTo(area * 0.12 * 0.55, 5);
    expect(carryingCapacity(newGame(), 'plains', impala)).toBeCloseTo(withWater * 0.3, 5); // A dry
    expect(carryingCapacity(withVegetation(watered(), 'plains', 0), 'plains', impala)).toBe(0);
  });

  it('for predators, follows the prey available', () => {
    expect(carryingCapacity(newGame(), 'plains', lion)).toBeCloseTo((80 + 24) * 0.04, 5);
  });
});

describe('population dynamics', () => {
  it('grows toward capacity when below it', () => {
    const start = watered(only('impala', 40));
    const after = days(start, 60);
    const k = carryingCapacity(start, 'plains', impala);
    expect(must(after.populations.plains?.impala)).toBeGreaterThan(80);
    expect(must(after.populations.plains?.impala)).toBeLessThanOrEqual(Math.ceil(k * 1.1));
  });

  it('dies off when above capacity, and logs starvation', () => {
    const { state } = runPopulation(only('impala', 300), new Rng(1)); // K ≈ 34 without water
    expect(must(state.populations.plains?.impala)).toBeLessThan(300);
    expect(must(state.populationLog.plains?.impala).starved).toBeGreaterThan(0);
  });

  it('does not breed below the minimum viable size (Allee effect)', () => {
    const after = days(watered(only('impala', 5)), 100);
    expect(must(after.populations.plains).impala).toBeLessThanOrEqual(5);
  });

  it('loses prey to predators, and hunting slows as prey thins', () => {
    const { state } = runPopulation(watered(newGame()), new Rng(1));
    expect(Object.keys(must(state.populationLog.plains?.impala).eatenBy)).toEqual(['lion']);
    expect(killsPerPredator(lion, 'impala', 200)).toBeGreaterThan(
      killsPerPredator(lion, 'impala', 10),
    );
    expect(killsPerPredator(lion, 'impala', 0)).toBe(0);
  });

  it('never goes negative', () => {
    const hungry = withPopulation(only('impala', 1), 'plains', 'lion', 500);
    const { state } = runPopulation(hungry, new Rng(1));
    expect(must(state.populations.plains).impala).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    let a = newGame(42);
    let b = newGame(42);
    for (let i = 0; i < 120; i++) {
      a = runDayTick(a).state;
      b = runDayTick(b).state;
    }
    expect(a.populations).toEqual(b.populations);
    expect(a.populationLog).toEqual(b.populationLog);
  });
});

describe('stochasticRound', () => {
  it('rounds to a neighbouring whole number with the right average', () => {
    const rng = new Rng(9);
    let sum = 0;
    for (let i = 0; i < 4000; i++) {
      const r = stochasticRound(2.25, rng);
      expect([2, 3]).toContain(r);
      sum += r;
    }
    expect(sum / 4000).toBeCloseTo(2.25, 1);
  });
});

describe('one year with default balance (Phase 4 acceptance)', () => {
  for (const player of ['none', 'reasonable'] as const) {
    it(`has no extinction or explosion — player: ${player}`, () => {
      for (const seed of [1, 2, 3]) {
        const rows = runBalance({ years: 1, player, seed });
        for (const species of ['impala', 'zebra', 'lion']) {
          const values = rows.map((r) => r.populations[species] ?? 0);
          const start = values[0] ?? 0;
          expect(Math.min(...values)).toBeGreaterThan(0);
          expect(Math.max(...values)).toBeLessThan(start * 3);
        }
        expect(Math.min(...rows.map((r) => r.vegetation.plains ?? 0))).toBeGreaterThan(25);
      }
    });
  }
});
