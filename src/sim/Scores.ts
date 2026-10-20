// Step 9 of the day tick: Ecosystem Health, Community Trust and Reputation (spec §6.8).
import { BALANCE } from '../config/balance';
import { SPECIES } from '../core/content';
import type { GameState, ScoreChange, ScoreId } from '../core/GameState';
import { zoneHasWater } from './Water';
import type { SimEvent, SimStep } from './types';

const clamp100 = (n: number): number => Math.min(100, Math.max(0, n));

export interface EcosystemBreakdown {
  /** Average vegetation over open zones, 0–100. */
  vegetation: number;
  /** Species at or above their minimum viable size, out of all species. */
  viableSpecies: number;
  totalSpecies: number;
  /** Open zones with water in reach. */
  wateredZones: number;
  openZones: number;
  score: number;
}

/** Spec §6.8: 0.4 × avg vegetation + 0.4 × biodiversity % + 0.2 × water %. Open zones only. */
export function ecosystemBreakdown(state: GameState): EcosystemBreakdown {
  const w = BALANCE.scores.weights;
  const open = Object.entries(state.zones).filter(([, z]) => z.unlocked);
  const vegetation = open.length
    ? open.reduce((sum, [, z]) => sum + z.vegetation, 0) / open.length
    : 0;
  const totals: Record<string, number> = {};
  for (const herd of Object.values(state.populations))
    for (const [id, n] of Object.entries(herd)) totals[id] = (totals[id] ?? 0) + n;
  const viableSpecies = SPECIES.filter((s) => (totals[s.id] ?? 0) >= s.minViable).length;
  const wateredZones = open.filter(([id]) => zoneHasWater(state, id)).length;
  const biodiversity = SPECIES.length ? (viableSpecies / SPECIES.length) * 100 : 0;
  const water = open.length ? (wateredZones / open.length) * 100 : 0;
  return {
    vegetation,
    viableSpecies,
    totalSpecies: SPECIES.length,
    wateredZones,
    openZones: open.length,
    score: clamp100(w.vegetation * vegetation + w.biodiversity * biodiversity + w.water * water),
  };
}

/**
 * Where Reputation drifts while there are no tourists yet (DECISIONS D71): half
 * ecosystem health, half how much of each species' sighting target the reserve has.
 */
export function reputationTarget(state: GameState, ecosystem: number): number {
  const totals: Record<string, number> = {};
  for (const herd of Object.values(state.populations))
    for (const [id, n] of Object.entries(herd)) totals[id] = (totals[id] ?? 0) + n;
  const weight = SPECIES.reduce((sum, s) => sum + s.sightingValue, 0);
  const seen = SPECIES.reduce(
    (sum, s) => sum + s.sightingValue * Math.min(1, (totals[s.id] ?? 0) / s.targetN),
    0,
  );
  const sightings = weight ? (seen / weight) * 100 : 0;
  return clamp100(0.5 * ecosystem + 0.5 * sightings);
}

/** Change one score, remembering why (for the tooltip). Used by sim steps and commands. */
export function adjustScore(
  state: GameState,
  score: ScoreId,
  delta: number,
  reason: string,
): GameState {
  const next = clamp100(state.scores[score] + delta);
  const applied = next - state.scores[score];
  if (applied === 0) return state;
  const change: ScoreChange = { score, day: state.clock.day, delta: applied, reason };
  return {
    ...state,
    scores: { ...state.scores, [score]: next },
    scoreHistory: [...state.scoreHistory, change].slice(-BALANCE.scores.historyLength),
  };
}

export const runScores: SimStep = (state) => {
  const events: SimEvent[] = [];
  const ecosystem = ecosystemBreakdown(state).score;
  const target = reputationTarget(state, ecosystem);
  const reputation = clamp100(
    state.scores.reputation +
      (target - state.scores.reputation) * BALANCE.scores.reputationDriftPerDay,
  );
  // Community Trust slowly recovers towards its resting level: grudges fade (D123).
  const { trustRest, trustRecoveryPerDay } = BALANCE.scores;
  const trust =
    state.scores.trust < trustRest
      ? Math.min(trustRest, state.scores.trust + trustRecoveryPerDay)
      : state.scores.trust;
  // Daily recalculations aren't logged as "changes": tooltips show their parts instead.
  return {
    state: { ...state, scores: { ...state.scores, ecosystem, reputation, trust } },
    events,
  };
};
