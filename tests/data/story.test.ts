import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHARACTERS, DIALOGUES, JOURNAL } from '../../src/story/content';
import type { Dialogue } from '../../src/story/types';
import { BUILDINGS, SPECIES, STAFF_ROLES, ZONE_DEFS } from '../../src/core/content';
import { WORLD } from '../helpers/newGame';
import { checkStory, type StoryRefs } from '../../tools/data/storyChecks';

// The real game data and map, so every chapter's references are checked.
const refs: StoryRefs = {
  zones: ZONE_DEFS.map((z) => ({ ...z, rect: WORLD.zones[z.id] })),
  species: SPECIES.map((s) => s.id),
  buildings: BUILDINGS.map((b) => ({ id: b.id, unlockChapter: b.unlockChapter })),
  staffRoles: STAFF_ROLES.map((r) => ({ id: r.id, unlockChapter: r.unlockChapter })),
  waterholes: Object.keys(WORLD.waterholes),
  fences: Object.keys(WORLD.fences),
  events: [],
};
const content = {
  dialogues: [...DIALOGUES],
  chapters: [...CHAPTERS],
  characters: [...CHARACTERS],
  journal: [...JOURNAL],
};

describe('story content checks', () => {
  it('pass for every shipped chapter', () => {
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

describe('clue checks', () => {
  it('catch a clue whose dialogue never sets its flag (the marker would replay forever)', () => {
    const chapters = CHAPTERS.map((c) =>
      c.id === 4
        ? { ...c, clues: c.clues.map((cl) => ({ ...cl, flag: 'never_set_anywhere' })) }
        : c,
    );
    expect(checkStory({ ...content, chapters }, refs)).toEqual(
      expect.arrayContaining([expect.stringContaining('never sets flag "never_set_anywhere"')]),
    );
  });
});
