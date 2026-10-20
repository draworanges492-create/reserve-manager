// Evaluates story conditions against the game state (spec §9.1).
import type { GameState } from '../core/GameState';
import { visitorsPerMonth } from '../sim/Tourism';
import type { Condition } from './types';

/** Animals of a species across every zone. */
export function totalOf(state: GameState, speciesId: string): number {
  return Object.values(state.populations).reduce((n, herd) => n + (herd[speciesId] ?? 0), 0);
}

/** How many species have at least one animal in the reserve. */
export function speciesPresent(state: GameState): number {
  const present = new Set<string>();
  for (const herd of Object.values(state.populations))
    for (const [id, n] of Object.entries(herd)) if (n > 0) present.add(id);
  return present.size;
}

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
    case 'vegetationAtLeast':
      return (state.zones[c.zone]?.vegetation ?? 0) >= c.min;
    case 'scoreAtLeast':
      return state.scores[c.score] >= c.min;
    case 'counterAtLeast':
      return (state.counters[c.counter] ?? 0) >= c.min;
    case 'daysInChapter':
      return state.clock.day - state.chapter.startDay >= c.min;
    case 'speciesPresent':
      return speciesPresent(state) >= c.min;
    case 'populationAtLeast':
      return totalOf(state, c.species) >= c.min;
    case 'visitorsPerMonth':
      return visitorsPerMonth(state) >= c.min;
    case 'seen':
      return state.encyclopedia.includes(c.species);
    case 'not':
      return !holds(state, c.condition);
  }
}

export function allHold(state: GameState, conditions: readonly Condition[] | undefined): boolean {
  return (conditions ?? []).every((c) => holds(state, c));
}
