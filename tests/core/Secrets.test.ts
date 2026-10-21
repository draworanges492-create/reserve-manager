import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import type { GameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import {
  findSecret,
  hasSecret,
  onSecretFound,
  resetSecretsCache,
  secretsFound,
} from '../../src/core/Secrets';
import { dayRoll, runRarities } from '../../src/sim/Rarities';
import { runRecords } from '../../src/sim/Records';
import { advance, startDialogue, viewOf } from '../../src/story/DialogueRunner';
import { fieldNoteEntries, recordEntries } from '../../src/ui/journalBook';
import { must, newGame } from '../helpers/newGame';

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe('Easter eggs (D132)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
    resetSecretsCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetSecretsCache();
  });

  it('secrets are found once, remembered in storage and announced', () => {
    const heard: [string, number][] = [];
    const off = onSecretFound((id, n) => heard.push([id, n]));
    expect(findSecret('parade')).toBe(true);
    expect(findSecret('parade')).toBe(false);
    off();
    expect(heard).toEqual([['parade', 1]]);
    resetSecretsCache(); // as if the page reloaded
    expect(hasSecret('parade')).toBe(true);
    expect(secretsFound()).toEqual(['parade']);
  });

  it('the journal only mentions secrets once one is found', () => {
    const s = newGame();
    expect(recordEntries(s).some((e) => e.key === 'records:secrets')).toBe(false);
    findSecret('tea');
    const line = recordEntries(s).find((e) => e.key === 'records:secrets');
    expect(line?.body).toEqual(['Secrets found: 1 of 9']);
  });

  it('albino animals: rare, deterministic, leave after a few weeks, untouched RNG', () => {
    let s: GameState = newGame(7);
    const rng = Rng.fromState(s.rngState);
    let firstDay = -1;
    for (let day = 0; day < 2000 && firstDay < 0; day++) {
      s = runRarities({ ...s, clock: { ...s.clock, day } }, rng).state;
      if (s.albino) firstDay = day;
    }
    expect(firstDay).toBeGreaterThan(0);
    expect(rng.getState()).toBe(newGame(7).rngState);
    const a = must(s.albino);
    expect(['impala', 'zebra', 'giraffe', 'wildebeest']).toContain(a.speciesId);
    expect(a.untilDay - firstDay).toBeGreaterThanOrEqual(20);
    expect(a.untilDay - firstDay).toBeLessThanOrEqual(30);
    const later = runRarities({ ...s, clock: { ...s.clock, day: a.untilDay } }, rng).state;
    expect(later.albino).toBeNull();
    expect(dayRoll(7, 12, 1)).toBe(dayRoll(7, 12, 1));
  });

  it('clicking a rarity adds a hidden Field notes page', () => {
    const s = newGame();
    const r = applyCommand(s, { type: 'noteRarity', id: 'albino_zebra', zoneId: 'plains' });
    if (!r.ok) throw new Error(r.reason);
    const again = applyCommand(r.state, { type: 'noteRarity', id: 'albino_zebra', zoneId: null });
    if (!again.ok) throw new Error(again.reason);
    expect(again.state.fieldNotes.albino_zebra?.zoneId).toBe('plains');
    const page = fieldNoteEntries(again.state).find((e) => e.key === 'notes:albino_zebra');
    expect(page?.title).toBe('Albino Zebra');
    expect(page?.sprite).toBe('zebra-albino');
    expect(fieldNoteEntries(s).some((e) => e.key === 'notes:albino_zebra')).toBe(false);
  });

  it('the 1,000th visitor gets a diary entry', () => {
    const s = { ...newGame(), counters: { visitors: 1000 } };
    const r = runRecords(s, Rng.fromState(1));
    expect(r.state.journal.some((j) => j.entryId === 'visitor_1000')).toBe(true);
  });

  it('Tendai reacts to a familiar name', () => {
    const textAfterGreeting = (name: string): string => {
      let step = startDialogue({ ...newGame(), playerName: name }, 'ch01_arrival');
      step = advance(step.state, must(step.cursor)); // narrator → Tendai
      step = advance(step.state, must(step.cursor)); // → reaction, or the first choice
      return viewOf(step.state, must(step.cursor))?.text ?? '';
    };
    expect(textAfterGreeting(' ruth ')).toMatch(/grandmother would have liked/);
    expect(textAfterGreeting('Hale')).toMatch(/property people/);
    expect(textAfterGreeting('Sam')).toBe('…');
  });
});
