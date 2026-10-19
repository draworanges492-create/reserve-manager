// Evaluates story conditions against the game state (spec §9.1).
import type { GameState } from '../core/GameState';
import type { Condition } from './types';

export function holds(state: GameState, c: Condition): boolean {
  switch (c.op) {
    case 'flag':
      return (state.flags[c.flag] ?? false) === (c.value ?? true);
    case 'relationship':
      return (state.relationships[c.character] ?? 0) >= c.min;
    case 'money':
      return state.resources.money >= c.min;
    case 'fenceRepaired':
      return state.fences[c.segmentId]?.status === 'intact';
    case 'waterholeLevel':
      return (state.waterholes[c.waterholeId]?.level ?? 0) >= c.min;
    case 'buildingWorking':
      return Object.values(state.slots).some(
        (s) => s.building?.buildingId === c.buildingId && s.building.daysLeft === 0,
      );
    case 'staffCount':
      return state.staff.filter((s) => s.role === c.role).length >= c.min;
    case 'goalDone':
      return state.story.goalsDone.includes(c.goalId);
    case 'dayAtLeast':
      return state.clock.day >= c.day;
    case 'zoneOpen':
      return state.zones[c.zoneId]?.unlocked === true;
    case 'goalStreak':
      return (
        state.story.goalsDone.includes(c.goalId) ||
        (state.story.goalStreaks[c.goalId] ?? 0) >= c.min
      );
    case 'netPositive':
      return (state.economy.lastDay?.net ?? 0) > 0;
    case 'not':
      return !holds(state, c.condition);
  }
}

export function allHold(state: GameState, conditions: readonly Condition[] | undefined): boolean {
  return (conditions ?? []).every((c) => holds(state, c));
}
