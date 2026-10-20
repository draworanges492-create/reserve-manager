import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyCommand } from '../../src/core/Commands';
import type { GameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { cameraBonus, incidentChance, runPoaching } from '../../src/sim/Poaching';
import { droughtFor, NO_DROUGHT, waterBreakdown } from '../../src/sim/Water';
import { must, newGame, withLevel } from '../helpers/newGame';

const ch5 = (flags: Record<string, boolean> = {}): GameState => {
  const s = newGame();
  return {
    ...s,
    chapter: { current: 5, startDay: 0 },
    resources: { money: 5000 },
    flags: { ...s.flags, ...flags },
  };
};
const pumped = (s: GameState): GameState =>
  withLevel(s, 'waterhole_a', 50, { pumpState: 'working', pumpKind: 'borehole', type: 'pumped' });

describe('drought (D121)', () => {
  it('halves pump output, stops rain and speeds up drying until the borehole is deepened', () => {
    const hole = must(pumped(ch5()).waterholes.waterhole_a);
    const normal = waterBreakdown(hole, 'wet', BALANCE.water, NO_DROUGHT);
    const dry = waterBreakdown(hole, 'wet', BALANCE.water, { active: true, deepened: false });
    expect(dry.rain).toBe(0);
    expect(dry.pump).toBe(normal.pump * BALANCE.drought.pumpMult);
    expect(dry.evaporation).toBeCloseTo(normal.evaporation * BALANCE.drought.decayMult, 6);
    expect(waterBreakdown(hole, 'wet', BALANCE.water, { active: true, deepened: true }).pump).toBe(
      normal.pump,
    );
  });

  it('deepening needs a working pump and costs money; trucking water needs the drought', () => {
    expect(applyCommand(ch5(), { type: 'deepenBorehole', waterholeId: 'waterhole_a' })).toEqual({
      ok: false,
      reason: 'command.needsPump',
    });
    const r = applyCommand(pumped(ch5({ drought: true })), {
      type: 'deepenBorehole',
      waterholeId: 'waterhole_a',
    });
    if (!r.ok) throw new Error(r.reason);
    expect(droughtFor(r.state, 'waterhole_a')).toEqual({ active: true, deepened: true });
    expect(r.state.resources.money).toBe(5000 - BALANCE.drought.deepenCost);
    expect(applyCommand(ch5(), { type: 'truckWater', waterholeId: 'waterhole_a' })).toEqual({
      ok: false,
      reason: 'command.notInDrought',
    });
    const t = applyCommand(ch5({ drought: true }), {
      type: 'truckWater',
      waterholeId: 'waterhole_a',
    });
    if (!t.ok) throw new Error(t.reason);
    expect(t.state.waterholes.waterhole_a?.level).toBe(
      must(ch5().waterholes.waterhole_a).level + BALANCE.drought.truckAmount,
    );
  });
});

describe('poaching ring (spec §6.5, D122)', () => {
  it('only strikes once the ring is active, and rangers lower the chance', () => {
    expect(incidentChance(ch5(), 'plains')).toBe(0);
    const ring = ch5({ poaching_ring: true });
    const base = incidentChance(ring, 'plains');
    expect(base).toBeCloseTo(
      ((BALANCE.poaching.pressure.plains ?? 0) / 100) * BALANCE.poaching.baseChance,
      6,
    );
    const hired = applyCommand(ring, { type: 'hire', role: 'ranger' });
    if (!hired.ok) throw new Error(hired.reason);
    const assigned = applyCommand(hired.state, {
      type: 'assignStaff',
      staffId: must(hired.state.staff[0]).id,
      zoneId: 'plains',
    });
    if (!assigned.ok) throw new Error(assigned.reason);
    expect(incidentChance(assigned.state, 'plains')).toBeLessThan(base);
    expect(
      incidentChance({ ...ring, flags: { ...ring.flags, hale_exposed: true } }, 'plains'),
    ).toBeCloseTo(base * BALANCE.poaching.exposedMult, 6);
  });

  it('cameras add to the catch chance', () => {
    const s = ch5();
    const cams = {
      ...s,
      slots: {
        ...s.slots,
        camera_north: {
          ...must(s.slots.camera_north),
          building: { buildingId: 'camera_post', daysLeft: 0 },
        },
      },
    };
    expect(cameraBonus(s)).toBe(0);
    expect(cameraBonus(cams)).toBeCloseTo(0.3, 6);
  });

  it('incidents kill the most valuable animals, may poison vultures, and are recorded', () => {
    let state: GameState = { ...ch5({ poaching_ring: true }) };
    let incident = false;
    for (let seed = 1; seed < 400 && !incident; seed++) {
      const r = runPoaching(state, new Rng(seed));
      if (r.events.some((e) => e.type === 'poachingIncident')) {
        incident = true;
        state = r.state;
        const e = r.events.find((x) => x.type === 'poachingIncident');
        expect(e?.payload).toMatchObject({ speciesId: 'elephant' }); // highest poachingValue on the plains
        expect(state.counters.poached).toBeGreaterThan(0);
        expect(state.flags.poaching_happened).toBe(true);
      }
    }
    expect(incident).toBe(true);
  });
});
