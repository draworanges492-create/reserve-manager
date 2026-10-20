// Step 5 of the day tick: herd management (spec §6.4). Staff work through each plan until
// the herd is down to its target: a culling team culls, a vet relocates (at a cost per
// animal) or runs a contraception programme (which halves births, see Population).
import { BALANCE } from '../config/balance';
import { speciesDef } from '../core/content';
import type { GameState, HerdPlan } from '../core/GameState';
import { adjustScore } from './Scores';
import type { SimEvent, SimStep } from './types';

/** Copy of a record without one key. */
export function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

export const planKey = (zoneId: string, speciesId: string): string => `${zoneId}:${speciesId}`;

/** How many staff of a role work for the reserve. */
export function staffOf(state: GameState, role: string): number {
  return state.staff.filter((s) => s.role === role).length;
}

/** The role a plan needs, and whether the reserve has one. */
export function planStaff(state: GameState, plan: HerdPlan): { role: string; has: boolean } {
  const role = plan.method === 'cull' ? 'culling_team' : 'vet';
  return { role, has: staffOf(state, role) > 0 };
}

/** Animals a plan can remove today (0 for contraception, which works on births instead). */
export function dailyRemoval(state: GameState, plan: HerdPlan, n: number): number {
  const cfg = BALANCE.herds;
  const over = Math.max(0, n - plan.target);
  if (plan.method === 'cull')
    return Math.min(over, staffOf(state, 'culling_team') * cfg.cullPerTeamPerDay);
  if (plan.method === 'relocate') {
    const affordable = Math.floor(Math.max(0, state.resources.money) / cfg.relocateCostPerAnimal);
    return Math.min(over, staffOf(state, 'vet') * cfg.relocatePerVetPerDay, affordable);
  }
  return 0;
}

/** Births are slowed while a contraception plan runs for the herd. */
export function birthFactor(state: GameState, zoneId: string, speciesId: string): number {
  const plan = state.herdPlans[planKey(zoneId, speciesId)];
  return plan?.method === 'contraception' && staffOf(state, 'vet') > 0
    ? BALANCE.herds.contraceptionBirthFactor
    : 1;
}

export const runHerdPlans: SimStep = (input) => {
  const cfg = BALANCE.herds;
  const events: SimEvent[] = [];
  let state = input;
  for (const [key, plan] of Object.entries(input.herdPlans)) {
    const herd = state.populations[plan.zoneId] ?? {};
    const n = herd[plan.speciesId] ?? 0;
    if (n <= plan.target) {
      // Done: the plan ends and the story hears about it.
      const herdPlans = withoutKey(state.herdPlans, key);
      state = {
        ...state,
        herdPlans,
        flags: {
          ...state.flags,
          herd_plan_done: true,
          [`${plan.method}_${plan.speciesId}_done`]: true,
        },
      };
      events.push({
        type: 'herdPlanDone',
        payload: { zoneId: plan.zoneId, speciesId: plan.speciesId, method: plan.method },
      });
      continue;
    }
    if (!planStaff(state, plan).has) continue;
    const charisma = speciesDef(plan.speciesId)?.charisma ?? 0.5;
    const removed = dailyRemoval(state, plan, n);
    if (plan.method === 'contraception') {
      state = {
        ...state,
        resources: {
          ...state.resources,
          money: state.resources.money - cfg.contraceptionCostPerDay,
        },
      };
      continue;
    }
    if (removed <= 0) continue;
    const log = state.populationLog[plan.zoneId]?.[plan.speciesId];
    state = {
      ...state,
      populations: {
        ...state.populations,
        [plan.zoneId]: { ...herd, [plan.speciesId]: n - removed },
      },
      populationLog: log
        ? {
            ...state.populationLog,
            [plan.zoneId]: {
              ...state.populationLog[plan.zoneId],
              [plan.speciesId]: { ...log, removed },
            },
          }
        : state.populationLog,
    };
    if (plan.method === 'cull') {
      state = adjustScore(
        state,
        'trust',
        -cfg.cullTrustPerAnimal * removed * charisma,
        'score.reason.culled',
      );
      state = adjustScore(
        state,
        'reputation',
        -cfg.cullReputationPerAnimal * removed * charisma,
        'score.reason.culled',
      );
      state = {
        ...state,
        counters: { ...state.counters, culled: (state.counters.culled ?? 0) + removed },
      };
    } else {
      state = {
        ...state,
        resources: {
          ...state.resources,
          money: state.resources.money - removed * cfg.relocateCostPerAnimal,
        },
        counters: { ...state.counters, relocated: (state.counters.relocated ?? 0) + removed },
      };
      state = adjustScore(
        state,
        'trust',
        cfg.relocateTrustPerAnimal * removed,
        'score.reason.relocated',
      );
      state = adjustScore(
        state,
        'reputation',
        cfg.relocateReputationPerAnimal * removed,
        'score.reason.relocated',
      );
    }
  }
  return { state, events };
};
