// Spec Phase 7 / Phase 10 acceptance: a new player can play from the start to the end of
// the last written chapter with no dead ends. Drives the real GameSession like an attentive player, trying
// different dialogue choices on each run.
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/core/GameState';
import { play as autoPlay, type Strategy, strategies } from '../../tools/autoPlayer';
import { newGame } from '../helpers/newGame';

const play = (strategy: Strategy): GameState =>
  autoPlay({ ...newGame(7), playerName: 'Sam' }, strategy);

function summary(state: GameState): string {
  return JSON.stringify({
    chapter: state.chapter.current,
    day: state.clock.day,
    flags: Object.keys(state.flags).filter((k) => state.flags[k]),
    plains: state.populations.plains,
    veg: state.zones.plains?.vegetation,
    trust: state.scores.trust,
    plans: state.herdPlans,
    visitors: state.tourism.visitorsHistory.reduce((a, b) => a + b, 0),
    species: Object.keys(state.populations.plains ?? {}).length,
    rep: state.scores.reputation,
    counters: state.counters,
    staff: state.staff.map((m) => `${m.role}@${m.zoneId ?? '-'}`),
    goalsDone: state.story.goalsDone,
    streaks: state.story.goalStreaks,
    pending: state.story.pendingDialogues,
    money: state.resources.money,
  });
}

describe('playthrough: start to end of the last written chapter (Phase 7/10 acceptance)', () => {
  for (const [name, strategy] of Object.entries(strategies)) {
    it(`completes with "${name}" dialogue choices`, () => {
      const state = play(strategy);
      expect(state.flags.chapter_1_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_2_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_3_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_4_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_5_complete, summary(state)).toBe(true);
      expect(state.flags.hale_resolved).toBe(true);
      expect(state.flags.chapter_6_complete, summary(state)).toBe(true);
      expect(state.flags.epilogue_ready).toBe(true);
      expect(
        ['ending_thriving', 'ending_profitable', 'ending_fortress'].some((f) => state.flags[f]),
      ).toBe(true);
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
          'ch3_wanjiru',
          'ch3_plan',
          'ch3_border',
          'chapter_3_end',
          'ch4_victor',
          'ch4_kito',
          'ch4_rhino',
          'chapter_4_end',
          'ch5_kito',
          'ch5_hale',
          'chapter_5_end',
          'ch6_legacy',
          'chapter_6_end',
        ]),
      );
    });
  }
});
