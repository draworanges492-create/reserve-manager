// Step 7 of the day tick: visitors (spec §6.6, Chapter 4+, DECISIONS D116). Records how many
// came and what they paid; Economy books the money.
import { BALANCE } from '../config/balance';
import { buildingDef, SPECIES } from '../core/content';
import type { GameState } from '../core/GameState';
import { seasonOf } from './Seasons';
import type { SimStep } from './types';

function totals(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const herd of Object.values(state.populations))
    for (const [id, n] of Object.entries(herd)) out[id] = (out[id] ?? 0) + n;
  return out;
}

/** Spec §6.6: Σ sightingValue × min(1, N / targetN), plus a bonus for a seen leopard. */
export function attraction(state: GameState): number {
  const n = totals(state);
  const base = SPECIES.reduce(
    (sum, s) => sum + s.sightingValue * Math.min(1, (n[s.id] ?? 0) / s.targetN),
    0,
  );
  const rare =
    (n.leopard ?? 0) > 0 && state.encyclopedia.includes('leopard') ? BALANCE.tourism.rareBonus : 0;
  return base + rare;
}

/** 1 + the tourism boosts of every finished tower and lodge. */
export function infrastructure(state: GameState): number {
  let infra = 1;
  for (const slot of Object.values(state.slots)) {
    if (!slot.building || slot.building.daysLeft > 0) continue;
    for (const e of buildingDef(slot.building.buildingId)?.effects ?? [])
      if (e.op === 'tourismInfra') infra += e.value ?? 0;
  }
  return infra;
}

export function hasTower(state: GameState): boolean {
  return Object.values(state.slots).some(
    (s) => s.building?.buildingId === 'observation_tower' && s.building.daysLeft === 0,
  );
}

/** Visitors expected today (0 until the story opens the gates to tourists). */
export function visitorsToday(state: GameState): number {
  if (!state.flags.tourism_open) return 0;
  const season = BALANCE.tourism.seasonMult[seasonOf(state.clock.day)];
  const demand = Math.floor(
    attraction(state) * infrastructure(state) * (state.scores.reputation / 100) * season,
  );
  return Math.min(demand, capacity(state));
}

/** Most visitors a day the reserve can take: day trips, plus room per tower and the lodge (D123). */
export function capacity(state: GameState): number {
  const cfg = BALANCE.tourism;
  const built = (id: string) =>
    Object.values(state.slots).filter(
      (s) => s.building?.buildingId === id && s.building.daysLeft === 0,
    ).length;
  return (
    cfg.capacityBase +
    built('observation_tower') * cfg.capacityPerTower +
    built('lodge') * cfg.capacityLodge
  );
}

export function revenueFor(state: GameState, visitors: number): number {
  const cfg = BALANCE.tourism;
  const each = cfg.ticketPrice + (hasTower(state) ? cfg.towerBonusPerVisitor : 0);
  const share = state.flags.victor_lodge ? 1 - cfg.victorShare : 1;
  return Math.round(visitors * each * share);
}

/** Visitors over the last 30 days (Chapter 4 goal). */
export function visitorsPerMonth(state: GameState): number {
  return state.tourism.visitorsHistory.reduce((a, b) => a + b, 0);
}

export const runTourism: SimStep = (state) => {
  const visitors = visitorsToday(state);
  const lastRevenue = revenueFor(state, visitors);
  const visitorsHistory = [...state.tourism.visitorsHistory, visitors].slice(
    -BALANCE.tourism.historyDays,
  );
  return {
    state: {
      ...state,
      tourism: { visitorsHistory, lastVisitors: visitors, lastRevenue },
      counters: visitors
        ? { ...state.counters, visitors: (state.counters.visitors ?? 0) + visitors }
        : state.counters,
    },
    events: [],
  };
};
