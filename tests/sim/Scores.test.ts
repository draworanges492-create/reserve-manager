import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import { adjustScore, ecosystemBreakdown, reputationTarget, runScores } from '../../src/sim/Scores';
import { Rng } from '../../src/core/Rng';
import { must, newGame, withLevel, withPopulation } from '../helpers/newGame';

describe('Ecosystem Health (spec §6.8)', () => {
  it('weights grass 40%, viable species 40%, watered zones 20% over open zones', () => {
    // Open: HQ (40) and plains (55) → 47.5 grass; 6 of 10 species viable (giraffe,
    // wildebeest, leopard and rhino aren't here yet); no water (A at 5).
    const b = ecosystemBreakdown(newGame());
    expect(b).toMatchObject({ viableSpecies: 6, totalSpecies: 10, wateredZones: 0, openZones: 2 });
    expect(b.vegetation).toBeCloseTo(47.5, 6);
    expect(b.score).toBeCloseTo(0.4 * 47.5 + 0.4 * ((6 / 10) * 100) + 0, 6);
  });

  it('rises when water is restored and falls when a species is no longer viable', () => {
    const watered = ecosystemBreakdown(withLevel(newGame(), 'waterhole_a', 60));
    expect(watered.wateredZones).toBe(1); // plains only: HQ is 22.5 tiles from A, out of range
    const fewLions = ecosystemBreakdown(withPopulation(newGame(), 'plains', 'lion', 2));
    expect(fewLions.viableSpecies).toBe(5);
  });
});

describe('Reputation', () => {
  it('drifts slowly toward its target', () => {
    const start = newGame();
    const target = reputationTarget(start, ecosystemBreakdown(start).score);
    const { state } = runScores(start, new Rng(1));
    const step = state.scores.reputation - start.scores.reputation;
    expect(step).toBeCloseTo((target - 30) * 0.02, 6);
  });
});

describe('Community Trust', () => {
  it('rises with a hire and falls more with a dismissal, remembering why', () => {
    const hired = applyCommand(newGame(), { type: 'hire', role: 'ranger' });
    if (!hired.ok) throw new Error(hired.reason);
    expect(hired.state.scores.trust).toBe(51);
    const fired = applyCommand(hired.state, {
      type: 'dismissStaff',
      staffId: must(hired.state.staff[0]).id,
    });
    if (!fired.ok) throw new Error(fired.reason);
    expect(fired.state.scores.trust).toBe(49);
    expect(fired.state.scoreHistory.map((c) => [c.score, c.delta, c.reason])).toEqual([
      ['trust', 1, 'score.reason.hired'],
      ['trust', -2, 'score.reason.dismissed'],
    ]);
  });

  it('stays within 0–100 and only logs real changes', () => {
    const maxed = adjustScore(
      { ...newGame(), scores: { ...newGame().scores, trust: 100 } },
      'trust',
      5,
      'x',
    );
    expect(maxed.scores.trust).toBe(100);
    expect(maxed.scoreHistory).toEqual([]);
  });
});

describe('starting scores', () => {
  it('are filled in when the game is created, matching the tooltip breakdown', () => {
    const state = newGame();
    expect(state.scores.ecosystem).toBeCloseTo(ecosystemBreakdown(state).score, 6);
    expect(state.scores.ecosystem).toBeGreaterThan(0);
    expect(state.scores).toMatchObject({ trust: 50, reputation: 30 });
  });
});
