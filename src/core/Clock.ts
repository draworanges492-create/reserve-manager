// Converts real time into whole in-game days (spec §4). The day counter itself is
// advanced by sim/Seasons inside the day tick, so it stays in the deterministic sim.
import { BALANCE } from '../config/balance';
import { DAY_LENGTH_SECONDS } from '../config/game';
import type { ClockState } from './GameState';

const FLOAT_TOLERANCE = 1e-9;

export interface ClockAdvance {
  clock: ClockState;
  /** Number of day ticks the simulation should run now. */
  dayTicks: number;
}

export function advanceClock(
  clock: ClockState,
  realDeltaMs: number,
  dayLengthSeconds = DAY_LENGTH_SECONDS,
  maxTicks = BALANCE.time.maxDayTicksPerUpdate,
): ClockAdvance {
  if (clock.paused || realDeltaMs <= 0) return { clock, dayTicks: 0 };
  const progress = clock.dayProgress + (realDeltaMs / 1000) * (clock.speed / dayLengthSeconds);
  // Tolerance: summing many small frame deltas lands at 0.99999… instead of 1.
  const whole = Math.floor(progress + FLOAT_TOLERANCE);
  return {
    clock: { ...clock, dayProgress: Math.max(0, progress - whole) },
    dayTicks: Math.min(whole, maxTicks),
  };
}
