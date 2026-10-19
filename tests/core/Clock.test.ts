import { describe, expect, it } from 'vitest';
import { advanceClock } from '../../src/core/Clock';
import type { ClockState } from '../../src/core/GameState';

const clock = (over: Partial<ClockState> = {}): ClockState => ({
  day: 0,
  dayProgress: 0,
  speed: 1,
  paused: false,
  ...over,
});

describe('advanceClock', () => {
  it('runs one day tick per 120 real seconds at 1×', () => {
    expect(advanceClock(clock(), 119_000).dayTicks).toBe(0);
    expect(advanceClock(clock(), 120_000).dayTicks).toBe(1);
  });

  it('runs proportionally faster at 2× and 4×', () => {
    expect(advanceClock(clock({ speed: 2 }), 60_000).dayTicks).toBe(1);
    expect(advanceClock(clock({ speed: 4 }), 60_000).dayTicks).toBe(2);
  });

  it('does nothing while paused', () => {
    const paused = clock({ paused: true, dayProgress: 0.5 });
    expect(advanceClock(paused, 500_000)).toEqual({ clock: paused, dayTicks: 0 });
  });

  it('carries partial progress between frames', () => {
    let c = clock();
    let ticks = 0;
    for (let i = 0; i < 120; i++) {
      const r = advanceClock(c, 1000);
      c = r.clock;
      ticks += r.dayTicks;
    }
    expect(ticks).toBe(1);
    expect(c.dayProgress).toBeCloseTo(0, 6);
  });

  it('caps day ticks per update so a stalled tab cannot skip weeks', () => {
    expect(advanceClock(clock({ speed: 4 }), 3_600_000, 120, 4).dayTicks).toBe(4);
  });
});
