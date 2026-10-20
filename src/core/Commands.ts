// Player actions (spec §4): the only way the player changes state. Each is validated
// and returns success with the new state, or a reason the UI can show.
import { BALANCE } from '../config/balance';
import { GAME_SPEEDS, type GameSpeed } from '../config/game';
import type { SimEvent } from '../sim/types';
import { clampLevel, waterVisualState } from '../sim/Water';
import { assignStaff, build, cancelBuild, dismissStaff, hire, repairFence } from './buildCommands';
import { examineClue, recordSighting } from '../story/storyCommands';
import type { GameState, HerdMethod } from './GameState';
import { cancelHerdPlan, setHerdPlan } from './herdCommands';
import type { StringKey } from './text';

export type Command =
  | { type: 'setSpeed'; speed: number }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'togglePause' }
  /** Spec §6.1 manual chore: +5 per click / per hold interval, free, capped at 100. */
  | { type: 'refillWaterhole'; id: string }
  | { type: 'build'; slotId: string; buildingId: string }
  | { type: 'cancelBuild'; slotId: string }
  | { type: 'hire'; role: string }
  | { type: 'assignStaff'; staffId: string; zoneId: string | null }
  | { type: 'dismissStaff'; staffId: string }
  | { type: 'repairFence'; segmentId: string }
  | { type: 'examineClue'; clueId: string }
  | { type: 'recordSighting'; speciesId: string }
  /** Spec §6.4 herd management (Chapter 3+). */
  | { type: 'setHerdPlan'; zoneId: string; speciesId: string; method: HerdMethod }
  | { type: 'cancelHerdPlan'; zoneId: string; speciesId: string };

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

function refillWaterhole(state: GameState, id: string): CommandResult {
  const hole = state.waterholes[id];
  if (!hole) return { ok: false, reason: 'command.unknownWaterhole' };
  if (!state.zones[hole.zoneId]?.unlocked) return { ok: false, reason: 'command.zoneLocked' };
  if (hole.level >= BALANCE.water.maxLevel) return { ok: false, reason: 'command.waterholeFull' };
  const level = clampLevel(hole.level + BALANCE.water.manualRefillAmount);
  const events: SimEvent[] = [{ type: 'waterholeRefilled', payload: { id, level } }];
  const after = waterVisualState(level);
  if (after !== waterVisualState(hole.level)) {
    events.push({ type: 'waterholeStateChanged', payload: { id, state: after } });
  }
  return {
    ok: true,
    state: { ...state, waterholes: { ...state.waterholes, [id]: { ...hole, level } } },
    events,
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
    case 'refillWaterhole':
      return refillWaterhole(state, command.id);
    case 'build':
      return build(state, command.slotId, command.buildingId);
    case 'cancelBuild':
      return cancelBuild(state, command.slotId);
    case 'hire':
      return hire(state, command.role);
    case 'assignStaff':
      return assignStaff(state, command.staffId, command.zoneId);
    case 'dismissStaff':
      return dismissStaff(state, command.staffId);
    case 'repairFence':
      return repairFence(state, command.segmentId);
    case 'examineClue':
      return examineClue(state, command.clueId);
    case 'recordSighting':
      return recordSighting(state, command.speciesId);
    case 'setHerdPlan':
      return setHerdPlan(state, command.zoneId, command.speciesId, command.method);
    case 'cancelHerdPlan':
      return cancelHerdPlan(state, command.zoneId, command.speciesId);
  }
}
