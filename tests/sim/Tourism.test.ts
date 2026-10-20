import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyCommand } from '../../src/core/Commands';
import type { GameState } from '../../src/core/GameState';
import { Rng } from '../../src/core/Rng';
import {
  attraction,
  infrastructure,
  revenueFor,
  runTourism,
  visitorsToday,
} from '../../src/sim/Tourism';
import { must, newGame } from '../helpers/newGame';

const open = (s: GameState): GameState => ({ ...s, flags: { ...s.flags, tourism_open: true } });
const withTower = (s: GameState): GameState => ({
  ...s,
  slots: {
    ...s.slots,
    tower_plains: {
      ...must(s.slots.tower_plains),
      building: { buildingId: 'observation_tower', daysLeft: 0 },
    },
  },
});

describe('tourism (spec §6.6, D116)', () => {
  it('no visitors until the story opens the gates', () => {
    expect(visitorsToday(newGame())).toBe(0);
    expect(visitorsToday(open(newGame()))).toBeGreaterThan(0);
  });

  it('towers raise infrastructure and visitors, and add a sightings bonus to each ticket', () => {
    const base = open(newGame());
    expect(infrastructure(withTower(base))).toBeCloseTo(1.25, 6);
    expect(visitorsToday(withTower(base))).toBeGreaterThanOrEqual(visitorsToday(base));
    expect(revenueFor(base, 10)).toBe(10 * BALANCE.tourism.ticketPrice);
    expect(revenueFor(withTower(base), 10)).toBe(
      10 * (BALANCE.tourism.ticketPrice + BALANCE.tourism.towerBonusPerVisitor),
    );
  });

  it('Victor takes his share if the lodge deal was accepted', () => {
    const deal = { ...open(newGame()), flags: { tourism_open: true, victor_lodge: true } };
    expect(revenueFor(deal, 10)).toBe(
      Math.round(10 * BALANCE.tourism.ticketPrice * (1 - BALANCE.tourism.victorShare)),
    );
  });

  it('a seen leopard adds the rare bonus', () => {
    const s = newGame();
    const leopards = {
      ...s,
      populations: { ...s.populations, plains: { ...s.populations.plains, leopard: 2 } },
    };
    expect(
      attraction({ ...leopards, encyclopedia: ['leopard'] }) - attraction(leopards),
    ).toBeCloseTo(BALANCE.tourism.rareBonus, 6);
  });

  it('records visitors and takings; Economy books the money', () => {
    const { state } = runTourism(open(newGame()), new Rng(1));
    expect(state.tourism.visitorsHistory).toEqual([state.tourism.lastVisitors]);
    expect(state.tourism.lastRevenue).toBe(revenueFor(state, state.tourism.lastVisitors));
  });
});

describe('reintroduction (Chapter 4)', () => {
  const ch4 = (): GameState => ({
    ...newGame(),
    chapter: { current: 4, startDay: 0 },
    resources: { money: 5000 },
  });

  it('needs Chapter 4 and a vet, costs money, and only happens once', () => {
    expect(applyCommand(newGame(), { type: 'reintroduce', speciesId: 'giraffe' })).toEqual({
      ok: false,
      reason: 'command.notYetAvailable',
    });
    expect(applyCommand(ch4(), { type: 'reintroduce', speciesId: 'giraffe' })).toEqual({
      ok: false,
      reason: 'command.needsVet',
    });
    const hired = applyCommand(ch4(), { type: 'hire', role: 'vet' });
    if (!hired.ok) throw new Error(hired.reason);
    const r = applyCommand(hired.state, { type: 'reintroduce', speciesId: 'giraffe' });
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.populations.plains?.giraffe).toBe(6);
    expect(r.state.resources.money).toBe(5000 - 900);
    expect(applyCommand(r.state, { type: 'reintroduce', speciesId: 'giraffe' })).toEqual({
      ok: false,
      reason: 'command.alreadyReintroduced',
    });
  });
});
