// Construction progress (spec §7.2). Runs just before Economy in the day tick.
import { BALANCE } from '../config/balance';
import { fenceRepairable } from '../core/buildCommands';
import { buildingDef } from '../core/content';
import type { GameState } from '../core/GameState';
import type { SimEvent, SimStep } from './types';

/** Applies a finished building's effects (e.g. a pump starts feeding its waterhole). */
function applyEffects(state: GameState, slotId: string, buildingId: string): GameState {
  const slot = state.slots[slotId];
  const def = buildingDef(buildingId);
  if (!slot || !def) return state;
  let next = state;
  for (const effect of def.effects) {
    if (effect.op === 'installPump' && slot.waterholeId && effect.pumpKind) {
      const hole = next.waterholes[slot.waterholeId];
      if (!hole) continue;
      next = {
        ...next,
        waterholes: {
          ...next.waterholes,
          [slot.waterholeId]: {
            ...hole,
            type: 'pumped',
            pumpState: 'working',
            pumpKind: effect.pumpKind,
          },
        },
      };
    }
    // patrolBoost is read live by rangerCoverage; nothing to store.
  }
  return next;
}

/** Hand repairs finish; each fence crew mends broken fences they can reach (spec §7.1). */
function progressFences(state: GameState, events: SimEvent[]): GameState {
  const fences = { ...state.fences };
  for (const [id, f] of Object.entries(fences)) {
    if (f.status !== 'repairing') continue;
    const daysLeft = f.daysLeft - 1;
    fences[id] = daysLeft <= 0 ? { ...f, status: 'intact', daysLeft: 0 } : { ...f, daysLeft };
    if (daysLeft <= 0) events.push({ type: 'fenceRepaired', payload: { segmentId: id } });
  }
  let next: GameState = { ...state, fences };
  const crews = state.staff.filter((s) => s.role === 'fence_crew').length;
  let budget = crews * BALANCE.fences.crewRepairsPerDay;
  // Fences that open a new zone first, then the rest.
  const broken = Object.keys(fences)
    .filter((id) => fenceRepairable(next, id))
    .sort(
      (a, b) =>
        Number(!!next.zones[fences[a]?.zoneId ?? '']?.unlocked) -
        Number(!!next.zones[fences[b]?.zoneId ?? '']?.unlocked),
    );
  for (const id of broken) {
    if (budget-- <= 0) break;
    const f = next.fences[id];
    if (!f) continue;
    next = { ...next, fences: { ...next.fences, [id]: { ...f, status: 'intact', daysLeft: 0 } } };
    events.push({ type: 'fenceRepaired', payload: { segmentId: id } });
  }
  return next;
}

export const runConstruction: SimStep = (state) => {
  const events: SimEvent[] = [];
  let next = progressFences(state, events);
  for (const [slotId, slot] of Object.entries(next.slots)) {
    const building = slot.building;
    if (!building || building.daysLeft <= 0) continue;
    const daysLeft = building.daysLeft - 1;
    next = {
      ...next,
      slots: { ...next.slots, [slotId]: { ...slot, building: { ...building, daysLeft } } },
    };
    if (daysLeft === 0) {
      next = applyEffects(next, slotId, building.buildingId);
      events.push({
        type: 'buildingCompleted',
        payload: { slotId, buildingId: building.buildingId },
      });
    }
  }
  return { state: next, events };
};
