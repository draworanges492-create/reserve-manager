// The day tick: runs every sim step in the fixed order from spec §4.
import type { GameState } from '../core/GameState';
import { Rng } from '../core/Rng';
import { runSeasons } from './Seasons';
import { runWater } from './Water';
import type { SimEvent, SimStep, StepResult } from './types';

/**
 * Spec §4 order: 1 Seasons → 2 Water → 3 Vegetation → 4 Population → 5 Culling →
 * 6 Poaching → 7 Tourism → 8 Economy → 9 Scores → 10 Events → 11 Story → 12 Autosave.
 * Steps are added here as their phases land.
 */
const STEPS: readonly SimStep[] = [runSeasons, runWater];

export function runDayTick(state: GameState): StepResult {
  const rng = Rng.fromState(state.rngState);
  const events: SimEvent[] = [];
  let current = state;
  for (const step of STEPS) {
    const result = step(current, rng);
    current = result.state;
    events.push(...result.events);
  }
  current = { ...current, rngState: rng.getState() };
  events.push({ type: 'dayTick', payload: { day: current.clock.day } });
  return { state: current, events };
}
