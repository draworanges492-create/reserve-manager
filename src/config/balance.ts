// Typed view of balance.json (spec §0 rule 3: every tunable number lives there).
import balance from './balance.json';

export type Season = 'dry' | 'wet';
export type PumpKind = 'borehole' | 'solar';

export interface TimeOfDayKey {
  /** Fraction of the day, 0–1. */
  at: number;
  color: string;
  alpha: number;
}

export interface Balance {
  time: {
    daysPerSeason: number;
    seasonOrder: Season[];
    /** Most day ticks run in one frame, so a stalled tab can't fast-forward weeks. */
    maxDayTicksPerUpdate: number;
  };
  water: {
    maxLevel: number;
    decayPerDay: number;
    seasonDecayMult: Record<Season, number>;
    rainPerDay: Record<Season, number>;
    pumpRefillPerDay: Record<PumpKind, number>;
    /** Added per click, and per hold interval while the button is held. */
    manualRefillAmount: number;
    refillHoldIntervalMs: number;
    /** A zone has water if a waterhole within this many tiles is at least availableMinLevel. */
    rangeTiles: number;
    availableMinLevel: number;
    /** Lower bounds of the visual states (spec §6.1): clear > 60, muddy 30–60, drying 10–30, dry < 10. */
    stateThresholds: { clear: number; muddy: number; drying: number };
  };
  vegetation: {
    /** Regrowth per day at bare ground, before the season multiplier. */
    regrowRate: number;
    seasonMult: Record<Season, number>;
    /**
     * Converts the spec's grazing sum into vegetation points. With the spec's literal
     * formula, 80 impala eat ~0.001 points a day, so grass could never run down
     * (DECISIONS D50): species `grazeRate` is read as % of one tile eaten per animal per day.
     */
    grazingScale: number;
    /** Below this a zone is "degraded" (brown overlay, warning). */
    degradedBelow: number;
    maxLevel: number;
  };
  population: {
    /** Extra daily die-off per animal above carrying capacity (spec §6.3 d). */
    overshootDeathRate: number;
    /** Carrying-capacity multiplier when a zone has no water in range. */
    noWaterFactor: number;
  };
  economy: { startMoney: number };
  story: { startChapter: number };
  render: {
    maxAnimalSpritesPerZone: number;
    seasonTint: Record<Season, string>;
    seasonTintFadeMs: number;
    timeOfDay: TimeOfDayKey[];
    /** Cosmetic animal movement (never affects the sim). Speeds in game px per second at 1×. */
    animals: {
      walkSpeed: { min: number; max: number };
      /** How fast a herd's centre drifts across its zone. */
      herdDriftSpeed: number;
      /** Members graze within this many tiles of the herd centre. */
      herdRadiusTiles: number;
      grazePauseMs: { min: number; max: number };
      /** Pause before the herd picks a new spot to drift to. */
      herdRestMs: { min: number; max: number };
      walkFrameMs: number;
      /** A press that moves less than this is a click, not a drag. */
      clickMaxMovePx: number;
    };
  };
}

export const BALANCE = balance as Balance;
