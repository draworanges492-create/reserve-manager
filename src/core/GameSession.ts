// Owns the live GameState: runs day ticks as real time passes, applies player commands,
// plays queued story dialogue, and forwards resulting events to the EventBus.
import type { SimEvent } from '../sim/types';
import { runDayTick } from '../sim/tick';
import {
  advance,
  type DialogueCursor,
  type DialogueView,
  startDialogue,
  viewOf,
} from '../story/DialogueRunner';
import { chapterDef } from '../story/content';
import { applyEffects } from '../story/effects';
import { afterDialogue, evaluateStory, startChapter } from '../story/StoryManager';
import type { Effect } from '../story/types';
import { advanceClock } from './Clock';
import { applyCommand, type Command, type CommandResult } from './Commands';
import { debugAddMoney, debugSetChapter } from './Debug';
import { eventBus } from './EventBus';
import type { GameState } from './GameState';

export class GameSession {
  private dialogue: DialogueCursor | null = null;
  /** Whether the clock was paused before dialogue paused it, so we can restore it. */
  private pausedBeforeDialogue: boolean | null = null;

  constructor(
    private current: GameState,
    /** Called after each day tick (spec §4 step 12: autosave). */
    private readonly onDayEnd: (state: GameState) => void = () => undefined,
  ) {}

  get state(): Readonly<GameState> {
    return this.current;
  }

  /** Begin the story at its first chapter (new games only). */
  beginStory(): void {
    const { state, events } = startChapter(this.current, this.current.chapter.current);
    this.current = state;
    this.publish(events);
  }

  update(realDeltaMs: number): void {
    this.resumeStory();
    if (!this.dialogue) this.startPendingDialogue();
    const playTimeSeconds = this.current.meta.playTimeSeconds + realDeltaMs / 1000;
    this.current = { ...this.current, meta: { ...this.current.meta, playTimeSeconds } };
    if (this.dialogue) return; // the world waits while people talk
    const { clock, dayTicks } = advanceClock(this.current.clock, realDeltaMs);
    this.current = { ...this.current, clock };
    for (let i = 0; i < dayTicks; i++) {
      const { state, events } = runDayTick(this.current);
      this.current = state;
      this.publish(events);
      this.onDayEnd(this.saveSnapshot());
    }
  }

  dispatch(command: Command): CommandResult {
    const result = applyCommand(this.current, command);
    if (result.ok) {
      this.current = result.state;
      this.publish(result.events);
      this.checkStory();
    }
    return result;
  }

  /**
   * The state to write to a save. A conversation in progress isn't part of GameState, so
   * it's put back at the front of the queue and replays from its start after loading.
   */
  saveSnapshot(): GameState {
    const s = this.current;
    const clock =
      this.pausedBeforeDialogue !== null
        ? { ...s.clock, paused: this.pausedBeforeDialogue }
        : s.clock;
    if (!this.dialogue) return { ...s, clock };
    return {
      ...s,
      clock,
      story: {
        ...s.story,
        pendingDialogues: [this.dialogue.dialogueId, ...s.story.pendingDialogues],
      },
    };
  }

  /** The line on screen, or null when no dialogue is playing. */
  get dialogueView(): DialogueView | null {
    return this.dialogue ? viewOf(this.current, this.dialogue) : null;
  }

  /** Continue the dialogue (pick `choiceIndex` when the line offers choices). */
  advanceDialogue(choiceIndex?: number): void {
    const cursor = this.dialogue;
    if (!cursor) return;
    const step = advance(this.current, cursor, choiceIndex);
    this.current = step.state;
    this.publish(step.events);
    this.dialogue = step.cursor;
    if (step.cursor) return;

    eventBus.emit('dialogueEnded', { dialogueId: cursor.dialogueId });
    const after = afterDialogue(this.current, cursor.dialogueId);
    this.current = after.state;
    this.publish(after.events);
    this.checkStory();
    this.startPendingDialogue();
    if (!this.dialogue && this.pausedBeforeDialogue !== null) {
      this.setPaused(this.pausedBeforeDialogue);
      this.pausedBeforeDialogue = null;
    }
  }

  /**
   * A save made when the story ran out (end of the last written chapter) picks the story
   * up again once a newer version of the game has the next chapter.
   */
  private resumeStory(): void {
    const { flags, chapter } = this.current;
    if (!flags.story_paused || !chapterDef(chapter.current + 1)) return;
    const { state, events } = startChapter(
      { ...this.current, flags: { ...flags, story_paused: false } },
      chapter.current + 1,
    );
    this.current = state;
    this.publish(events);
  }

  /**
   * Dev tools only (debug overlay / console): jump chapters, add money. Not a player
   * command, so it skips validation; announces zone changes so the map redraws. The
   * chapter starts properly (intro scene, goals) so it can be played from there.
   */
  debugJumpToChapter(chapter: number): void {
    this.current = debugSetChapter(this.current, chapter);
    const { state, events } = startChapter(this.current, chapter);
    this.current = state;
    this.publish(events);
    eventBus.emit('zonesChanged', {});
  }

  debugAddMoney(amount: number): void {
    this.current = debugAddMoney(this.current, amount);
  }

  /** Run `days` day ticks now (skips waiting; conversations still queue). */
  debugAdvanceDays(days: number): void {
    for (let i = 0; i < days; i++) {
      const { state, events } = runDayTick(this.current);
      this.current = state;
      this.publish(events);
    }
  }

  /** Apply story effects directly (spawn animals, set a flag, …). */
  debugApplyEffects(effects: Effect[]): void {
    const { state, events } = applyEffects(this.current, effects);
    this.current = state;
    this.publish(events);
    this.checkStory();
  }

  /** Mark every goal of the current chapter done, so its completion scene plays. */
  debugCompleteChapterGoals(): void {
    const chapter = chapterDef(this.current.chapter.current);
    if (!chapter) return;
    const done = new Set([...this.current.story.goalsDone, ...chapter.goals.map((g) => g.id)]);
    this.current = { ...this.current, story: { ...this.current.story, goalsDone: [...done] } };
    this.checkStory();
  }

  private checkStory(): void {
    const { state, events } = evaluateStory(this.current, false);
    this.current = state;
    this.publish(events);
  }

  private startPendingDialogue(): void {
    while (!this.dialogue && this.current.story.pendingDialogues.length) {
      const [id, ...rest] = this.current.story.pendingDialogues;
      if (!id) break;
      this.current = { ...this.current, story: { ...this.current.story, pendingDialogues: rest } };
      const step = startDialogue(this.current, id);
      this.current = step.state;
      this.publish(step.events);
      this.dialogue = step.cursor;
      if (this.dialogue) {
        if (this.pausedBeforeDialogue === null)
          this.pausedBeforeDialogue = this.current.clock.paused;
        this.setPaused(true);
        eventBus.emit('dialogueStarted', { dialogueId: id });
      }
    }
  }

  private setPaused(paused: boolean): void {
    this.current = { ...this.current, clock: { ...this.current.clock, paused } };
    eventBus.emit('speedChanged', { speed: this.current.clock.speed, paused });
  }

  private publish(events: SimEvent[]): void {
    // Each SimEvent pairs a type with its matching payload; TS can't see that through the union.
    for (const e of events) eventBus.emit(e.type, e.payload as never);
  }
}
