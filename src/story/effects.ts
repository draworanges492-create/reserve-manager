// The single effect interpreter (spec §6.9): dialogue choices, events and goals all use it.
import { BALANCE } from '../config/balance';
import type { GameState } from '../core/GameState';
import { adjustScore } from '../sim/Scores';
import type { SimEvent } from '../sim/types';
import type { Effect } from './types';

export interface EffectResult {
  state: GameState;
  events: SimEvent[];
}

const RELATIONSHIP_LIMIT = 100;

function applyOne(state: GameState, e: Effect, events: SimEvent[]): GameState {
  switch (e.op) {
    case 'money':
      return {
        ...state,
        resources: { ...state.resources, money: state.resources.money + e.value },
      };
    case 'trust':
      return adjustScore(state, 'trust', e.value, 'score.reason.story');
    case 'reputation':
      return adjustScore(state, 'reputation', e.value, 'score.reason.story');
    case 'population': {
      const herd = state.populations[e.zone] ?? {};
      const n = Math.max(0, (herd[e.species] ?? 0) + e.value);
      return {
        ...state,
        populations: { ...state.populations, [e.zone]: { ...herd, [e.species]: n } },
      };
    }
    case 'vegetation': {
      const zone = state.zones[e.zone];
      if (!zone) return state;
      const vegetation = Math.min(
        BALANCE.vegetation.maxLevel,
        Math.max(0, zone.vegetation + e.value),
      );
      return { ...state, zones: { ...state.zones, [e.zone]: { ...zone, vegetation } } };
    }
    case 'setFlag':
      return { ...state, flags: { ...state.flags, [e.flag]: e.value ?? true } };
    case 'startDialogue':
      // Plays right after the current one.
      return {
        ...state,
        story: { ...state.story, pendingDialogues: [e.id, ...state.story.pendingDialogues] },
      };
    case 'unlockZone': {
      const zone = state.zones[e.zone];
      if (!zone || zone.unlocked) return state;
      events.push({ type: 'zonesChanged', payload: {} });
      return { ...state, zones: { ...state.zones, [e.zone]: { ...zone, unlocked: true } } };
    }
    case 'spawnEvent':
      // Random/scripted events arrive with sim/Events (later phase); validate-data rejects ids until then.
      return state;
    case 'relationship': {
      const current = state.relationships[e.character] ?? 0;
      const next = Math.max(-RELATIONSHIP_LIMIT, Math.min(RELATIONSHIP_LIMIT, current + e.value));
      return { ...state, relationships: { ...state.relationships, [e.character]: next } };
    }
    case 'journal':
      if (state.journal.some((j) => j.entryId === e.entry)) return state;
      events.push({ type: 'journalAdded', payload: { entryId: e.entry } });
      return {
        ...state,
        journal: [
          ...state.journal,
          { entryId: e.entry, day: state.clock.day, chapter: state.chapter.current },
        ],
      };
  }
}

export function applyEffects(
  state: GameState,
  effects: readonly Effect[] | undefined,
): EffectResult {
  const events: SimEvent[] = [];
  let next = state;
  for (const e of effects ?? []) next = applyOne(next, e, events);
  return { state: next, events };
}
