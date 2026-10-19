// Runs dialogue JSON (spec §9.1): nodes, branches, conditional choices and effects.
// Pure: every step takes the game state and returns the new one.
import type { GameState } from '../core/GameState';
import type { SimEvent } from '../sim/types';
import { allHold } from './conditions';
import { characterById, dialogueById } from './content';
import { applyEffects } from './effects';
import type { DialogueNode, Expression } from './types';

export interface DialogueCursor {
  dialogueId: string;
  nodeId: string;
}

export interface DialogueStep {
  state: GameState;
  events: SimEvent[];
  /** null when the dialogue has ended. */
  cursor: DialogueCursor | null;
}

export interface DialogueView {
  speakerId: string;
  /** Empty for the narrator. */
  speakerName: string;
  /** Spritesheet key for the portrait, if the speaker has one. */
  portraitKey: string | null;
  expression: Expression;
  text: string;
  /** Choices the player may pick now (conditions already checked). `index` is what to pass back. */
  choices: { index: number; text: string }[];
  focus?: { x: number; y: number };
}

/** Guards against a dialogue whose branches loop forever. */
const MAX_HOPS = 50;

function nodeOf(cursor: DialogueCursor): DialogueNode | undefined {
  return dialogueById(cursor.dialogueId)?.nodes[cursor.nodeId];
}

export function fillText(state: GameState, text: string): string {
  return text.replaceAll('{player}', state.playerName || 'Ranger');
}

/** Enter `nodeId`: follow branches, apply the node's effects. */
function enter(state: GameState, dialogueId: string, nodeId: string | null): DialogueStep {
  const events: SimEvent[] = [];
  const current = state;
  let id = nodeId;
  for (let hops = 0; id !== null && hops < MAX_HOPS; hops++) {
    const node = dialogueById(dialogueId)?.nodes[id];
    if (!node) return { state: current, events, cursor: null };
    if (node.branch) {
      const taken = node.branch.find((b) => allHold(current, b.conditions));
      id = taken ? taken.next : (node.next ?? null);
      continue;
    }
    const result = applyEffects(current, node.effects);
    events.push(...result.events);
    return { state: result.state, events, cursor: { dialogueId, nodeId: id } };
  }
  return { state: current, events, cursor: null };
}

export function startDialogue(state: GameState, dialogueId: string): DialogueStep {
  if (!dialogueById(dialogueId)) return { state, events: [], cursor: null };
  return enter(state, dialogueId, 'start');
}

export function viewOf(state: GameState, cursor: DialogueCursor): DialogueView | null {
  const node = nodeOf(cursor);
  if (!node) return null;
  const character = characterById(node.speaker);
  const speakerName =
    node.speaker === 'player'
      ? state.playerName || 'You'
      : node.speaker === 'narrator'
        ? ''
        : (character?.name ?? '');
  return {
    speakerId: node.speaker,
    speakerName,
    portraitKey: character?.portraitKey ?? null,
    expression: node.portrait ?? 'neutral',
    text: fillText(state, node.text),
    choices: (node.choices ?? [])
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => allHold(state, c.conditions))
      .map(({ c, index }) => ({ index, text: fillText(state, c.text) })),
    focus: node.focus,
  };
}

/**
 * Move on from the current node. For a node with choices, `choiceIndex` must be one of the
 * offered indices; otherwise it's ignored and `next` is followed.
 */
export function advance(
  state: GameState,
  cursor: DialogueCursor,
  choiceIndex?: number,
): DialogueStep {
  const node = nodeOf(cursor);
  if (!node) return { state, events: [], cursor: null };
  if (node.choices?.length) {
    const offered = viewOf(state, cursor)?.choices.map((c) => c.index) ?? [];
    const choice =
      choiceIndex !== undefined && offered.includes(choiceIndex)
        ? node.choices[choiceIndex]
        : undefined;
    if (!choice) return { state, events: [], cursor }; // not a valid pick: stay put
    const result = applyEffects(state, choice.effects);
    const step = enter(result.state, cursor.dialogueId, choice.next);
    return { ...step, events: [...result.events, ...step.events] };
  }
  return enter(state, cursor.dialogueId, node.next ?? null);
}
