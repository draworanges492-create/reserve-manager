// First-hour tips from Tendai (Phase 15, D150): short, non-blocking help for the interface
// and for players who seem stuck. Each tip shows once per browser (not again in a new game)
// and the whole thing can be switched off in Settings.
import tipsData from '../data/tips.json';
import type { GameState } from '../core/GameState';
import { getSettings } from '../core/Settings';
import { chapterDef } from '../story/content';

export interface Tip {
  id: string;
  text: string;
  /** Goal this tip helps with (shown when the player is idle and it isn't done). */
  goal?: string;
  /** "Show me" moves the camera here (tiles). */
  focus?: { x: number; y: number };
}

export const TIPS: Tip[] = (tipsData as { tips: Tip[] }).tips;
const STORAGE_KEY = 'reserve-manager.tips.v1';
/** Real seconds without a click or key press before a goal tip appears. */
export const IDLE_SECONDS = 40;
/** Goal tips only cover the first chapters; the story's own hints take over later. */
export const GOAL_TIP_LAST_CHAPTER = 2;

let seen: Set<string> | null = null;

function load(): Set<string> {
  if (seen) return seen;
  try {
    const raw: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '[]');
    seen = new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    seen = new Set();
  }
  return seen;
}

export function tipById(id: string): Tip | undefined {
  return TIPS.find((t) => t.id === id);
}

/** The tip to show for this trigger, or null if tips are off or it was seen already. */
export function tipFor(id: string): Tip | null {
  if (!getSettings().tips || load().has(id)) return null;
  return tipById(id) ?? null;
}

export function markSeen(id: string): void {
  const s = load();
  s.add(id);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch {
    // Storage blocked: it just won't be remembered.
  }
}

/** "Show tips again" in Settings. */
export function resetTips(): void {
  seen = new Set();
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The first unfinished goal of the chapter that has a tip, for an idle player. */
export function goalTip(state: GameState): Tip | null {
  if (state.chapter.current > GOAL_TIP_LAST_CHAPTER) return null;
  const goals = chapterDef(state.chapter.current)?.goals ?? [];
  for (const g of goals) {
    if (state.story.goalsDone.includes(g.id)) continue;
    const tip = TIPS.find((t) => t.goal === g.id);
    const fresh = tip && tipFor(tip.id);
    if (fresh) return fresh;
  }
  return null;
}

/** Tests only. */
export function resetTipsCache(): void {
  seen = null;
}
