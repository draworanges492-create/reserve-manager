// The single, plain, serializable game state (spec §4). Grows phase by phase.
import { BALANCE, type PumpKind } from '../config/balance';
import type { GameSpeed } from '../config/game';
import { SPECIES } from './content';
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
  /** Grass and browse, 0–100 (spec §6.2). */
  vegetation: number;
}

export interface BuildingState {
  buildingId: string;
  /** Days of construction left; 0 = finished and working. */
  daysLeft: number;
  /** For an upgrade under construction: the finished building it replaces (restored on cancel). */
  replaces?: string;
}

export interface SlotState {
  slotType: string;
  zoneId: string;
  /** Rectangle in tiles, from the map. */
  rect: TileRect;
  /** Pump slots: the waterhole they feed. */
  waterholeId?: string;
  building: BuildingState | null;
}

export interface StaffMember {
  id: string;
  role: string;
  /** Assigned zone, or null while waiting at HQ. */
  zoneId: string | null;
  /** 0–100. */
  morale: number;
  /** Days in a row without wages. */
  unpaidDays: number;
}

/** One day's money in and out (spec §6.7), for the HUD tooltip. */
export interface DayLedger {
  grant: number;
  wages: number;
  /** Wages owed but not paid because money ran out. */
  wagesUnpaid: number;
  upkeep: number;
  net: number;
}

/** What happened to one herd during the last day tick: the "why" behind its number. */
export interface PopulationChange {
  births: number;
  starved: number;
  /** Animals taken, by predator species id. */
  eatenBy: Record<string, number>;
  /** Carrying capacity used that day. */
  capacity: number;
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
  /** Animal counts per zone, then per species: populations[zoneId][speciesId]. */
  populations: Record<string, Record<string, number>>;
  /** Last day's breakdown per zone and species (same shape as populations). */
  populationLog: Record<string, Record<string, PopulationChange>>;
  slots: Record<string, SlotState>;
  staff: StaffMember[];
  nextStaffNumber: number;
  resources: { money: number };
  economy: {
    lastDay: DayLedger | null;
    /** Net income of recent days, oldest first. */
    netHistory: number[];
    /** Spec §6.7 Debt: money below zero or wages left unpaid. */
    inDebt: boolean;
  };
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
        const zone: ZoneState = {
          unlocked: z.unlockChapter <= chapter,
          rect,
          area: rect.w * rect.h,
          vegetation: z.startVegetation,
        };
        return [z.id, zone];
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
    populations: startingPopulations(),
    populationLog: {},
    slots: Object.fromEntries(
      Object.entries(world.slots).map(([id, slot]) => [id, { ...slot, building: null }]),
    ),
    staff: [],
    nextStaffNumber: 1,
    resources: { money: BALANCE.economy.startMoney },
    economy: { lastDay: null, netHistory: [], inDebt: false },
    flags: {},
  };
}

function startingPopulations(): GameState['populations'] {
  const populations: GameState['populations'] = {};
  for (const species of SPECIES) {
    for (const [zoneId, count] of Object.entries(species.startPopulation)) {
      populations[zoneId] = { ...populations[zoneId], [species.id]: count };
    }
  }
  return populations;
}
