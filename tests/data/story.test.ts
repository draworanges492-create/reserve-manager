import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHARACTERS, DIALOGUES, JOURNAL } from '../../src/story/content';
import type { Dialogue } from '../../src/story/types';
import { checkStory, type StoryRefs } from '../../tools/data/storyChecks';

const refs: StoryRefs = {
  zones: [
    { id: 'hq', unlockChapter: 1, rect: { x: 36, y: 68, w: 48, h: 12 } },
    { id: 'plains', unlockChapter: 1, rect: { x: 36, y: 32, w: 48, h: 36 } },
    { id: 'river', unlockChapter: 2, rect: { x: 0, y: 32, w: 36, h: 48 } },
  ],
  species: ['impala', 'zebra', 'lion'],
  buildings: [
    { id: 'borehole_pump', unlockChapter: 2 },
    { id: 'ranger_post', unlockChapter: 2 },
  ],
  staffRoles: [
    { id: 'ranger', unlockChapter: 1 },
    { id: 'fence_crew', unlockChapter: 2 },
  ],
  waterholes: ['waterhole_a', 'waterhole_b'],
  fences: ['hq_gate', 'river_e0', 'river_e1'],
  events: [],
};
const content = {
  dialogues: [...DIALOGUES],
  chapters: [...CHAPTERS],
  characters: [...CHARACTERS],
  journal: [...JOURNAL],
};

describe('story content checks', () => {
  it('pass for the shipped Chapters 1–2', () => {
    expect(checkStory(content, refs)).toEqual([]);
  });

  it('catch dangling links, unreachable nodes, unknown speakers and bad effects', () => {
    const broken: Dialogue = {
      id: 'broken',
      nodes: {
        start: { speaker: 'tendai', text: 'Hi', next: 'nowhere' },
        orphan: {
          speaker: 'ghost',
          text: 'Boo',
          next: null,
          effects: [{ op: 'journal', entry: 'missing' }],
        },
      },
    };
    const errors = checkStory({ ...content, dialogues: [...content.dialogues, broken] }, refs);
    expect(errors).toEqual(
      expect.arrayContaining([
        'dialogue "broken" node "start": links to missing node "nowhere"',
        'dialogue "broken" node "orphan": unknown speaker "ghost"',
        'dialogue "broken" node "orphan": journal points at missing entry "missing"',
        'dialogue "broken": node "orphan" can never be reached',
      ]),
    );
  });

  it('catch a chapter pointing at a missing dialogue', () => {
    const chapters = content.chapters.map((c) =>
      c.id === 1 ? { ...c, introDialogue: 'gone' } : c,
    );
    expect(checkStory({ ...content, chapters }, refs)).toContain(
      'chapter 1: points at missing dialogue "gone"',
    );
  });
});
