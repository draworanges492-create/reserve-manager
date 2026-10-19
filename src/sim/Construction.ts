// Construction progress (spec §7.2). Runs just before Economy in the day tick.
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

export const runConstruction: SimStep = (state) => {
  const events: SimEvent[] = [];
  let next = state;
  for (const [slotId, slot] of Object.entries(state.slots)) {
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
