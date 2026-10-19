import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import { debugAddMoney, debugSetChapter } from '../../src/core/Debug';
import type { GameState } from '../../src/core/GameState';
import { runDayTick } from '../../src/sim/tick';
import {
  buildingPanelContent,
  buildMenu,
  moneyText,
  moneyTooltip,
  nextZone,
  staffMenu,
  validSlotsFor,
} from '../../src/ui/economyInfo';
import { must, newGame } from '../helpers/newGame';

const ok = (state: GameState, ...cmds: Parameters<typeof applyCommand>[1][]): GameState =>
  cmds.reduce((s, c) => {
    const r = applyCommand(s, c);
    if (!r.ok) throw new Error(r.reason);
    return r.state;
  }, state);
const noop = (): void => undefined;

describe('money readout', () => {
  it('shows money and expected net, and explains it on hover', () => {
    const state = ok(newGame(), { type: 'hire', role: 'ranger' });
    expect(moneyText(state)).toEqual({ text: '500 (+10/day)', warn: false });
    expect(moneyTooltip(state)).toEqual([
      'Money: 500',
      'Conservation grant: +40/day',
      'Wages: −30/day',
      'Expected net: +10/day',
    ]);
  });

  it('turns into a warning in debt', () => {
    let state = newGame();
    for (let i = 0; i < 6; i++) state = ok(state, { type: 'hire', role: 'ranger' });
    state = runDayTick(debugAddMoney(state, -480)).state;
    expect(moneyText(state).warn).toBe(true);
    expect(moneyText(state).text).toMatch(/In debt$/);
    expect(moneyTooltip(state).at(-1)).toBe('Staff quit after 3 unpaid days in a row');
  });
});

describe('build menu', () => {
  it('in Chapter 1, everything is still locked', () => {
    const rows = buildMenu(newGame(), noop).rows;
    expect(rows.every((r) => !must(r.actions[0]).enabled)).toBe(true);
    expect(rows[0]?.lines.at(-1)).toEqual({ text: 'Opens in Chapter 2', warn: true });
  });

  it('in Chapter 2, offers the pump on both open pump spots', () => {
    const state = debugSetChapter(newGame(), 2);
    expect(validSlotsFor(state, 'borehole_pump').sort()).toEqual(['pump_a', 'pump_b']);
    expect(validSlotsFor(state, 'ranger_post')).toEqual(['post_hq']);
    const pump = buildMenu(state, noop).rows[0];
    expect(pump?.lines[0]?.text).toBe('Borehole pump · 400');
    expect(must(pump?.actions[0]).enabled).toBe(true);
  });
});

describe('staff menu', () => {
  it('lists staff with zone, morale and wage, plus hire rows', () => {
    const state = ok(newGame(), { type: 'hire', role: 'ranger' });
    const menu = staffMenu(state, noop);
    expect(menu.intro?.[0]?.text).toBe('Wages 30/day. Rangers on patrol protect their zone.');
    expect(menu.rows[0]?.lines.map((l) => l.text)).toEqual([
      'Ranger #1 · At HQ (no patrol)',
      'Morale 70 · 30/day',
    ]);
    expect(menu.rows.filter((r) => r.actions[0]?.label === 'Hire')).toHaveLength(5);
  });

  it('cycles patrol zones through HQ and the open zones', () => {
    const state = newGame();
    expect(nextZone(state, null)).toBe('hq');
    expect(nextZone(state, 'hq')).toBe('plains');
    expect(nextZone(state, 'plains')).toBeNull();
  });
});

describe('building panel', () => {
  it('shows progress and a refund button while building, then what it does', () => {
    let state = ok(debugSetChapter(newGame(), 2), {
      type: 'build',
      slotId: 'pump_a',
      buildingId: 'borehole_pump',
    });
    const building = buildingPanelContent(state, 'pump_a', noop);
    expect(building?.lines[0]?.text).toBe('Under construction: 3 day(s) left');
    expect(building?.actions?.[0]?.label).toBe('Cancel (+200)');
    for (let i = 0; i < 3; i++) state = runDayTick(state).state;
    const done = buildingPanelContent(state, 'pump_a', noop);
    expect(done?.lines.map((l) => l.text).slice(0, 3)).toEqual([
      'Working',
      'Pumps +6/day into Waterhole A',
      'Upkeep: 0.7/day',
    ]);
    expect(done?.actions).toEqual([]);
  });
});
