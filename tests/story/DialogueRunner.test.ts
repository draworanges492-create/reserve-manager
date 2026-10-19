import { describe, expect, it } from 'vitest';
import { advance, startDialogue, viewOf } from '../../src/story/DialogueRunner';
import { must, newGame } from '../helpers/newGame';

const named = () => ({ ...newGame(), playerName: 'Sam' });

describe('DialogueRunner (spec §9.1)', () => {
  it('starts at "start", fills in the player name, and shows speaker and portrait', () => {
    const step = startDialogue(named(), 'ch01_complete');
    const view = viewOf(step.state, must(step.cursor));
    expect(view?.speakerName).toBe('');
    const next = advance(step.state, must(step.cursor));
    const tendai = viewOf(next.state, must(next.cursor));
    expect(tendai).toMatchObject({
      speakerName: 'Tendai',
      portraitKey: 'portrait-tendai',
      expression: 'happy',
      text: 'Not bad for a beginner, Sam. Not bad at all.',
    });
  });

  it('branches on a choice and applies its effects', () => {
    let step = startDialogue(named(), 'ch01_arrival');
    while (!viewOf(step.state, must(step.cursor))?.choices.length)
      step = advance(step.state, must(step.cursor));
    // First choice: "You must be Tendai…" → +5 relationship.
    step = advance(step.state, must(step.cursor), 0);
    expect(step.state.relationships.tendai).toBe(5);
    expect(viewOf(step.state, must(step.cursor))?.text).toMatch(/honey badger/);
  });

  it('ignores a choice that is not offered', () => {
    let step = startDialogue(named(), 'ch01_arrival');
    while (!viewOf(step.state, must(step.cursor))?.choices.length)
      step = advance(step.state, must(step.cursor));
    const stuck = advance(step.state, must(step.cursor), 7);
    expect(stuck.cursor).toEqual(step.cursor);
  });

  it('follows conditional branches', () => {
    const run = (flags: Record<string, boolean>) => {
      let step = startDialogue({ ...named(), flags }, 'ch01_gate_done');
      step = advance(step.state, must(step.cursor)); // passes through the branch node
      return viewOf(step.state, must(step.cursor))?.text;
    };
    expect(run({ ch1_fence_first: true })).toMatch(/^Now, water/);
    expect(run({})).toMatch(/^A shut gate/);
  });

  it('ends with a null cursor and keeps node effects (flags, journal)', () => {
    let step = startDialogue(named(), 'ch01_first_drink');
    for (let i = 0; i < 10 && step.cursor; i++) {
      const view = viewOf(step.state, step.cursor);
      step = advance(step.state, step.cursor, view?.choices[0]?.index);
    }
    expect(step.cursor).toBeNull();
    expect(step.state.flags.ch1_first_drink).toBe(true);
    expect(step.state.journal.map((j) => j.entryId)).toEqual(['first_drink']);
  });

  it('returns no cursor for an unknown dialogue', () => {
    expect(startDialogue(named(), 'nope').cursor).toBeNull();
  });
});
