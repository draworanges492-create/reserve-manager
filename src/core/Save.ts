// Save files (spec §8 Phase 8, §2 persistence): versioned JSON in localStorage, with
// migrations so saves from older versions still load, and a clear refusal for newer ones.
import { STATE_VERSION, type GameState } from './GameState';

export const SAVE_FORMAT = 'reserve-manager-save';
export const SLOT_IDS = ['auto', '1', '2', '3'] as const;
export type SlotId = (typeof SLOT_IDS)[number];
const KEY_PREFIX = 'reserve-manager.save.';

/** Shown in the slot list without loading the whole state. */
export interface SaveSummary {
  playerName: string;
  chapter: number;
  day: number;
  money: number;
  playTimeSeconds: number;
  /** ISO time the save was written (wall clock: save metadata, never used by the sim). */
  savedAt: string;
}

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  summary: SaveSummary;
  state: GameState;
}

export type LoadError = 'empty' | 'corrupt' | 'notASave' | 'tooNew';
export type LoadResult =
  { ok: true; state: GameState; summary: SaveSummary } | { ok: false; error: LoadError };

/** Where saves live. localStorage in the game; an in-memory map in tests. */
export interface SaveStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export function localSaveStore(): SaveStore {
  return {
    read: (key) => globalThis.localStorage?.getItem(key) ?? null,
    write: (key, value) => globalThis.localStorage?.setItem(key, value),
    remove: (key) => globalThis.localStorage?.removeItem(key),
  };
}

export function memorySaveStore(): SaveStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[v] upgrades a version-v state to v + 1. Never edit one once released. */
const MIGRATIONS: Record<number, Migration> = {
  1: (s) => ({ ...s, version: 2, meta: { playTimeSeconds: 0 } }),
  // v3 added the encyclopedia: anything already living in the reserve counts as seen.
  2: (s) => {
    const populations = (s.populations ?? {}) as Record<string, Record<string, number>>;
    const seen = new Set<string>();
    for (const herd of Object.values(populations))
      for (const [id, n] of Object.entries(herd)) if (n > 0) seen.add(id);
    return { ...s, version: 3, encyclopedia: [...seen].sort() };
  },
  // v4 added elephants, hyenas and vultures (D107): games started earlier get the same
  // starting groups on the Central Plains. Numbers are fixed here, not read from
  // species.json, so this migration never changes meaning.
  3: (s) => {
    const populations = { ...((s.populations ?? {}) as Record<string, Record<string, number>>) };
    const has = (id: string) => Object.values(populations).some((herd) => id in herd);
    const plains = { ...(populations.plains ?? {}) };
    for (const [id, n] of [
      ['elephant', 6],
      ['hyena', 5],
      ['vulture', 8],
    ] as const)
      if (!has(id)) plains[id] = n;
    populations.plains = plains;
    return { ...s, version: 4, populations };
  },
  // v5 (Phase 10): when the chapter began, herd plans and story counters.
  4: (s) => {
    const clock = (s.clock ?? {}) as { day?: number };
    const chapter = (s.chapter ?? {}) as { current?: number; startDay?: number };
    return {
      ...s,
      version: 5,
      // Unknown for old saves: count the current chapter as starting today.
      chapter: { current: chapter.current ?? 1, startDay: chapter.startDay ?? clock.day ?? 0 },
      herdPlans: s.herdPlans ?? {},
      counters: s.counters ?? {},
    };
  },
  // v6 (Phase 11): tourism.
  5: (s) => ({
    ...s,
    version: 6,
    tourism: s.tourism ?? { visitorsHistory: [], lastVisitors: 0, lastRevenue: 0 },
  }),
};

export function summarize(state: GameState, savedAt: string): SaveSummary {
  return {
    playerName: state.playerName,
    chapter: state.chapter.current,
    day: state.clock.day,
    money: Math.floor(state.resources.money),
    playTimeSeconds: Math.floor(state.meta.playTimeSeconds),
    savedAt,
  };
}

export function serialize(state: GameState, savedAt: string): string {
  const file: SaveFile = {
    format: SAVE_FORMAT,
    version: STATE_VERSION,
    summary: summarize(state, savedAt),
    state,
  };
  return JSON.stringify(file);
}

export function deserialize(json: string | null): LoadResult {
  if (json === null) return { ok: false, error: 'empty' };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'corrupt' };
  }
  const file = raw as Partial<SaveFile> | null;
  if (!file || file.format !== SAVE_FORMAT || typeof file.version !== 'number' || !file.state) {
    return { ok: false, error: 'notASave' };
  }
  if (file.version > STATE_VERSION) return { ok: false, error: 'tooNew' };
  let state = file.state as unknown as Record<string, unknown>;
  for (let v = file.version; v < STATE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, error: 'corrupt' };
    state = migrate(state);
  }
  const migrated = state as unknown as GameState;
  return { ok: true, state: migrated, summary: file.summary ?? summarize(migrated, '') };
}

/** Writes a save; false if storage refused (full, blocked, private mode). */
export function writeSlot(
  store: SaveStore,
  slot: SlotId,
  state: GameState,
  savedAt: string,
): boolean {
  try {
    store.write(KEY_PREFIX + slot, serialize(state, savedAt));
    return true;
  } catch {
    return false;
  }
}

export function readSlot(store: SaveStore, slot: SlotId): LoadResult {
  try {
    return deserialize(store.read(KEY_PREFIX + slot));
  } catch {
    return { ok: false, error: 'corrupt' };
  }
}

export function deleteSlot(store: SaveStore, slot: SlotId): void {
  try {
    store.remove(KEY_PREFIX + slot);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

export function listSlots(store: SaveStore): { slot: SlotId; result: LoadResult }[] {
  return SLOT_IDS.map((slot) => ({ slot, result: readSlot(store, slot) }));
}

/** The most recently written loadable save, for "Continue". */
export function latestSlot(store: SaveStore): SlotId | null {
  let best: { slot: SlotId; at: string } | null = null;
  for (const { slot, result } of listSlots(store)) {
    if (result.ok && (!best || result.summary.savedAt > best.at))
      best = { slot, at: result.summary.savedAt };
  }
  return best?.slot ?? null;
}
