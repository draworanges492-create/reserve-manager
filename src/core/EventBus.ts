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
  /** A zone's vegetation crossed the "degraded" line (spec §6.2). */
  zoneDegradedChanged: { zoneId: string; degraded: boolean };
  /** A herd fell below its minimum viable size (spec §6.3). */
  populationCritical: { zoneId: string; speciesId: string; count: number };
  constructionStarted: { slotId: string; buildingId: string };
  constructionCancelled: { slotId: string; refund: number };
  staffHired: { staffId: string; role: string };
  /** A staff member was reassigned or dismissed. */
  staffChanged: { staffId: string };
  /** Zones were unlocked (story progress, or the dev chapter jump). */
  zonesChanged: Record<string, never>;
  /** Construction finished on a build slot (spec §4). */
  buildingCompleted: { slotId: string; buildingId: string };
  /** A staff member left after going unpaid too long (spec §6.7). */
  staffQuit: { staffId: string; role: string };
  /** Entered or left the debt state. */
  debtChanged: { inDebt: boolean };
  /** Player picked a building to place (null leaves build mode). */
  buildModeChanged: { buildingId: string | null };
  /** Player clicked a building to open its panel (null closes it). */
  slotSelected: { slotId: string | null };
  slotHover: { slotId: string | null };
  staffHover: { staffId: string | null };
  /** Story (spec §9). */
  journalAdded: { entryId: string };
  encyclopediaUnlocked: { speciesId: string };
  goalCompleted: { goalId: string; chapter: number };
  chapterStarted: { chapter: number };
  fenceRepairStarted: { segmentId: string };
  fenceRepaired: { segmentId: string };
  /** Pointer moved onto / off a fence segment. */
  fenceHover: { segmentId: string | null };
  clueHover: { clueId: string | null };
  /** A zone opened because its chapter came and its fences are mended. */
  zoneOpened: { zoneId: string };
  dialogueStarted: { dialogueId: string };
  dialogueEnded: { dialogueId: string };
  /** Pan the camera to a point (tiles), e.g. from an alert or the Species menu. */
  focusRequested: { x: number; y: number };
  /** Pointer moved onto / off an animal herd. */
  animalHover: { group: AnimalGroupRef | null };
  /** Player clicked a herd to open its info panel (null closes it). */
  animalSelected: { group: AnimalGroupRef | null };
  /** Player clicked open ground in a zone to open its info panel (null closes it). */
  zoneSelected: { zoneId: string | null };
  /** Herd management (spec §6.4): a plan was set, changed or cancelled. */
  herdPlanChanged: { zoneId: string; speciesId: string };
  /** A herd plan reached its target. */
  herdPlanDone: {
    zoneId: string;
    speciesId: string;
    method: 'cull' | 'relocate' | 'contraception';
  };
  /** A species was brought in from another reserve (Chapter 4+). */
  speciesReintroduced: { speciesId: string; zoneId: string; count: number };
  /** Elephants raided the village's crops (D111). */
  cropRaid: { compensated: boolean; fenceBroken: boolean };
  /** A command failed; UI shows the reason near where the player acted. */
  commandFailed: { reason: StringKey; worldX?: number; worldY?: number };
};

export const eventBus = new EventBus<GameEvents>();
