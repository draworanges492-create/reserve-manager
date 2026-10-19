// Developer shortcuts (spec §13 debug tools). Never reachable from player UI; GameSession
// only exposes them in dev builds.
import { ZONE_DEFS } from './content';
import type { GameState } from './GameState';

/** Jump to a chapter: sets the chapter and unlocks every zone due by then. */
export function debugSetChapter(state: GameState, chapter: number): GameState {
  const zones = { ...state.zones };
  for (const def of ZONE_DEFS) {
    const zone = zones[def.id];
    if (zone && def.unlockChapter <= chapter) zones[def.id] = { ...zone, unlocked: true };
  }
  return { ...state, chapter: { current: chapter }, zones };
}

/** Add (or remove, if negative) money. */
export function debugAddMoney(state: GameState, amount: number): GameState {
  return { ...state, resources: { ...state.resources, money: state.resources.money + amount } };
}
