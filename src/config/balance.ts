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
  economy: { startMoney: number };
  story: { startChapter: number };
  render: {
    maxAnimalSpritesPerZone: number;
    seasonTint: Record<Season, string>;
    seasonTintFadeMs: number;
    timeOfDay: TimeOfDayKey[];
  };
}

export const BALANCE = balance as Balance;
