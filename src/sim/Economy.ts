// Step 8 of the day tick: money in and out, wages, and the debt state (spec §6.7).
import { BALANCE } from '../config/balance';
import { buildingDef, staffRole } from '../core/content';
import type { DayLedger, GameState, StaffMember } from '../core/GameState';
import type { SimEvent, SimStep } from './types';

/** Spec §6.7: each finished building costs 5% of its build price per 30 days. */
export function upkeepPerDay(state: GameState): number {
  const { upkeepRate, upkeepPeriodDays } = BALANCE.economy;
  return Object.values(state.slots).reduce((sum, slot) => {
    const b = slot.building;
    if (!b || b.daysLeft > 0) return sum;
    return sum + ((buildingDef(b.buildingId)?.cost ?? 0) * upkeepRate) / upkeepPeriodDays;
  }, 0);
}

/**
 * Base grant plus any story grants switched on by flags (e.g. Amara's research funding from
 * Chapter 3, D112).
 */
export function grantPerDay(state: GameState): number {
  const cfg = BALANCE.economy;
  return cfg.storyGrants.reduce(
    (sum, g) => sum + (state.flags[g.flag] ? g.perDay : 0),
    cfg.dailyGrant,
  );
}

export function wagesPerDay(state: GameState): number {
  return state.staff.reduce((sum, s) => sum + (staffRole(s.role)?.wage ?? 0), 0);
}

/** Tomorrow's expected money flow if wages get paid (for the HUD "+8/day"). */
export function expectedLedger(state: GameState): DayLedger {
  const grant = grantPerDay(state);
  const tourism = state.tourism.lastRevenue;
  const wages = wagesPerDay(state);
  const upkeep = upkeepPerDay(state);
  return { grant, tourism, wages, wagesUnpaid: 0, upkeep, net: grant + tourism - wages - upkeep };
}

function adjustMorale(member: StaffMember, paid: boolean): StaffMember {
  const cfg = BALANCE.staff;
  if (!paid) {
    return {
      ...member,
      unpaidDays: member.unpaidDays + 1,
      morale: Math.max(0, member.morale - cfg.unpaidMoralePenalty),
    };
  }
  // Paid: morale drifts back toward its usual level.
  const gap = cfg.moraleTarget - member.morale;
  const step = Math.sign(gap) * Math.min(Math.abs(gap), cfg.moraleDriftPerDay);
  return { ...member, unpaidDays: 0, morale: member.morale + step };
}

export const runEconomy: SimStep = (state) => {
  const cfg = BALANCE.economy;
  const events: SimEvent[] = [];
  const grant = grantPerDay(state);
  // Tourism ran earlier in the tick (step 7) and left today's takings here.
  const tourism = state.tourism.lastRevenue;
  const upkeep = upkeepPerDay(state);
  const wages = wagesPerDay(state);

  let money = state.resources.money + grant + tourism - upkeep;
  // Wages are only paid if the money is there; otherwise staff go unpaid (spec §6.7 Debt).
  const paid = wages === 0 || money >= wages;
  if (paid) money -= wages;

  const staff: StaffMember[] = [];
  for (const member of state.staff) {
    const next = adjustMorale(member, paid);
    if (next.unpaidDays >= BALANCE.staff.quitAfterUnpaidDays) {
      events.push({ type: 'staffQuit', payload: { staffId: member.id, role: member.role } });
    } else {
      staff.push(next);
    }
  }

  const ledger: DayLedger = {
    grant,
    tourism,
    wages: paid ? wages : 0,
    wagesUnpaid: paid ? 0 : wages,
    upkeep,
    net: money - state.resources.money,
  };
  const inDebt = money < 0 || !paid;
  if (inDebt !== state.economy.inDebt) events.push({ type: 'debtChanged', payload: { inDebt } });

  return {
    state: {
      ...state,
      staff,
      resources: { ...state.resources, money },
      economy: {
        lastDay: ledger,
        netHistory: [...state.economy.netHistory, ledger.net].slice(-cfg.netHistoryDays),
        inDebt,
      },
    },
    events,
  };
};
