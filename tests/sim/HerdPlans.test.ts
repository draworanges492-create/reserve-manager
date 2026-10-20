import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyCommand } from '../../src/core/Commands';
import type { GameState, HerdMethod } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { runHerdPlans } from '../../src/sim/HerdPlans';
import { runPopulation } from '../../src/sim/Population';
import { must, newGame, withPopulation } from '../helpers/newGame';

const chapter3 = (): GameState => ({ ...newGame(), chapter: { current: 3, startDay: 0 } });

function ok(state: GameState, command: Parameters<typeof applyCommand>[1]): GameState {
  const r = applyCommand(state, command);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

const plan = (state: GameState, method: HerdMethod): GameState =>
  ok(state, { type: 'setHerdPlan', zoneId: 'plains', speciesId: 'impala', method });

describe('herd plans (spec §6.4)', () => {
  it('are not available before Chapter 3', () => {
    expect(
      applyCommand(newGame(), {
        type: 'setHerdPlan',
        zoneId: 'plains',
        speciesId: 'impala',
        method: 'cull',
      }),
    ).toEqual({ ok: false, reason: 'command.notYetAvailable' });
  });

  it('each press lowers the target by one step; another method replaces the plan', () => {
    let state = plan(plan(chapter3(), 'cull'), 'cull');
    expect(state.herdPlans['plains:impala']).toMatchObject({
      method: 'cull',
      target: 80 - 2 * BALANCE.herds.stepSize,
    });
    state = plan(state, 'relocate');
    expect(state.herdPlans['plains:impala']).toMatchObject({
      method: 'relocate',
      target: 80 - BALANCE.herds.stepSize,
    });
  });

  it('wait for the right staff, then cull a few a day at a cost to trust', () => {
    let state = plan(chapter3(), 'cull');
    expect(runHerdPlans(state, new Rng(1)).state.populations.plains?.impala).toBe(80);
    state = ok(state, { type: 'hire', role: 'culling_team' });
    const after = runHerdPlans(state, new Rng(1)).state;
    expect(after.populations.plains?.impala).toBe(80 - BALANCE.herds.cullPerTeamPerDay);
    expect(after.scores.trust).toBeLessThan(state.scores.trust);
    expect(after.counters.culled).toBe(BALANCE.herds.cullPerTeamPerDay);
  });

  it('relocation costs money per animal and stops when it runs out', () => {
    let state = ok(plan(chapter3(), 'relocate'), { type: 'hire', role: 'vet' });
    state = { ...state, resources: { money: BALANCE.herds.relocateCostPerAnimal } };
    const after = runHerdPlans(state, new Rng(1)).state;
    expect(after.populations.plains?.impala).toBe(79);
    expect(after.resources.money).toBe(0);
  });

  it('contraception halves births while it runs', () => {
    const base = withPopulation(chapter3(), 'plains', 'impala', 20);
    const withPlan = ok(plan(base, 'contraception'), { type: 'hire', role: 'vet' });
    const births = (s: GameState) =>
      must(runPopulation(s, new Rng(5)).state.populationLog.plains?.impala).births;
    expect(births(withPlan)).toBeLessThanOrEqual(Math.ceil(births(base) / 2));
  });

  it('finish at the target: plan removed, story flag set, event sent', () => {
    const state = withPopulation(plan(chapter3(), 'cull'), 'plains', 'impala', 60);
    const { state: after, events } = runHerdPlans(state, new Rng(1));
    expect(after.herdPlans).toEqual({});
    expect(after.flags).toMatchObject({ herd_plan_done: true, cull_impala_done: true });
    expect(events).toContainEqual({
      type: 'herdPlanDone',
      payload: { zoneId: 'plains', speciesId: 'impala', method: 'cull' },
    });
  });
});
