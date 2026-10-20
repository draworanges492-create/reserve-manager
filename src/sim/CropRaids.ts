// Elephants raiding the village's crops (Chapter 3 onwards, DECISIONS D111). Part of the
// "Events" step of the day tick. A beehive fence nearly stops raids; the plains–east border
// fence slows them; paying compensation softens the blow to Community Trust.
import { BALANCE } from '../config/balance';
import { buildingDef } from '../core/content';
import type { GameState } from '../core/GameState';
import type { Rng } from '../core/Rng';
import { adjustScore } from './Scores';
import type { SimEvent, SimStep } from './types';

/** The fence between the plains and the village side of the reserve. */
export const BORDER_FENCE = 'east_border_w0';

/** Strongest finished raid guard (a beehive fence), as a chance multiplier; 1 = none. */
export function raidGuard(state: GameState): number {
  let guard = 1;
  for (const slot of Object.values(state.slots)) {
    if (!slot.building || slot.building.daysLeft > 0) continue;
    for (const e of buildingDef(slot.building.buildingId)?.effects ?? [])
      if (e.op === 'raidGuard') guard = Math.min(guard, e.value ?? 1);
  }
  return guard;
}

function elephantsNearVillage(state: GameState): number {
  return ['plains', 'east_border'].reduce((n, z) => n + (state.populations[z]?.elephant ?? 0), 0);
}

/** Today's chance of a raid (0 before raids begin or with no elephants about). */
export function raidChance(state: GameState): number {
  const cfg = BALANCE.cropRaids;
  if (!state.flags.raids_active || elephantsNearVillage(state) === 0) return 0;
  const last = state.counters.lastRaidDay;
  if (last !== undefined && state.clock.day - last < cfg.cooldownDays) return 0;
  // The story's first raid always happens once Amara has counted the herds.
  if (!state.counters.cropRaids) return 1;
  const hungry = (state.zones.plains?.vegetation ?? 100) < cfg.hungryBelow ? cfg.hungryMult : 1;
  const fenced =
    state.fences[BORDER_FENCE]?.status === 'intact' && !state.zones.east_border?.unlocked
      ? cfg.fenceMult
      : 1;
  return Math.min(1, cfg.baseChance * hungry * fenced * raidGuard(state));
}

export const runCropRaids: SimStep = (input, rng: Rng) => {
  const cfg = BALANCE.cropRaids;
  const chance = raidChance(input);
  if (chance <= 0 || !rng.chance(chance)) return { state: input, events: [] };
  const compensated = input.flags.policy_compensation === true;
  let state: GameState = {
    ...input,
    flags: { ...input.flags, crop_raid_happened: true },
    counters: {
      ...input.counters,
      cropRaids: (input.counters.cropRaids ?? 0) + 1,
      lastRaidDay: input.clock.day,
    },
  };
  if (compensated) {
    state = {
      ...state,
      resources: { ...state.resources, money: state.resources.money - cfg.compensationCost },
    };
    state = adjustScore(state, 'trust', -cfg.compensatedTrustLoss, 'score.reason.cropRaidPaid');
  } else {
    state = adjustScore(state, 'trust', -cfg.trustLoss, 'score.reason.cropRaid');
  }
  // Elephants push straight through an ordinary fence.
  const fence = state.fences[BORDER_FENCE];
  const fenceBroken =
    fence?.status === 'intact' && raidGuard(state) === 1 && rng.chance(cfg.breakFenceChance);
  if (fence && fenceBroken) {
    state = {
      ...state,
      fences: { ...state.fences, [BORDER_FENCE]: { ...fence, status: 'broken', daysLeft: 0 } },
    };
  }
  const events: SimEvent[] = [{ type: 'cropRaid', payload: { compensated, fenceBroken } }];
  return { state, events };
};
