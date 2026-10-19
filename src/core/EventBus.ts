import type { Season } from '../config/balance';
import type { GameSpeed } from '../config/game';

type Handler<T> = (payload: T) => void;

/** Typed pub/sub. Sim modules return events; scenes, UI and story subscribe here. */
export class EventBus<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};

  /** Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const set = this.handlers[event] ?? new Set<Handler<Events[K]>>();
    set.add(handler);
    this.handlers[event] = set;
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers[event]?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers[event]?.forEach((handler) => handler(payload));
  }
}

export type GameEvents = {
  /** Pointer moved onto a different zone (null = no zone). */
  zoneHover: { zoneId: string | null };
  /** A day tick finished; `day` is the new day number. */
  dayTick: { day: number };
  seasonChanged: { season: Season };
  speedChanged: { speed: GameSpeed; paused: boolean };
};

export const eventBus = new EventBus<GameEvents>();
