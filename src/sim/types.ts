import type { GameEvents } from '../core/EventBus';
import type { GameState } from '../core/GameState';
import type { Rng } from '../core/Rng';

/** An event a sim step returns; GameSession forwards it to the EventBus. */
export type SimEvent = {
  [K in keyof GameEvents]: { type: K; payload: GameEvents[K] };
}[keyof GameEvents];

export interface StepResult {
  state: GameState;
  events: SimEvent[];
}

/** One stage of the day tick (spec §4). Must not mutate `state`. */
export type SimStep = (state: GameState, rng: Rng) => StepResult;
