// Release checklist (spec §15, D144): real saves written by every earlier version of the
// game (v2 = Phase 8, v3 = Milestone A, up to v6) still load and keep playing.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/core/GameSession';
import { STATE_VERSION, withWorldUpdates } from '../../src/core/GameState';
import { deserialize, serialize } from '../../src/core/Save';
import { WORLD } from '../helpers/newGame';

const DIR = join(import.meta.dirname, '../fixtures/saves');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

describe('saves from older versions', () => {
  it('has a fixture for every old version', () => {
    const versions = new Set(files.map((f) => Number(/^v(\d+)/.exec(f)?.[1])));
    for (let v = 2; v < STATE_VERSION; v++) expect(versions.has(v), `v${v}`).toBe(true);
  });

  for (const file of files) {
    it(`${file} loads, plays 40 more days and saves again`, () => {
      const loaded = deserialize(readFileSync(join(DIR, file), 'utf8'));
      if (!loaded.ok) throw new Error(`${file}: ${loaded.error}`);
      expect(loaded.state.version).toBe(STATE_VERSION);
      const start = withWorldUpdates(loaded.state, WORLD);
      const session = new GameSession(start);
      for (let day = 0; day < 40; day++) {
        for (let g = 0; g < 200 && session.dialogueView; g++)
          session.advanceDialogue(session.dialogueView.choices[0]?.index);
        session.update(120_000);
      }
      const s = session.state;
      expect(s.clock.day).toBeGreaterThan(start.clock.day);
      expect(s.playerName).toBe('Old Save');
      for (const v of [s.resources.money, ...Object.values(s.scores)])
        expect(Number.isFinite(v)).toBe(true);
      for (const herd of Object.values(s.populations))
        for (const n of Object.values(herd)) expect(n).toBeGreaterThanOrEqual(0);
      // Field notes carry over every sighting; records (v7) start from the load.
      for (const id of start.encyclopedia) expect(s.fieldNotes[id]).toBeDefined();
      expect(Object.keys(s.records).length).toBeGreaterThan(0);
      const again = deserialize(serialize(session.saveSnapshot(), '2026-10-25T00:00:00.000Z'));
      expect(again.ok).toBe(true);
    });
  }
});
