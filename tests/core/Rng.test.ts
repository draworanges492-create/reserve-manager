import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/Rng';

const take = (rng: Rng, n: number): number[] => Array.from({ length: n }, () => rng.next());

describe('Rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(new Rng(42), 20)).toEqual(take(new Rng(42), 20));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(new Rng(1), 5)).not.toEqual(take(new Rng(2), 5));
  });

  it('continues exactly from a saved state', () => {
    const a = new Rng(7);
    take(a, 10);
    const b = Rng.fromState(a.getState());
    expect(take(b, 10)).toEqual(take(a, 10));
  });

  it('keeps next() in [0, 1) and int() within bounds', () => {
    const rng = new Rng(99);
    for (let i = 0; i < 2000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(-3, 3);
      expect(n).toBeGreaterThanOrEqual(-3);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
});
