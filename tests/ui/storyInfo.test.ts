import { describe, expect, it } from 'vitest';
import { runDayTick } from '../../src/sim/tick';
import { afterDialogue, startChapter } from '../../src/story/StoryManager';
import { fenceTooltip, trackerContent } from '../../src/ui/storyInfo';
import { newGame, withLevel } from '../helpers/newGame';

const begin = () => startChapter(newGame(), 1).state;
const chapter2 = () =>
  afterDialogue(
    { ...begin(), story: { ...begin().story, completionQueued: true } },
    'ch01_complete',
  ).state;

describe('goal tracker', () => {
  it('lists the chapter goals with live progress', () => {
    let state = withLevel(begin(), 'waterhole_a', 90);
    state = runDayTick(state).state;
    expect(trackerContent(state)).toEqual({
      title: 'Chapter 1 · Ruin',
      goals: [
        { text: 'Mend the main gate', done: false },
        { text: 'Keep Waterhole A at 30+ for 3 days (1/3)', done: false },
        { text: 'See the first animals come to drink', done: false },
      ],
    });
  });

  it('counts clues found in Chapter 2', () => {
    const state = { ...chapter2(), flags: { ...chapter2().flags, clue_pipe: true } };
    expect(trackerContent(state).goals[0]?.text).toBe(
      'Find out what happened to the old pump (1/3 clues)',
    );
  });

  it('switches to free play when the written story ends', () => {
    expect(trackerContent({ ...begin(), flags: { story_paused: true } }).goals).toEqual([]);
  });
});

describe('fence tooltip', () => {
  it('tells you what mending costs, and what it opens', () => {
    expect(fenceTooltip(begin(), 'hq_gate')).toEqual(['Broken fence · click to mend (20, 1 day)']);
    expect(fenceTooltip(chapter2(), 'river_e0')).toEqual([
      'Broken fence · click to mend (20, 1 day)',
      'Mending this helps open River & Wetland',
    ]);
    expect(fenceTooltip(begin(), 'river_e0')).toEqual(["Broken fence: can't be reached yet"]);
  });
});
