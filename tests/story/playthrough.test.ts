// Spec Phase 7 acceptance: a new player can play from the start to the end of Chapter 2
// with no dead ends. Drives the real GameSession like an attentive player, trying
// different dialogue choices on each run.
import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/core/GameSession';
import type { GameState } from '../../src/core/GameState';
import { fencesBlocking } from '../../src/story/StoryManager';
import { visibleClues } from '../../src/story/storyCommands';
import { newGame } from '../helpers/newGame';

type Strategy = (offered: number[], step: number) => number | undefined;
const strategies: Record<string, Strategy> = {
  first: (o) => o[0],
  last: (o) => o.at(-1),
  alternate: (o, step) => o[step % o.length],
};
const DAY_MS = 120_000;
const MAX_DAYS = 150;

function play(strategy: Strategy): GameState {
  const session = new GameSession({ ...newGame(7), playerName: 'Sam' });
  session.beginStory();
  let step = 0;
  for (let day = 0; day < MAX_DAYS && !session.state.flags.chapter_2_complete; day++) {
    // Finish every queued conversation, picking choices by strategy.
    for (let guard = 0; guard < 500 && session.dialogueView; guard++) {
      const offered = session.dialogueView.choices.map((c) => c.index);
      session.advanceDialogue(strategy(offered, step++));
    }
    // An attentive player: mend the gate, keep Waterhole A full, then build, hire, investigate.
    if (session.state.fences.hq_gate?.status === 'broken') {
      session.dispatch({ type: 'repairFence', segmentId: 'hq_gate' });
    }
    while ((session.state.waterholes.waterhole_a?.level ?? 100) < 60) {
      if (!session.dispatch({ type: 'refillWaterhole', id: 'waterhole_a' }).ok) break;
    }
    if (session.state.chapter.current >= 2) {
      for (const clue of visibleClues(session.state))
        session.dispatch({ type: 'examineClue', clueId: clue.id });
      session.dispatch({ type: 'build', slotId: 'pump_a', buildingId: 'borehole_pump' });
      if (!session.state.staff.length) {
        session.dispatch({ type: 'hire', role: 'ranger' });
        const ranger = session.state.staff[0];
        if (ranger) session.dispatch({ type: 'assignStaff', staffId: ranger.id, zoneId: 'plains' });
      }
      if (session.state.resources.money > 300) {
        for (const id of fencesBlocking(session.state, 'river'))
          session.dispatch({ type: 'repairFence', segmentId: id });
      }
    }
    // A day passes (if a conversation is waiting it starts instead; the loop above plays it).
    session.update(DAY_MS);
  }
  return session.state;
}

function summary(state: GameState): string {
  return JSON.stringify({
    chapter: state.chapter.current,
    day: state.clock.day,
    goalsDone: state.story.goalsDone,
    streaks: state.story.goalStreaks,
    pending: state.story.pendingDialogues,
    money: state.resources.money,
  });
}

describe('playthrough: start to end of Chapter 2 (Phase 7 acceptance)', () => {
  for (const [name, strategy] of Object.entries(strategies)) {
    it(`completes with "${name}" dialogue choices`, () => {
      const state = play(strategy);
      expect(state.flags.chapter_1_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_2_complete, summary(state)).toBe(true);
      expect(state.flags.ch2_mystery_solved).toBe(true);
      // Nothing left waiting: every scene that was queued got played.
      expect(state.story.pendingDialogues).toEqual([]);
      // The story left a trail in the journal. (Opening the river is optional in
      // Chapter 2; StoryManager.test covers it.)
      expect(state.journal.map((j) => j.entryId)).toEqual(
        expect.arrayContaining([
          'chapter_1_start',
          'gate_mended',
          'first_drink',
          'mystery',
          'pump_running',
          'chapter_2_end',
        ]),
      );
    });
  }
});
