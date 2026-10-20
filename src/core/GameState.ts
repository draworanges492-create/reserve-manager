// The single, plain, serializable game state (spec §4). Grows phase by phase.
import { BALANCE, type PumpKind } from '../config/balance';
import type { GameSpeed } from '../config/game';
import { ecosystemBreakdown } from '../sim/Scores';
import { SPECIES } from './content';
import waterholesData from '../data/waterholes.json';
import zonesData from '../data/zones.json';
import type { TileRect, WorldLayout } from './WorldLayout';

/** Bump when the shape changes; Save.ts (Phase 8) migrates older saves. */
/**
 * Bump when the saved shape changes, and add a migration in core/Save.ts.
 * v1: up to Phase 7 · v2: adds meta.playTimeSeconds · v3: adds encyclopedia ·
 * v4: elephants, hyenas and vultures join the reserve (D107) ·
 * v5: chapter.startDay, herd plans and counters (Phase 10).
 */
export const STATE_VERSION = 5;

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

export type FenceStatus = 'broken' | 'repairing' | 'intact';

export interface FenceState {
  /** Zone that owns this fence (repairing it helps open that zone). */
  zoneId: string;
  /** Zone on the other side, or null on the map edge. */
  borders: string | null;
  status: FenceStatus;
  /** Days of repair left while `repairing`. */
  daysLeft: number;
}

/** Story progress (spec §9). Dialogue waiting to play is queued here so saves keep it. */
export interface StoryState {
  goalsDone: string[];
  /** Days in a row a timed goal has held. */
  goalStreaks: Record<string, number>;
  firedEvents: string[];
  pendingDialogues: string[];
  /** The chapter's completion dialogue has been queued. */
  completionQueued: boolean;
}

export interface JournalEntry {
  entryId: string;
  day: number;
  chapter: number;
}

export type ScoreId = 'ecosystem' | 'trust' | 'reputation';

/** A recent change to a score, shown in its tooltip (spec §6.8). */
export interface ScoreChange {
  score: ScoreId;
  day: number;
  delta: number;
  /** strings.json key describing the cause. */
  reason: string;
}

/** What happened to one herd during the last day tick: the "why" behind its number. */
export interface PopulationChange {
  births: number;
  starved: number;
  /** Animals taken, by predator species id. */
  eatenBy: Record<string, number>;
  /** Carrying capacity used that day. */
  capacity: number;
  /** Animals removed by a herd plan that day (culled or relocated). */
  removed?: number;
}

export type HerdMethod = 'cull' | 'relocate' | 'contraception';

/** Spec §6.4: a management plan for one herd, worked through day by day by the staff. */
export interface HerdPlan {
  zoneId: string;
  speciesId: string;
  method: HerdMethod;
  /** The plan ends once the herd is at or below this many. */
  target: number;
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
  /** `startDay`: the day the current chapter began (for "a few days in" story beats). */
  chapter: { current: number; startDay: number };
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
  fences: Record<string, FenceState>;
  story: StoryState;
  /** Spec §8: −100…100 per character. */
  relationships: Record<string, number>;
  journal: JournalEntry[];
  meta: { /** Real seconds spent in this game (shown on save slots). */ playTimeSeconds: number };
  /** Species the player has seen (spec §7.6: entries unlock on first sighting). */
  encyclopedia: string[];
  /** Spec §6.8, each 0–100. */
  scores: Record<ScoreId, number>;
  scoreHistory: ScoreChange[];
  /** Spec §6.4 herd plans, keyed `${zoneId}:${speciesId}`. */
  herdPlans: Record<string, HerdPlan>;
  /** Running tallies the story and events read (crop raids, animals relocated, …). */
  counters: Record<string, number>;
}

export interface NewGameOptions {
  seed: number;
  /** Geometry read from the map (core/WorldLayout). */
  world: WorldLayout;
  playerName?: string;
  /** Speed the clock starts at (the player's "starting speed" setting). */
  speed?: GameSpeed;
}

export function createGameState(options: NewGameOptions): GameState {
  const state = baseState(options);
  // Score the starting reserve now, so the meter and its tooltip agree from the first frame.
  return { ...state, scores: { ...state.scores, ecosystem: ecosystemBreakdown(state).score } };
}

function baseState({ seed, world, playerName = '', speed = 1 }: NewGameOptions): GameState {
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
    clock: { day: 0, dayProgress: 0, speed, paused: false },
    chapter: { current: chapter, startDay: 0 },
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
    fences: Object.fromEntries(
      Object.entries(world.fences).map(([id, f]) => [id, { ...f, status: 'broken', daysLeft: 0 }]),
    ),
    story: {
      goalsDone: [],
      goalStreaks: {},
      firedEvents: [],
      pendingDialogues: [],
      completionQueued: false,
    },
    relationships: {},
    journal: [],
    meta: { playTimeSeconds: 0 },
    encyclopedia: [],
    scores: {
      ecosystem: 0, // filled in by createGameState
      trust: BALANCE.scores.trustStart,
      reputation: BALANCE.scores.reputationStart,
    },
    scoreHistory: [],
    herdPlans: {},
    counters: {},
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

/**
 * A save made with an older map lacks build slots and fences added since (e.g. the beehive
 * fence spot in Phase 10). Add any that are missing, empty / broken; nothing is removed.
 */
export function withWorldUpdates(state: GameState, world: WorldLayout): GameState {
  const slots = { ...state.slots };
  for (const [id, slot] of Object.entries(world.slots))
    if (!(id in slots)) slots[id] = { ...slot, building: null };
  const fences = { ...state.fences };
  for (const [id, f] of Object.entries(world.fences))
    if (!(id in fences)) fences[id] = { ...f, status: 'broken', daysLeft: 0 };
  return { ...state, slots, fences };
}
