// Chapter 5 drought actions (D121): deepen a borehole so its pump runs at full again, or
// truck water in to a waterhole.
import { BALANCE } from '../config/balance';
import type { CommandResult } from './Commands';
import type { GameState } from './GameState';

export function deepenBorehole(state: GameState, waterholeId: string): CommandResult {
  const hole = state.waterholes[waterholeId];
  if (!hole) return { ok: false, reason: 'command.unknownWaterhole' };
  if (state.chapter.current < 5) return { ok: false, reason: 'command.notYetAvailable' };
  if (hole.pumpState !== 'working') return { ok: false, reason: 'command.needsPump' };
  if (state.flags[`deepened_${waterholeId}`])
    return { ok: false, reason: 'command.alreadyDeepened' };
  const cost = BALANCE.drought.deepenCost;
  if (state.resources.money < cost) return { ok: false, reason: 'command.notEnoughMoney' };
  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money - cost },
      flags: { ...state.flags, [`deepened_${waterholeId}`]: true },
      counters: { ...state.counters, deepened: (state.counters.deepened ?? 0) + 1 },
    },
    events: [],
  };
}

export function truckWater(state: GameState, waterholeId: string): CommandResult {
  const hole = state.waterholes[waterholeId];
  if (!hole) return { ok: false, reason: 'command.unknownWaterhole' };
  if (!state.flags.drought) return { ok: false, reason: 'command.notInDrought' };
  if (!state.zones[hole.zoneId]?.unlocked) return { ok: false, reason: 'command.zoneLocked' };
  const { truckCost, truckAmount } = BALANCE.drought;
  if (state.resources.money < truckCost) return { ok: false, reason: 'command.notEnoughMoney' };
  const level = Math.min(BALANCE.water.maxLevel, hole.level + truckAmount);
  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money - truckCost },
      waterholes: { ...state.waterholes, [waterholeId]: { ...hole, level } },
    },
    events: [{ type: 'waterholeRefilled', payload: { id: waterholeId, level } }],
  };
}
