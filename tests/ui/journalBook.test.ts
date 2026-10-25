import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import type { GameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { runRecords } from '../../src/sim/Records';
import {
  dateOf,
  decisionEntries,
  diaryEntries,
  fieldNoteEntries,
  recordEntries,
} from '../../src/ui/journalBook';
import { newGame } from '../helpers/newGame';

const ok = (state: GameState, command: Parameters<typeof applyCommand>[1]): GameState => {
  const r = applyCommand(state, command);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('journal book (D130)', () => {
  it('diary: oldest first, new entries marked until the journal is read', () => {
    const s = {
      ...newGame(1, 'Sam'),
      journal: [
        { entryId: 'chapter_1_start', day: 0, chapter: 1 },
        { entryId: 'gate_mended', day: 2, chapter: 1 },
      ],
      journalRead: 1,
    };
    const d = diaryEntries(s);
    expect(d.map((e) => [e.title, e.isNew])).toEqual([
      ['Arrival', false],
      ['The gate shuts', true],
    ]);
    expect(d[1]?.meta).toBe(`${dateOf(2)} · Chapter 1`);
    expect(d[1]?.focus).toEqual({ x: 57, y: 78 });
    expect(diaryEntries(ok(s, { type: 'markJournalRead' })).some((e) => e.isNew)).toBe(false);
  });

  it('field notes: a page per species; seen ones say when and where', () => {
    const seen = ok(newGame(), { type: 'recordSighting', speciesId: 'zebra', zoneId: 'plains' });
    const notes = fieldNoteEntries(seen);
    expect(notes).toHaveLength(10);
    const zebra = notes.find((n) => n.key === 'notes:zebra');
    expect(zebra?.title).toBe('Zebra');
    expect(zebra?.meta).toBe(`First seen ${dateOf(0)}, Central Plains`);
    // Unverified facts never reach players (D136).
    expect(zebra?.body.some((b) => /verif/i.test(b))).toBe(false);
    expect(notes.find((n) => n.key === 'notes:impala')?.title).toBe('??? · not seen yet');
  });

  it('records: bests with the day they were set, and running totals', () => {
    const { state } = runRecords(newGame(), new Rng(1));
    expect(state.records.ecosystem).toEqual({
      value: Math.round(newGame().scores.ecosystem),
      day: 0,
    });
    expect(state.records.peak_impala?.value).toBe(80);
    const text = recordEntries(state)
      .flatMap((e) => e.body)
      .join('\n');
    expect(text).toContain('Most species at once: 6');
    expect(text).toContain('Poachers caught: 0');
  });

  it('records add a diary entry for notable moments, once', () => {
    const s = { ...newGame(), counters: { poachersCaught: 1 } };
    const once = runRecords(s, new Rng(1)).state;
    const twice = runRecords(once, new Rng(1)).state;
    expect(twice.journal.filter((j) => j.entryId === 'first_poacher_caught')).toHaveLength(1);
  });

  it('decisions: the choices made so far', () => {
    expect(decisionEntries(newGame())[0]?.title).toBe('No big decisions yet');
    const s = { ...newGame(), flags: { plan_relocate: true, victor_cold: true } };
    expect(decisionEntries(s).map((e) => e.body[0])).toEqual([
      'You chose to move the impala to a new home up north.',
      'You asked Victor Hale about the old pump.',
    ]);
  });
});
