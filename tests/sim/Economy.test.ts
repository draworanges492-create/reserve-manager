import { describe, expect, it } from 'vitest';
import { applyCommand, type Command } from '../../src/core/Commands';
import { debugAddMoney, debugSetChapter } from '../../src/core/Debug';
import type { GameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import { runConstruction } from '../../src/sim/Construction';
import { expectedLedger, runEconomy, upkeepPerDay, wagesPerDay } from '../../src/sim/Economy';
import { rangerCoverage } from '../../src/sim/Poaching';
import { runDayTick } from '../../src/sim/tick';
import { waterBreakdown } from '../../src/sim/Water';
import { must, newGame } from '../helpers/newGame';

/** Applies commands in order, failing the test if any is refused. */
function apply(state: GameState, ...commands: Command[]): GameState {
  for (const c of commands) {
    const r = applyCommand(state, c);
    if (!r.ok) throw new Error(`${c.type} refused: ${r.reason}`);
    state = r.state;
  }
  return state;
}
const chapter2 = (money = 2000) => debugAddMoney(debugSetChapter(newGame(), 2), money - 500);
const days = (state: GameState, n: number) => {
  for (let i = 0; i < n; i++) state = runDayTick(state).state;
  return state;
};
const economyDay = (state: GameState) => runEconomy(state, new Rng(1));

describe('daily money (spec §6.7)', () => {
  it('starts with 500 and earns the grant with no costs', () => {
    const { state } = economyDay(newGame());
    expect(state.resources.money).toBe(540);
    expect(state.economy.lastDay).toEqual({
      grant: 40,
      tourism: 0,
      wages: 0,
      wagesUnpaid: 0,
      upkeep: 0,
      net: 40,
    });
  });

  it('pays wages and building upkeep (5% of cost per 30 days)', () => {
    let state = apply(
      chapter2(),
      { type: 'hire', role: 'ranger' },
      { type: 'build', slotId: 'pump_a', buildingId: 'borehole_pump' },
    );
    state = days(state, 3); // pump finishes on day 3
    expect(wagesPerDay(state)).toBe(30);
    expect(upkeepPerDay(state)).toBeCloseTo((400 * 0.05) / 30, 6);
    expect(expectedLedger(state).net).toBeCloseTo(40 - 30 - (400 * 0.05) / 30, 6);
  });

  it('remembers recent net income (Chapter 2 goal)', () => {
    const state = days(apply(newGame(), { type: 'hire', role: 'ranger' }), 6);
    expect(state.economy.netHistory).toHaveLength(6);
    expect(state.economy.netHistory.every((n) => n === 10)).toBe(true);
  });
});

describe('debt (spec §6.7)', () => {
  const broke = () => {
    let s = newGame();
    // 6 rangers = 180/day; starting from 50, the +40/day grant never catches up.
    for (let i = 0; i < 6; i++) s = apply(s, { type: 'hire', role: 'ranger' });
    return debugAddMoney(s, -500 + 50);
  };

  it('leaves wages unpaid when money runs short, and enters debt', () => {
    const { state, events } = economyDay(broke());
    expect(state.economy.lastDay?.wagesUnpaid).toBe(180);
    expect(state.resources.money).toBe(90);
    expect(state.economy.inDebt).toBe(true);
    expect(events).toContainEqual({ type: 'debtChanged', payload: { inDebt: true } });
    expect(must(state.staff[0]).morale).toBe(55);
  });

  it('staff quit after 3 unpaid days', () => {
    let state = broke();
    const quits: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = economyDay(state);
      state = r.state;
      for (const e of r.events) if (e.type === 'staffQuit') quits.push(e.payload.staffId);
    }
    expect(state.staff).toHaveLength(0);
    expect(quits).toHaveLength(6);
  });

  it('blocks hiring while in debt', () => {
    const inDebt = economyDay(broke()).state;
    expect(applyCommand(inDebt, { type: 'hire', role: 'ranger' })).toEqual({
      ok: false,
      reason: 'command.cantHireInDebt',
    });
  });
});

describe('building (spec §7.2)', () => {
  it('charges the cost, builds over N days, then the pump feeds its waterhole', () => {
    let state = apply(chapter2(), { type: 'build', slotId: 'pump_a', buildingId: 'borehole_pump' });
    expect(state.resources.money).toBe(1600);
    expect(must(state.slots.pump_a).building).toEqual({ buildingId: 'borehole_pump', daysLeft: 3 });
    const completed: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = runConstruction(state, new Rng(1));
      state = r.state;
      for (const e of r.events)
        if (e.type === 'buildingCompleted') completed.push(e.payload.buildingId);
    }
    expect(completed).toEqual(['borehole_pump']);
    const hole = must(state.waterholes.waterhole_a);
    expect(hole).toMatchObject({ type: 'pumped', pumpState: 'working', pumpKind: 'borehole' });
    expect(waterBreakdown(hole, 'dry').pump).toBe(6);
  });

  it('refunds 50% on cancel, and an upgrade falls back to the original', () => {
    let state = apply(chapter2(), { type: 'build', slotId: 'pump_a', buildingId: 'borehole_pump' });
    state = apply(state, { type: 'cancelBuild', slotId: 'pump_a' });
    expect(state.resources.money).toBe(1800);
    expect(must(state.slots.pump_a).building).toBeNull();

    state = days(
      apply(debugSetChapter(state, 4), {
        type: 'build',
        slotId: 'pump_a',
        buildingId: 'borehole_pump',
      }),
      3,
    );
    state = apply(state, { type: 'build', slotId: 'pump_a', buildingId: 'solar_pump' });
    state = apply(state, { type: 'cancelBuild', slotId: 'pump_a' });
    expect(must(state.slots.pump_a).building).toEqual({ buildingId: 'borehole_pump', daysLeft: 0 });
  });

  it.each([
    ['locked by chapter', newGame(), 'pump_a', 'borehole_pump', 'command.notYetAvailable'],
    ['zone still locked', chapter2(), 'post_woodland', 'ranger_post', 'command.zoneLocked'],
    ['wrong kind of spot', chapter2(), 'pump_a', 'ranger_post', 'command.wrongSlot'],
    [
      'upgrade without base',
      debugSetChapter(chapter2(), 4),
      'pump_a',
      'solar_pump',
      'command.needsUpgradeBase',
    ],
    [
      'too expensive',
      debugAddMoney(chapter2(), -1700),
      'pump_a',
      'borehole_pump',
      'command.notEnoughMoney',
    ],
  ])('refuses: %s', (_name, state, slotId, buildingId, reason) => {
    expect(applyCommand(state, { type: 'build', slotId, buildingId })).toEqual({
      ok: false,
      reason,
    });
  });

  it('refuses a second building on an occupied spot', () => {
    const state = apply(chapter2(), {
      type: 'build',
      slotId: 'post_hq',
      buildingId: 'ranger_post',
    });
    expect(
      applyCommand(state, { type: 'build', slotId: 'post_hq', buildingId: 'ranger_post' }),
    ).toEqual({
      ok: false,
      reason: 'command.slotOccupied',
    });
  });
});

describe('staff and ranger coverage (spec §6.5, §7.3)', () => {
  it('hires, assigns and dismisses', () => {
    let state = apply(newGame(), { type: 'hire', role: 'ranger' });
    const id = must(state.staff[0]).id;
    state = apply(state, { type: 'assignStaff', staffId: id, zoneId: 'plains' });
    expect(must(state.staff[0]).zoneId).toBe('plains');
    expect(applyCommand(state, { type: 'assignStaff', staffId: id, zoneId: 'north' })).toEqual({
      ok: false,
      reason: 'command.zoneLocked',
    });
    state = apply(state, { type: 'dismissStaff', staffId: id });
    expect(state.staff).toEqual([]);
  });

  it('coverage = rangers × 0.25, doubled by a finished ranger post in the zone, capped at 0.9', () => {
    let state = chapter2(5000);
    for (let i = 0; i < 2; i++) state = apply(state, { type: 'hire', role: 'ranger' });
    for (const s of state.staff)
      state = apply(state, { type: 'assignStaff', staffId: s.id, zoneId: 'hq' });
    expect(rangerCoverage(state, 'hq')).toBe(0.5);
    expect(rangerCoverage(state, 'plains')).toBe(0);
    state = days(apply(state, { type: 'build', slotId: 'post_hq', buildingId: 'ranger_post' }), 4);
    expect(rangerCoverage(state, 'hq')).toBe(0.9); // 2 × 0.25 × 2 = 1.0, capped
  });

  it('only patrolling roles count toward coverage', () => {
    let state = apply(debugSetChapter(newGame(), 3), { type: 'hire', role: 'vet' });
    state = apply(state, {
      type: 'assignStaff',
      staffId: must(state.staff[0]).id,
      zoneId: 'plains',
    });
    expect(rangerCoverage(state, 'plains')).toBe(0);
  });
});
