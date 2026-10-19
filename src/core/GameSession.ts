// Owns the live GameState: runs day ticks as real time passes, applies player
// commands, and forwards resulting events to the EventBus for scenes and UI.
import type { SimEvent } from '../sim/types';
import { runDayTick } from '../sim/tick';
import { advanceClock } from './Clock';
import { applyCommand, type Command, type CommandResult } from './Commands';
import { debugAddMoney, debugSetChapter } from './Debug';
import { eventBus } from './EventBus';
import type { GameState } from './GameState';

export class GameSession {
  constructor(private current: GameState) {}

  get state(): Readonly<GameState> {
    return this.current;
  }

  update(realDeltaMs: number): void {
    const { clock, dayTicks } = advanceClock(this.current.clock, realDeltaMs);
    this.current = { ...this.current, clock };
    for (let i = 0; i < dayTicks; i++) {
      const { state, events } = runDayTick(this.current);
      this.current = state;
      this.publish(events);
    }
  }

  dispatch(command: Command): CommandResult {
    const result = applyCommand(this.current, command);
    if (result.ok) {
      this.current = result.state;
      this.publish(result.events);
    }
    return result;
  }

  /**
   * Dev tools only (debug overlay / console): jump chapters, add money. Not a player
   * command, so it skips validation; announces zone changes so the map redraws.
   */
  debugJumpToChapter(chapter: number): void {
    this.current = debugSetChapter(this.current, chapter);
    eventBus.emit('zonesChanged', {});
  }

  debugAddMoney(amount: number): void {
    this.current = debugAddMoney(this.current, amount);
  }

  private publish(events: SimEvent[]): void {
    // Each SimEvent pairs a type with its matching payload; TS can't see that through the union.
    for (const e of events) eventBus.emit(e.type, e.payload as never);
  }
}
