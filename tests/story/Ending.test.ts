import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/core/GameState';
import { chooseEnding, epilogueSlides } from '../../src/story/Ending';
import { afterDialogue } from '../../src/story/StoryManager';
import { newGame } from '../helpers/newGame';

const reserve = (
  scores: Partial<GameState['scores']>,
  flags: Record<string, boolean>,
  money = 2000,
): GameState => {
  const s = newGame(1, 'Sam');
  return {
    ...s,
    scores: { ...s.scores, ...scores },
    flags: { ...s.flags, ...flags },
    resources: { money },
  };
};

describe('endings (spec §9.3, D126)', () => {
  it('healthy and trusted, Hale exposed: Thriving Wilderness', () => {
    expect(
      chooseEnding(reserve({ ecosystem: 85, trust: 60, reputation: 70 }, { hale_exposed: true })),
    ).toBe('thriving');
  });
  it('took Hale’s money: Profitable but Compromised', () => {
    expect(
      chooseEnding(
        reserve({ ecosystem: 85, trust: 40, reputation: 70 }, { hale_deal: true }, 9000),
      ),
    ).toBe('profitable');
  });
  it('healthy but sealed off from the village: Fortress Reserve', () => {
    expect(
      chooseEnding(reserve({ ecosystem: 85, trust: 30, reputation: 60 }, { hale_lockdown: true })),
    ).toBe('fortress');
  });

  it('epilogue: one slide per decision, then the ending, then credits', () => {
    const state = reserve(
      { ecosystem: 85, trust: 60 },
      {
        plan_cull: true,
        border_beehive: true,
        victor_declined: true,
        kito_talked: true,
        hale_exposed: true,
      },
    );
    const slides = epilogueSlides(state, 'thriving');
    expect(slides.map((s) => s.title)).toEqual([
      'The impala',
      'The village',
      'The lodge',
      'Kito',
      'The rhinos',
      'Victor Hale',
      'Thriving Wilderness',
      'Thank you for playing',
    ]);
    expect(slides[6]?.text).toContain('Sam');
  });

  it('finishing Chapter 6 picks the ending and readies the epilogue', () => {
    const s = reserve({ ecosystem: 85, trust: 60 }, { hale_exposed: true });
    const after = afterDialogue(
      { ...s, chapter: { current: 6, startDay: 0 } },
      'ch06_complete',
    ).state;
    expect(after.flags).toMatchObject({
      chapter_6_complete: true,
      ending_thriving: true,
      epilogue_ready: true,
      story_paused: true,
    });
  });
});
