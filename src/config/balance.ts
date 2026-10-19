// Typed view of balance.json (spec §0 rule 3: every tunable number lives there).
import balance from './balance.json';

export type Season = 'dry' | 'wet';

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
