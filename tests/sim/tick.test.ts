import { describe, expect, it } from 'vitest';
import { createGameState, type GameState } from '../../src/core/GameState';
import { runDayTick } from '../../src/sim/tick';
import type { SimEvent } from '../../src/sim/types';

function run(state: GameState, days: number): { state: GameState; events: SimEvent[] } {
  const events: SimEvent[] = [];
  for (let i = 0; i < days; i++) {
    const r = runDayTick(state);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

describe('runDayTick', () => {
  it('emits one dayTick per day and two season changes per year', () => {
    const { state, events } = run(createGameState({ seed: 5 }), 60);
    expect(state.clock.day).toBe(60);
    expect(events.filter((e) => e.type === 'dayTick')).toHaveLength(60);
    expect(events.filter((e) => e.type === 'seasonChanged')).toHaveLength(2);
  });

  it('is deterministic for the same seed', () => {
    expect(run(createGameState({ seed: 77 }), 90).state).toEqual(
      run(createGameState({ seed: 77 }), 90).state,
    );
  });
});
