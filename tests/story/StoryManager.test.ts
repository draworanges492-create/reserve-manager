import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import type { GameState } from '../../src/core/GameState';
import { runDayTick } from '../../src/sim/tick';
import {
  afterDialogue,
  evaluateStory,
  fencesBlocking,
  startChapter,
} from '../../src/story/StoryManager';
import { visibleClues } from '../../src/story/storyCommands';
import { must, newGame, withLevel } from '../helpers/newGame';

const ok = (state: GameState, ...cmds: Parameters<typeof applyCommand>[1][]) =>
  cmds.reduce((s, c) => {
    const r = applyCommand(s, c);
    if (!r.ok) throw new Error(`${c.type}: ${r.reason}`);
    return r.state;
  }, state);
const begin = () => startChapter(newGame(), 1).state;

describe('chapter start', () => {
  it('queues the intro and writes the first journal entry', () => {
    const state = begin();
    expect(state.story.pendingDialogues).toEqual(['ch01_arrival']);
    expect(state.journal.map((j) => j.entryId)).toEqual(['chapter_1_start']);
  });
});

describe('goals', () => {
  it('latches an instant goal and fires its scripted beat', () => {
    let state = ok(begin(), { type: 'repairFence', segmentId: 'hq_gate' });
    state = runDayTick(state).state; // repair takes a day
    expect(state.story.goalsDone).toContain('g_gate');
    expect(state.story.pendingDialogues).toContain('ch01_gate_done');
  });

  it('needs a timed goal to hold on consecutive days, and resets the streak if it slips', () => {
    let state = withLevel(begin(), 'waterhole_a', 100);
    state = runDayTick(state).state;
    state = runDayTick(state).state;
    expect(state.story.goalStreaks.g_water).toBe(2);
    state = runDayTick(withLevel(state, 'waterhole_a', 0)).state;
    expect(state.story.goalStreaks.g_water).toBe(0);
    state = withLevel(state, 'waterhole_a', 100);
    for (let i = 0; i < 3; i++) state = runDayTick(state).state;
    expect(state.story.goalsDone).toContain('g_water');
  });

  it('queues the completion scene once every goal is met, then moves to the next chapter', () => {
    let state: GameState = {
      ...begin(),
      story: { ...begin().story, goalsDone: ['g_gate', 'g_water'] },
      flags: { ch1_first_drink: true },
    };
    state = evaluateStory(state, false).state;
    expect(state.story.pendingDialogues).toContain('ch01_complete');
    const next = afterDialogue(state, 'ch01_complete').state;
    expect(next.chapter.current).toBe(2);
    expect(next.story.pendingDialogues).toContain('ch02_intro');
    expect(next.flags.chapter_1_complete).toBe(true);
  });

  it('after the last written chapter, keeps playing without advancing', () => {
    const state = { ...begin(), chapter: { current: 2 } };
    const after = afterDialogue(state, 'ch02_complete').state;
    expect(after.chapter.current).toBe(2);
    expect(after.flags).toMatchObject({ chapter_2_complete: true, story_paused: true });
  });
});

describe('zones open by mending fences (spec §5)', () => {
  const chapter2 = () =>
    afterDialogue(
      { ...begin(), story: { ...begin().story, completionQueued: true } },
      'ch01_complete',
    ).state;

  it('the river needs only its fences facing open land', () => {
    const state = chapter2();
    expect(fencesBlocking(state, 'river').sort()).toEqual(['river_e0', 'river_e1']);
    expect(applyCommand(state, { type: 'repairFence', segmentId: 'river_s0' })).toEqual({
      ok: false,
      reason: 'command.fenceNotYet',
    });
  });

  it('opens once those are mended', () => {
    let state = ok(
      chapter2(),
      { type: 'repairFence', segmentId: 'river_e0' },
      { type: 'repairFence', segmentId: 'river_e1' },
    );
    state = runDayTick(state).state;
    expect(must(state.zones.river).unlocked).toBe(true);
    expect(state.journal.map((j) => j.entryId)).toContain('zone_river');
  });

  it("can't mend a later chapter's fences early", () => {
    expect(applyCommand(begin(), { type: 'repairFence', segmentId: 'river_e0' })).toEqual({
      ok: false,
      reason: 'command.fenceNotYet',
    });
  });

  it('fence crews mend reachable fences by themselves', () => {
    let state = ok(chapter2(), { type: 'hire', role: 'fence_crew' });
    state = runDayTick(state).state;
    state = runDayTick(state).state;
    expect(must(state.zones.river).unlocked).toBe(true); // the two blocking fences went first
  });
});

describe('clues (Chapter 2 investigation)', () => {
  it('show only in their chapter until examined', () => {
    expect(visibleClues(begin())).toEqual([]);
    const state = afterDialogue(
      { ...begin(), story: { ...begin().story, completionQueued: true } },
      'ch01_complete',
    ).state;
    expect(visibleClues(state).map((c) => c.id)).toEqual([
      'clue_pipe',
      'clue_tracks',
      'clue_logbook',
    ]);
    const examined = ok(state, { type: 'examineClue', clueId: 'clue_pipe' });
    expect(examined.story.pendingDialogues).toContain('ch02_clue_pipe');
    expect(
      visibleClues({ ...examined, flags: { ...examined.flags, clue_pipe: true } }),
    ).toHaveLength(2);
  });
});
