import { describe, expect, it } from 'vitest';
import { createGameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { calendarOf, runSeasons } from '../../src/sim/Seasons';

const time = {
  daysPerSeason: 30,
  seasonOrder: ['dry', 'wet'] as ('dry' | 'wet')[],
  maxDayTicksPerUpdate: 4,
};

describe('calendarOf', () => {
  it('starts in year 1, dry season, day 1', () => {
    expect(calendarOf(0, time)).toEqual({
      year: 1,
      season: 'dry',
      dayOfSeason: 1,
      daysPerSeason: 30,
    });
  });

  it('switches season after 30 days and year after 60', () => {
    expect(calendarOf(29, time)).toMatchObject({ season: 'dry', dayOfSeason: 30 });
    expect(calendarOf(30, time)).toMatchObject({ year: 1, season: 'wet', dayOfSeason: 1 });
    expect(calendarOf(60, time)).toMatchObject({ year: 2, season: 'dry', dayOfSeason: 1 });
  });
});

describe('runSeasons', () => {
  it('advances the day without mutating the input', () => {
    const state = createGameState({ seed: 1 });
    const { state: next } = runSeasons(state, new Rng(1));
    expect(next.clock.day).toBe(1);
    expect(state.clock.day).toBe(0);
  });

  it('reports a season change only on the boundary day', () => {
    const base = createGameState({ seed: 1 });
    const at = (day: number) =>
      runSeasons({ ...base, clock: { ...base.clock, day } }, new Rng(1)).events;
    expect(at(28)).toEqual([]);
    expect(at(29)).toEqual([{ type: 'seasonChanged', payload: { season: 'wet' } }]);
    expect(at(59)).toEqual([{ type: 'seasonChanged', payload: { season: 'dry' } }]);
  });
});
