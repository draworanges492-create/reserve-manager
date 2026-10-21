// Easter egg (D132): very rarely an albino animal is born into a big herd and stays a few
// weeks. The roll comes from a hash of the seed and the day, not from the game's RNG, so
// adding it changes nothing else in the simulation.
import { BALANCE } from '../config/balance';
import type { GameState } from '../core/GameState';
import type { SimStep } from './types';

const CFG = BALANCE.secrets;

/** Deterministic number in [0, 1) for this seed, day and salt. */
export function dayRoll(seed: number, day: number, salt: number): number {
  let h = (seed ^ Math.imul(day + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Herds big enough to have an albino in them, in a fixed order. */
function candidates(state: GameState): { zoneId: string; speciesId: string }[] {
  return Object.entries(state.populations).flatMap(([zoneId, bySpecies]) =>
    CFG.albinoSpecies
      .filter((id) => (bySpecies[id] ?? 0) >= CFG.albinoMinHerd)
      .map((speciesId) => ({ zoneId, speciesId })),
  );
}

export const runRarities: SimStep = (state) => {
  const day = state.clock.day;
  const current = state.albino ?? null;
  if (current) {
    const herd = state.populations[current.zoneId]?.[current.speciesId] ?? 0;
    // It moves on when its time is up, or vanishes with its herd.
    if (day < current.untilDay && herd > 0) return { state, events: [] };
    return { state: { ...state, albino: null }, events: [] };
  }
  if (dayRoll(state.seed, day, 1) >= CFG.albinoDailyChance) return { state, events: [] };
  const herds = candidates(state);
  if (!herds.length) return { state, events: [] };
  const pick = herds[Math.floor(dayRoll(state.seed, day, 2) * herds.length)];
  if (!pick) return { state, events: [] };
  const { min, max } = CFG.albinoDays;
  const days = min + Math.floor(dayRoll(state.seed, day, 3) * (max - min + 1));
  return { state: { ...state, albino: { ...pick, untilDay: day + days } }, events: [] };
};
