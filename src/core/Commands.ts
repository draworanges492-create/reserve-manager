// Player actions (spec §4): the only way the player changes state. Each is validated
// and returns success with the new state, or a reason the UI can show.
import { GAME_SPEEDS, type GameSpeed } from '../config/game';
import type { SimEvent } from '../sim/types';
import type { GameState } from './GameState';
import type { StringKey } from './text';

export type Command =
  | { type: 'setSpeed'; speed: number }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'togglePause' };

export type CommandResult =
  { ok: true; state: GameState; events: SimEvent[] } | { ok: false; reason: StringKey };

const isSpeed = (n: number): n is GameSpeed => (GAME_SPEEDS as readonly number[]).includes(n);

function withClock(state: GameState, speed: GameSpeed, paused: boolean): CommandResult {
  return {
    ok: true,
    state: { ...state, clock: { ...state.clock, speed, paused } },
    events: [{ type: 'speedChanged', payload: { speed, paused } }],
  };
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  const { speed, paused } = state.clock;
  switch (command.type) {
    case 'setSpeed':
      if (!isSpeed(command.speed)) return { ok: false, reason: 'command.invalidSpeed' };
      // Choosing a speed also un-pauses: that's what pressing "2×" while paused means.
      return withClock(state, command.speed, false);
    case 'setPaused':
      return withClock(state, speed, command.paused);
    case 'togglePause':
      return withClock(state, speed, !paused);
  }
}
