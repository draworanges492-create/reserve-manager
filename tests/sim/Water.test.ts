import { describe, expect, it } from 'vitest';
import type { GameState, WaterholeState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { runDayTick } from '../../src/sim/tick';
import { runWater, waterBreakdown, waterVisualState, zoneHasWater } from '../../src/sim/Water';
import { newGame, withLevel } from '../helpers/newGame';

const atDay = (state: GameState, day: number): GameState => ({
  ...state,
  clock: { ...state.clock, day },
});
const hole = (pump: Partial<WaterholeState> = {}): WaterholeState => ({
  zoneId: 'plains',
  x: 0,
  y: 0,
  level: 50,
  type: 'natural',
  pumpState: 'none',
  pumpKind: null,
  ...pump,
});

describe('waterVisualState (spec §6.1 thresholds)', () => {
  it.each([
    [100, 'clear'],
    [61, 'clear'],
    [60, 'muddy'],
    [30, 'muddy'],
    [29.9, 'drying'],
    [10, 'drying'],
    [9.9, 'dry'],
    [0, 'dry'],
  ])('level %s is %s', (level, expected) => {
    expect(waterVisualState(level)).toBe(expected);
  });
});

describe('waterBreakdown', () => {
  it('doubles evaporation in the dry season', () => {
    expect(waterBreakdown(hole(), 'dry')).toMatchObject({
      evaporation: -8,
      rain: 0,
      pump: 0,
      net: -8,
    });
  });

  it('halves evaporation and adds rain in the wet season', () => {
    expect(waterBreakdown(hole(), 'wet')).toMatchObject({ evaporation: -2, rain: 3, net: 1 });
  });

  it('adds pump output only while the pump works', () => {
    expect(waterBreakdown(hole({ pumpState: 'working', pumpKind: 'borehole' }), 'dry').net).toBe(
      -2,
    );
    expect(waterBreakdown(hole({ pumpState: 'working', pumpKind: 'solar' }), 'dry').net).toBe(0);
    expect(waterBreakdown(hole({ pumpState: 'broken', pumpKind: 'borehole' }), 'dry').pump).toBe(0);
  });
});

describe('runWater', () => {
  it('applies the daily change without mutating the input', () => {
    const state = withLevel(newGame(), 'waterhole_a', 50);
    const next = runWater(state, new Rng(1)).state;
    expect(next.waterholes.waterhole_a?.level).toBe(42);
    expect(state.waterholes.waterhole_a?.level).toBe(50);
  });

  it('clamps to 0–100', () => {
    const dry = runWater(withLevel(newGame(), 'waterhole_a', 3), new Rng(1)).state;
    expect(dry.waterholes.waterhole_a?.level).toBe(0);
    const pumped = withLevel(atDay(newGame(), 35), 'waterhole_a', 99, {
      pumpState: 'working',
      pumpKind: 'solar',
    });
    expect(runWater(pumped, new Rng(1)).state.waterholes.waterhole_a?.level).toBe(100);
  });

  it('reports a visual state change when a threshold is crossed', () => {
    const { events } = runWater(withLevel(newGame(), 'waterhole_a', 35), new Rng(1));
    expect(events).toContainEqual({
      type: 'waterholeStateChanged',
      payload: { id: 'waterhole_a', state: 'drying' },
    });
  });

  it('runs inside the day tick after Seasons', () => {
    const next = runDayTick(newGame()).state;
    expect(next.waterholes.waterhole_a?.level).toBe(0); // 5 − 8, clamped
    expect(next.waterholes.waterhole_b?.level).toBe(72); // 80 − 8
  });
});

describe('zoneHasWater (spec §6.1 range rule)', () => {
  const unlock = (state: GameState, zoneId: string): GameState => {
    const zone = state.zones[zoneId];
    if (!zone) throw new Error(`no ${zoneId}`);
    return { ...state, zones: { ...state.zones, [zoneId]: { ...zone, unlocked: true } } };
  };

  it('needs a waterhole at level 30 or more', () => {
    expect(zoneHasWater(newGame(), 'plains')).toBe(false); // A starts at 5
    expect(zoneHasWater(withLevel(newGame(), 'waterhole_a', 30), 'plains')).toBe(true);
  });

  it('ignores waterholes in locked zones', () => {
    // B (river, locked in Ch 1) is full and only ~8.5 tiles from the plains.
    expect(zoneHasWater(newGame(), 'plains')).toBe(false);
    expect(zoneHasWater(unlock(newGame(), 'river'), 'plains')).toBe(true);
  });

  it('counts waterholes within 20 tiles of the zone edge only', () => {
    // A starts at 5, so only B (80) counts. B is ~14.5 tiles below the Northern Reach.
    const state = unlock(newGame(), 'river');
    expect(zoneHasWater(state, 'north')).toBe(true);
    expect(zoneHasWater(withLevel(state, 'waterhole_b', 0), 'north')).toBe(false);
    // A full Waterhole A is ~26 tiles from the Woodland and ~30 from the Eastern Border.
    const fullA = withLevel(state, 'waterhole_a', 90);
    expect(zoneHasWater(fullA, 'woodland')).toBe(false);
    expect(zoneHasWater(fullA, 'east_border')).toBe(false);
  });
});
