// Journal Records (D130): best values the reserve has reached and the day each was set,
// plus a few automatic diary entries for notable moments. Runs after Scores each day.
import { SPECIES } from '../core/content';
import type { GameState } from '../core/GameState';
import { speciesPresent, totalOf } from '../story/conditions';
import { journalTemplate } from '../story/content';
import type { SimEvent, SimStep } from './types';

/** Species whose first calf born here gets a diary entry. */
const FIRST_CALF = ['giraffe', 'wildebeest', 'rhino', 'leopard'];

function best(state: GameState, key: string, value: number): GameState {
  const current = state.records[key];
  if (current && current.value >= value) return state;
  return { ...state, records: { ...state.records, [key]: { value, day: state.clock.day } } };
}

function diary(state: GameState, entryId: string, events: SimEvent[]): GameState {
  if (!journalTemplate(entryId) || state.journal.some((j) => j.entryId === entryId)) return state;
  events.push({ type: 'journalAdded', payload: { entryId } });
  return {
    ...state,
    journal: [...state.journal, { entryId, day: state.clock.day, chapter: state.chapter.current }],
  };
}

export const runRecords: SimStep = (input) => {
  const events: SimEvent[] = [];
  let state = input;
  // Births yesterday, overall and per species.
  const counters = { ...state.counters };
  for (const zone of Object.values(state.populationLog))
    for (const [id, change] of Object.entries(zone)) {
      if (!change.births) continue;
      counters.births = (counters.births ?? 0) + change.births;
      counters[`born_${id}`] = (counters[`born_${id}`] ?? 0) + change.births;
    }
  state = { ...state, counters };

  state = best(state, 'ecosystem', Math.round(state.scores.ecosystem));
  state = best(state, 'reputation', Math.round(state.scores.reputation));
  state = best(state, 'trust', Math.round(state.scores.trust));
  state = best(state, 'species', speciesPresent(state));
  state = best(state, 'money', Math.floor(state.resources.money));
  state = best(
    state,
    'visitorsMonth',
    state.tourism.visitorsHistory.reduce((a, b) => a + b, 0),
  );
  for (const s of SPECIES) state = best(state, `peak_${s.id}`, totalOf(state, s.id));

  for (const id of FIRST_CALF)
    if ((state.counters[`born_${id}`] ?? 0) > 0) state = diary(state, `first_calf_${id}`, events);
  if ((state.counters.poachersCaught ?? 0) > 0)
    state = diary(state, 'first_poacher_caught', events);
  if (state.scores.ecosystem >= 90) state = diary(state, 'record_ecosystem_90', events);
  return { state, events };
};
