import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSettings } from '../../src/core/Settings';
import { chapterDef } from '../../src/story/content';
import { goalTip, markSeen, resetTips, resetTipsCache, tipFor, TIPS } from '../../src/ui/tips';
import { newGame } from '../helpers/newGame';

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

describe("Tendai's tips (D150)", () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
    resetTipsCache();
    updateSettings({ tips: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetTipsCache();
  });

  it('every tip has a unique id and points at a real goal', () => {
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
    const goals = [1, 2, 3, 4, 5, 6].flatMap((c) => chapterDef(c)?.goals.map((g) => g.id) ?? []);
    for (const tip of TIPS) if (tip.goal) expect(goals).toContain(tip.goal);
  });

  it('shows each tip once per browser, and not at all when switched off', () => {
    expect(tipFor('menu_build')?.id).toBe('menu_build');
    markSeen('menu_build');
    resetTipsCache(); // as if the page reloaded
    expect(tipFor('menu_build')).toBeNull();
    resetTips();
    expect(tipFor('menu_build')?.id).toBe('menu_build');
    updateSettings({ tips: false });
    expect(tipFor('menu_build')).toBeNull();
  });

  it('an idle player gets a tip for their first unfinished goal', () => {
    const s = newGame();
    expect(goalTip(s)?.goal).toBe('g_gate');
    const gateDone = { ...s, story: { ...s.story, goalsDone: ['g_gate'] } };
    expect(goalTip(gateDone)?.goal).toBe('g_water');
    markSeen('goal_g_water');
    expect(goalTip(gateDone)?.goal).toBe('g_drink');
    // Later chapters lean on the story's own hints instead.
    expect(goalTip({ ...s, chapter: { ...s.chapter, current: 3 } })).toBeNull();
  });
});
