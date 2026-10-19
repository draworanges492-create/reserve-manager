// Story-side player commands (spec §4 Commands).
import type { CommandResult } from '../core/Commands';
import type { GameState } from '../core/GameState';
import { allHold } from './conditions';
import { chapterDef } from './content';

/** The clues the player can click right now (spec §9.2 Ch 2 investigation). */
export function visibleClues(state: GameState) {
  return (chapterDef(state.chapter.current)?.clues ?? []).filter(
    (c) => !state.flags[c.flag] && allHold(state, c.visibleWhen),
  );
}

/** Look at a clue: plays its dialogue (which sets the clue's flag). */
export function examineClue(state: GameState, clueId: string): CommandResult {
  const clue = chapterDef(state.chapter.current)?.clues.find((c) => c.id === clueId);
  if (!clue) return { ok: false, reason: 'command.unknownClue' };
  if (!visibleClues(state).includes(clue) || state.story.pendingDialogues.includes(clue.dialogue)) {
    return { ok: false, reason: 'command.clueNotNow' };
  }
  return {
    ok: true,
    state: {
      ...state,
      story: { ...state.story, pendingDialogues: [...state.story.pendingDialogues, clue.dialogue] },
    },
    events: [],
  };
}
