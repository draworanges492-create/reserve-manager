// Poaching (spec §6.5). Phase 5 adds ranger coverage; incidents arrive in Phase 12.
import { BALANCE } from '../config/balance';
import { buildingDef, staffRole } from '../core/content';
import type { GameState } from '../core/GameState';

/** Strongest finished patrol boost in the zone (a ranger post doubles patrols). */
function patrolBoost(state: GameState, zoneId: string): number {
  let boost = 1;
  for (const slot of Object.values(state.slots)) {
    if (slot.zoneId !== zoneId || !slot.building || slot.building.daysLeft > 0) continue;
    for (const e of buildingDef(slot.building.buildingId)?.effects ?? []) {
      if (e.op === 'patrolBoost') boost = Math.max(boost, e.value ?? 1);
    }
  }
  return boost;
}

export function rangersIn(state: GameState, zoneId: string): number {
  return state.staff.filter((s) => s.zoneId === zoneId && staffRole(s.role)?.patrols).length;
}

/** Spec §6.5: min(0.9, rangers × patrolStrength), with a ranger post doubling patrols. */
export function rangerCoverage(state: GameState, zoneId: string): number {
  const { patrolStrength, maxCoverage } = BALANCE.staff;
  return Math.min(
    maxCoverage,
    rangersIn(state, zoneId) * patrolStrength * patrolBoost(state, zoneId),
  );
}
