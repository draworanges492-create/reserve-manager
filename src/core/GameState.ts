// The single, plain, serializable game state (spec §4). Grows phase by phase.
import { BALANCE, type PumpKind } from '../config/balance';
import type { GameSpeed } from '../config/game';
import waterholesData from '../data/waterholes.json';
import zonesData from '../data/zones.json';
import type { TileRect, WorldLayout } from './WorldLayout';

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
  /** Rectangle in tiles, from the map. */
  rect: TileRect;
  /** Area in tiles (spec §5: computed from the rectangle). */
  area: number;
}

export type PumpState = 'none' | 'working' | 'broken';

export interface WaterholeState {
  zoneId: string;
  /** Centre in tiles. */
  x: number;
  y: number;
  /** 0–100. */
  level: number;
  type: 'natural' | 'pumped';
  pumpState: PumpState;
  pumpKind: PumpKind | null;
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
  waterholes: Record<string, WaterholeState>;
  resources: { money: number };
  flags: Record<string, boolean>;
}

export interface NewGameOptions {
  seed: number;
  /** Geometry read from the map (core/WorldLayout). */
  world: WorldLayout;
  playerName?: string;
}

export function createGameState({ seed, world, playerName = '' }: NewGameOptions): GameState {
  const chapter = BALANCE.story.startChapter;
  const rectOf = (id: string): TileRect => {
    const rect = world.zones[id];
    if (!rect) throw new Error(`Zone "${id}" from zones.json is not on the map`);
    return rect;
  };
  return {
    version: STATE_VERSION,
    seed,
    rngState: seed >>> 0,
    playerName,
    clock: { day: 0, dayProgress: 0, speed: 1, paused: false },
    chapter: { current: chapter },
    zones: Object.fromEntries(
      zonesData.zones.map((z) => {
        const rect = rectOf(z.id);
        return [z.id, { unlocked: z.unlockChapter <= chapter, rect, area: rect.w * rect.h }];
      }),
    ),
    waterholes: Object.fromEntries(
      waterholesData.waterholes.map((w) => {
        const placed = world.waterholes[w.id];
        if (!placed) throw new Error(`Waterhole "${w.id}" from waterholes.json is not on the map`);
        const hole: WaterholeState = {
          ...placed,
          level: w.startLevel,
          type: w.type === 'pumped' ? 'pumped' : 'natural',
          pumpState: 'none',
          pumpKind: null,
        };
        return [w.id, hole];
      }),
    ),
    resources: { money: BALANCE.economy.startMoney },
    flags: {},
  };
}
