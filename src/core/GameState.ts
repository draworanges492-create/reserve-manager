// The single, plain, serializable game state (spec §4). Grows phase by phase.
import { BALANCE } from '../config/balance';
import type { GameSpeed } from '../config/game';
import zonesData from '../data/zones.json';

/** Bump when the shape changes; Save.ts (Phase 8) migrates older saves. */
export const STATE_VERSION = 1;

export interface ClockState {
  /** Days elapsed since the start, from 0. Calendar values derive from this (sim/Seasons). */
  day: number;
  /** Progress through the current day, 0–1 (drives the cosmetic time-of-day overlay). */
  dayProgress: number;
  speed: GameSpeed;
  paused: boolean;
}

export interface ZoneState {
  unlocked: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  /** Seeded RNG position; saving it makes every later roll reproducible. */
  rngState: number;
  playerName: string;
  clock: ClockState;
  chapter: { current: number };
  zones: Record<string, ZoneState>;
  resources: { money: number };
  flags: Record<string, boolean>;
}

export interface NewGameOptions {
  seed: number;
  playerName?: string;
}

export function createGameState({ seed, playerName = '' }: NewGameOptions): GameState {
  const chapter = BALANCE.story.startChapter;
  return {
    version: STATE_VERSION,
    seed,
    rngState: seed >>> 0,
    playerName,
    clock: { day: 0, dayProgress: 0, speed: 1, paused: false },
    chapter: { current: chapter },
    zones: Object.fromEntries(
      zonesData.zones.map((z) => [z.id, { unlocked: z.unlockChapter <= chapter }]),
    ),
    resources: { money: BALANCE.economy.startMoney },
    flags: {},
  };
}
