import { describe, expect, it, vi } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import type { GameState } from '../../src/core/GameState';
import { GameSession } from '../../src/core/GameSession';
import {
  deleteSlot,
  deserialize,
  latestSlot,
  listSlots,
  memorySaveStore,
  readSlot,
  serialize,
  type SaveStore,
  SAVE_FORMAT,
  writeSlot,
} from '../../src/core/Save';
import { runDayTick } from '../../src/sim/tick';
import { startChapter } from '../../src/story/StoryManager';
import { must, newGame } from '../helpers/newGame';

/** A game with some history: a ranger, a refilled waterhole, days of sim (and RNG use). */
function played(days: number, start: GameState = startChapter(newGame(11), 1).state): GameState {
  let state = start;
  const hired = applyCommand(state, { type: 'hire', role: 'ranger' });
  if (hired.ok) state = hired.state;
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 8; i++) {
      const r = applyCommand(state, { type: 'refillWaterhole', id: 'waterhole_a' });
      if (r.ok) state = r.state;
    }
    state = runDayTick(state).state;
  }
  return state;
}

const load = (json: string): GameState => {
  const r = deserialize(json);
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('save round trip (Phase 8 acceptance: reload restores exact state)', () => {
  it('restores every field', () => {
    const state = played(20);
    expect(load(serialize(state, '2026-10-20T10:00:00Z'))).toEqual(state);
  });

  it('continues exactly as if never saved, RNG included', () => {
    const halfway = played(30);
    const reloaded = load(serialize(halfway, 'x'));
    let a = halfway;
    let b = reloaded;
    for (let d = 0; d < 30; d++) {
      a = runDayTick(a).state;
      b = runDayTick(b).state;
    }
    expect(b).toEqual(a);
    expect(b.rngState).toBe(a.rngState);
  });

  it('summarises the save for the slot list', () => {
    const state = { ...played(5), playerName: 'Sam', meta: { playTimeSeconds: 754.9 } };
    const r = deserialize(serialize(state, '2026-10-20T10:00:00Z'));
    expect(r.ok && r.summary).toEqual({
      playerName: 'Sam',
      chapter: 1,
      day: 5,
      money: Math.floor(state.resources.money),
      playTimeSeconds: 754,
      savedAt: '2026-10-20T10:00:00Z',
    });
  });
});

describe('versions (Phase 8 acceptance: mismatch handled gracefully)', () => {
  it('migrates a version-1 save (before play time existed)', () => {
    const current = played(3);
    const v1State: Record<string, unknown> = { ...current, version: 1 };
    delete v1State.meta;
    delete v1State.encyclopedia;
    const json = JSON.stringify({ format: SAVE_FORMAT, version: 1, summary: {}, state: v1State });
    const loaded = load(json);
    expect(loaded.version).toBe(3);
    expect(loaded.meta).toEqual({ playTimeSeconds: 0 });
    expect({
      ...loaded,
      meta: current.meta,
      version: current.version,
      encyclopedia: current.encyclopedia,
    }).toEqual(current);
  });

  it('migrates a version-2 save: animals already in the reserve count as seen', () => {
    const current = played(3);
    const v2State: Record<string, unknown> = { ...current, version: 2 };
    delete v2State.encyclopedia;
    const loaded = load(
      JSON.stringify({ format: SAVE_FORMAT, version: 2, summary: {}, state: v2State }),
    );
    expect(loaded.version).toBe(3);
    expect(loaded.encyclopedia).toEqual(['impala', 'lion', 'zebra']);
  });

  it('refuses a save from a newer version instead of guessing', () => {
    const json = JSON.stringify({ format: SAVE_FORMAT, version: 99, summary: {}, state: {} });
    expect(deserialize(json)).toEqual({ ok: false, error: 'tooNew' });
  });

  it('reports damaged, foreign and missing saves', () => {
    expect(deserialize('{not json')).toEqual({ ok: false, error: 'corrupt' });
    expect(deserialize(JSON.stringify({ hello: 'world' }))).toEqual({
      ok: false,
      error: 'notASave',
    });
    expect(deserialize(null)).toEqual({ ok: false, error: 'empty' });
  });
});

describe('slots', () => {
  it('writes, lists, finds the latest, and deletes', () => {
    const store = memorySaveStore();
    writeSlot(store, '1', played(2), '2026-10-20T09:00:00Z');
    writeSlot(store, 'auto', played(4), '2026-10-20T11:00:00Z');
    writeSlot(store, '3', played(1), '2026-10-20T10:00:00Z');
    expect(listSlots(store).map((s) => [s.slot, s.result.ok])).toEqual([
      ['auto', true],
      ['1', true],
      ['2', false],
      ['3', true],
    ]);
    expect(latestSlot(store)).toBe('auto');
    deleteSlot(store, 'auto');
    expect(latestSlot(store)).toBe('3');
    expect(readSlot(store, 'auto')).toEqual({ ok: false, error: 'empty' });
  });

  it('reports a failed write (storage full or blocked) instead of crashing', () => {
    const full: SaveStore = {
      read: () => null,
      write: () => {
        throw new Error('QuotaExceededError');
      },
      remove: () => undefined,
    };
    expect(writeSlot(full, '1', newGame(), 'x')).toBe(false);
  });
});

describe('GameSession saving', () => {
  it('autosaves after every day', () => {
    const onDayEnd = vi.fn();
    const session = new GameSession(newGame(), onDayEnd);
    session.update(120_000 * 3);
    expect(onDayEnd).toHaveBeenCalledTimes(3);
    expect(must(onDayEnd.mock.calls.at(-1)?.[0] as GameState | undefined).clock.day).toBe(3);
  });

  it('a save made mid-conversation replays that conversation after loading', () => {
    const session = new GameSession(newGame());
    session.beginStory();
    session.update(16); // starts the intro; the clock is now paused for it
    expect(session.dialogueView).not.toBeNull();
    const snapshot = session.saveSnapshot();
    expect(snapshot.story.pendingDialogues[0]).toBe('ch01_arrival');
    expect(snapshot.clock.paused).toBe(false); // the player's own setting, not the dialogue pause

    const resumed = new GameSession(load(serialize(snapshot, 'x')));
    resumed.update(16);
    expect(resumed.dialogueView?.text).toBe(session.dialogueView?.text);
  });
});
