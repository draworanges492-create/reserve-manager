// The day tick: runs every sim step in the fixed order from spec §4.
import type { GameState } from '../core/GameState';
import { Rng } from '../core/Rng';
import { runConstruction } from './Construction';
import { runCropRaids } from './CropRaids';
import { runEconomy } from './Economy';
import { runHerdPlans } from './HerdPlans';
import { runPoaching } from './Poaching';
import { runPopulation } from './Population';
import { runStory } from '../story/StoryManager';
import { runRecords } from './Records';
import { runScores } from './Scores';
import { runSeasons } from './Seasons';
import { runTourism } from './Tourism';
import { runVegetation } from './Vegetation';
import { runWater } from './Water';
import type { SimEvent, SimStep, StepResult } from './types';

/**
 * Spec §4 order: 1 Seasons → 2 Water → 3 Vegetation → 4 Population → 5 Culling →
 * 6 Poaching → 7 Tourism → 8 Economy → 9 Scores → 10 Events → 11 Story → 12 Autosave
 * (autosave is done by GameSession, outside the pure tick).
 * Steps are added here as their phases land: herd plans (step 5) and crop raids (part of
 * step 10, Events) arrived in Phase 10. Construction progress runs just before
 * Economy so a building finished today already costs upkeep.
 */
const STEPS: readonly SimStep[] = [
  runSeasons,
  runWater,
  runVegetation,
  runPopulation,
  runHerdPlans,
  runPoaching,
  runTourism,
  runConstruction,
  runEconomy,
  runScores,
  runRecords,
  runCropRaids,
  runStory,
];

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
