// Bringing a species back from another reserve (Chapter 4+, spec §9.2 "relocation").
import { speciesDef, zoneDef } from './content';
import type { CommandResult } from './Commands';
import type { GameState } from './GameState';
import { staffOf } from '../sim/HerdPlans';

/** Why a species can't be brought in right now, or null if it can. */
export function reintroduceBlocker(state: GameState, speciesId: string) {
  const r = speciesDef(speciesId)?.reintroduce;
  if (!r) return 'command.cannotReintroduce' as const;
  if (state.chapter.current < r.chapter) return 'command.notYetAvailable' as const;
  if (state.flags[`reintroduced_${speciesId}`]) return 'command.alreadyReintroduced' as const;
  if (!state.zones[r.zone]?.unlocked || !zoneDef(r.zone)) return 'command.zoneLocked' as const;
  if (staffOf(state, 'vet') === 0) return 'command.needsVet' as const;
  if (state.resources.money < r.cost) return 'command.notEnoughMoney' as const;
  return null;
}

export function reintroduce(state: GameState, speciesId: string): CommandResult {
  const blocker = reintroduceBlocker(state, speciesId);
  const r = speciesDef(speciesId)?.reintroduce;
  if (blocker || !r) return { ok: false, reason: blocker ?? 'command.cannotReintroduce' };
  const herd = state.populations[r.zone] ?? {};
  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money - r.cost },
      populations: {
        ...state.populations,
        [r.zone]: { ...herd, [speciesId]: (herd[speciesId] ?? 0) + r.count },
      },
      flags: { ...state.flags, [`reintroduced_${speciesId}`]: true },
      counters: { ...state.counters, reintroduced: (state.counters.reintroduced ?? 0) + 1 },
    },
    events: [
      { type: 'speciesReintroduced', payload: { speciesId, zoneId: r.zone, count: r.count } },
    ],
  };
}
