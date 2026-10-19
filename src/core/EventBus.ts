import type { Season } from '../config/balance';
import type { GameSpeed } from '../config/game';
import type { StringKey } from './text';

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

/** Identifies one species' herd in one zone. */
export interface AnimalGroupRef {
  zoneId: string;
  speciesId: string;
}

export type GameEvents = {
  /** Pointer moved onto a different zone (null = no zone). */
  zoneHover: { zoneId: string | null };
  /** A day tick finished; `day` is the new day number. */
  dayTick: { day: number };
  seasonChanged: { season: Season };
  speedChanged: { speed: GameSpeed; paused: boolean };
  waterholeStateChanged: { id: string; state: 'clear' | 'muddy' | 'drying' | 'dry' };
  /** Player hand-refilled a waterhole (drives the bucket/splash animation). */
  waterholeRefilled: { id: string; level: number };
  /** Pointer moved onto / off a waterhole (null = none). */
  waterholeHover: { id: string | null };
  /** Pointer moved onto / off an animal herd. */
  animalHover: { group: AnimalGroupRef | null };
  /** Player clicked a herd (or empty ground: null) to open / close its info panel. */
  animalSelected: { group: AnimalGroupRef | null };
  /** A command failed; UI shows the reason near where the player acted. */
  commandFailed: { reason: StringKey; worldX?: number; worldY?: number };
};

export const eventBus = new EventBus<GameEvents>();
