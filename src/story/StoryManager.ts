// Chapters, goals, scripted beats and zone opening (spec §9.2). Pure functions over the state;
// `runStory` is step 11 of the day tick, and GameSession also calls `evaluateStory` after
// every player action so story beats respond immediately.
import { ZONE_DEFS } from '../core/content';
import type { GameState } from '../core/GameState';
import type { SimEvent, SimStep } from '../sim/types';
import { allHold } from './conditions';
import { chapterDef, CHAPTERS, journalTemplate } from './content';
import type { Goal } from './types';

export interface StoryResult {
  state: GameState;
  events: SimEvent[];
}

function queue(state: GameState, dialogueId: string): GameState {
  if (state.story.pendingDialogues.includes(dialogueId)) return state;
  return {
    ...state,
    story: { ...state.story, pendingDialogues: [...state.story.pendingDialogues, dialogueId] },
  };
}

function addJournal(state: GameState, entryId: string, events: SimEvent[]): GameState {
  // Only beats with a written journal entry get one.
  if (!journalTemplate(entryId) || state.journal.some((j) => j.entryId === entryId)) return state;
  events.push({ type: 'journalAdded', payload: { entryId } });
  return {
    ...state,
    journal: [...state.journal, { entryId, day: state.clock.day, chapter: state.chapter.current }],
  };
}

/**
 * A zone opens once its chapter has come and every fence it owns that faces already-open
 * land is mended (spec §5; DECISIONS D79 — outer fences can wait until you can reach them).
 */
export function zonesToOpen(state: GameState): string[] {
  return ZONE_DEFS.filter((def) => {
    if (state.zones[def.id]?.unlocked || def.unlockChapter > state.chapter.current) return false;
    const facing = Object.values(state.fences).filter(
      (f) => f.zoneId === def.id && f.borders !== null && state.zones[f.borders]?.unlocked,
    );
    return facing.length > 0 && facing.every((f) => f.status === 'intact');
  }).map((def) => def.id);
}

/** Fences that still need mending before `zoneId` can open (for hints and the tracker). */
export function fencesBlocking(state: GameState, zoneId: string): string[] {
  return Object.entries(state.fences)
    .filter(
      ([, f]) =>
        f.zoneId === zoneId &&
        f.borders !== null &&
        state.zones[f.borders]?.unlocked &&
        f.status !== 'intact',
    )
    .map(([id]) => id);
}

function goalHoldsNow(state: GameState, goal: Goal): boolean {
  return allHold(state, goal.conditions);
}

/** Goal progress for the tracker: done, and for timed goals how many days so far. */
export function goalProgress(state: GameState, goal: Goal): { done: boolean; days: number } {
  const done = state.story.goalsDone.includes(goal.id);
  return { done, days: done ? (goal.days ?? 0) : (state.story.goalStreaks[goal.id] ?? 0) };
}

/**
 * Check goals, scripted beats, zone opening and chapter completion. `dayPassed` advances
 * timed goals ("keep Waterhole A at 30+ for 3 days"); actions only check instant ones.
 */
export function evaluateStory(input: GameState, dayPassed: boolean): StoryResult {
  const events: SimEvent[] = [];
  let state = input;
  const chapter = chapterDef(state.chapter.current);

  // Zones whose fences are now mended.
  const opening = zonesToOpen(state);
  if (opening.length) {
    const zones = { ...state.zones };
    for (const id of opening) {
      const zone = zones[id];
      if (zone) zones[id] = { ...zone, unlocked: true };
      events.push({ type: 'zoneOpened', payload: { zoneId: id } });
      state = addJournal({ ...state, zones }, `zone_${id}`, events);
    }
    state = { ...state, zones };
    events.push({ type: 'zonesChanged', payload: {} });
  }
  if (!chapter) return { state, events };

  // Goals: latch once met; timed goals need consecutive days.
  const story = {
    ...state.story,
    goalStreaks: { ...state.story.goalStreaks },
    goalsDone: [...state.story.goalsDone],
  };
  for (const goal of chapter.goals) {
    if (story.goalsDone.includes(goal.id)) continue;
    const holdsNow = goalHoldsNow(state, goal);
    let met = holdsNow && !goal.days;
    if (goal.days) {
      if (dayPassed)
        story.goalStreaks[goal.id] = holdsNow ? (story.goalStreaks[goal.id] ?? 0) + 1 : 0;
      met = (story.goalStreaks[goal.id] ?? 0) >= goal.days;
    }
    if (met) {
      story.goalsDone.push(goal.id);
      events.push({ type: 'goalCompleted', payload: { goalId: goal.id, chapter: chapter.id } });
    }
  }
  state = { ...state, story };

  // Scripted beats (each fires once).
  for (const beat of chapter.scriptedEvents) {
    if (state.story.firedEvents.includes(beat.id) || !allHold(state, beat.when)) continue;
    state = queue(
      { ...state, story: { ...state.story, firedEvents: [...state.story.firedEvents, beat.id] } },
      beat.dialogue,
    );
  }

  // All goals met: play the chapter's completion scene (the chapter advances after it).
  const allDone = chapter.goals.every((g) => state.story.goalsDone.includes(g.id));
  if (allDone && !state.story.completionQueued) {
    state = queue(
      { ...state, story: { ...state.story, completionQueued: true } },
      chapter.completionDialogue,
    );
  }
  return { state, events };
}

export const runStory: SimStep = (state) => evaluateStory(state, true);

/** Start a chapter: reset goal tracking, queue its intro, note it in the journal. */
export function startChapter(input: GameState, chapterId: number): StoryResult {
  const events: SimEvent[] = [{ type: 'chapterStarted', payload: { chapter: chapterId } }];
  let state: GameState = {
    ...input,
    chapter: { current: chapterId, startDay: input.clock.day },
    story: { ...input.story, goalStreaks: {}, completionQueued: false },
  };
  const chapter = chapterDef(chapterId);
  if (chapter) {
    state = queue(state, chapter.introDialogue);
    state = addJournal(state, `chapter_${chapterId}_start`, events);
  }
  const checked = evaluateStory(state, false);
  return { state: checked.state, events: [...events, ...checked.events] };
}

/** After a dialogue ends: a chapter's completion scene moves the story on. */
export function afterDialogue(state: GameState, dialogueId: string): StoryResult {
  const chapter = chapterDef(state.chapter.current);
  if (!chapter || chapter.completionDialogue !== dialogueId) return { state, events: [] };
  const events: SimEvent[] = [];
  let next = addJournal(state, `chapter_${chapter.id}_end`, events);
  const following = chapterDef(chapter.id + 1);
  if (!following) {
    // Last written chapter (Milestone A ends after Chapter 2): free play continues.
    next = {
      ...next,
      flags: { ...next.flags, [`chapter_${chapter.id}_complete`]: true, story_paused: true },
    };
    return { state: next, events };
  }
  next = { ...next, flags: { ...next.flags, [`chapter_${chapter.id}_complete`]: true } };
  const started = startChapter(next, following.id);
  return { state: started.state, events: [...events, ...started.events] };
}

export function lastChapterId(): number {
  return Math.max(0, ...CHAPTERS.map((c) => c.id));
}
