// Herd management commands (spec §6.4): set or cancel a plan for one herd.
import { BALANCE } from '../config/balance';
import { speciesDef } from './content';
import type { CommandResult } from './Commands';
import type { GameState, HerdMethod } from './GameState';
import { planKey, withoutKey } from '../sim/HerdPlans';

/**
 * Cull or relocate: lowers the herd's target by one step (BALANCE.herds.stepSize) each time.
 * Contraception: starts a programme aiming one step lower. A different method replaces the plan.
 */
export function setHerdPlan(
  state: GameState,
  zoneId: string,
  speciesId: string,
  method: HerdMethod,
): CommandResult {
  const cfg = BALANCE.herds;
  if (state.chapter.current < cfg.unlockChapter)
    return { ok: false, reason: 'command.notYetAvailable' };
  const species = speciesDef(speciesId);
  if (!species) return { ok: false, reason: 'command.unknownSpecies' };
  const n = state.populations[zoneId]?.[speciesId] ?? 0;
  if (n <= 0) return { ok: false, reason: 'command.noAnimals' };
  const key = planKey(zoneId, speciesId);
  const current = state.herdPlans[key];
  const from = current?.method === method ? current.target : n;
  const target = Math.max(0, from - cfg.stepSize);
  return {
    ok: true,
    state: {
      ...state,
      herdPlans: { ...state.herdPlans, [key]: { zoneId, speciesId, method, target } },
    },
    events: [{ type: 'herdPlanChanged', payload: { zoneId, speciesId } }],
  };
}

export function cancelHerdPlan(state: GameState, zoneId: string, speciesId: string): CommandResult {
  const key = planKey(zoneId, speciesId);
  if (!state.herdPlans[key]) return { ok: false, reason: 'command.noPlan' };
  const herdPlans = withoutKey(state.herdPlans, key);
  return {
    ok: true,
    state: { ...state, herdPlans },
    events: [{ type: 'herdPlanChanged', payload: { zoneId, speciesId } }],
  };
}
