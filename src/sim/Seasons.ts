// Step 1 of the day tick: advance the calendar and report season changes (spec §4, §6).
import { BALANCE, type Season } from '../config/balance';
import type { SimEvent, SimStep } from './types';

type TimeConfig = typeof BALANCE.time;

export interface CalendarDate {
  year: number;
  season: Season;
  /** 1-based day within the season. */
  dayOfSeason: number;
  daysPerSeason: number;
}

export function calendarOf(day: number, time: TimeConfig = BALANCE.time): CalendarDate {
  const { daysPerSeason, seasonOrder } = time;
  const daysPerYear = daysPerSeason * seasonOrder.length;
  const withinYear = day % daysPerYear;
  const season = seasonOrder[Math.floor(withinYear / daysPerSeason)];
  if (!season) throw new Error('balance.time.seasonOrder is empty');
  return {
    year: Math.floor(day / daysPerYear) + 1,
    season,
    dayOfSeason: (withinYear % daysPerSeason) + 1,
    daysPerSeason,
  };
}

export function seasonOf(day: number, time: TimeConfig = BALANCE.time): Season {
  return calendarOf(day, time).season;
}

export const runSeasons: SimStep = (state) => {
  const day = state.clock.day + 1;
  const events: SimEvent[] = [];
  const season = seasonOf(day);
  if (season !== seasonOf(state.clock.day))
    events.push({ type: 'seasonChanged', payload: { season } });
  return { state: { ...state, clock: { ...state.clock, day } }, events };
};
