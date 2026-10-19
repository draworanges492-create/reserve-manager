import { describe, expect, it } from 'vitest';
import { AlertList, alertFor } from '../../src/ui/alerts';
import { debugSetChapter } from '../../src/core/Debug';
import { newGame } from '../helpers/newGame';

describe('alert rules', () => {
  it('warns when an open waterhole dries, escalates when dry, clears when refilled', () => {
    const state = newGame();
    const drying = alertFor(state, {
      type: 'waterholeStateChanged',
      payload: { id: 'waterhole_a', state: 'drying' },
    });
    expect(drying?.add).toMatchObject({
      key: 'water:waterhole_a',
      severity: 'warning',
      text: 'Waterhole A is drying up',
    });
    expect(drying?.add?.target).toEqual({ kind: 'waterhole', waterholeId: 'waterhole_a' });
    const dry = alertFor(state, {
      type: 'waterholeStateChanged',
      payload: { id: 'waterhole_a', state: 'dry' },
    });
    expect(dry?.add?.severity).toBe('critical');
    expect(
      alertFor(state, {
        type: 'waterholeStateChanged',
        payload: { id: 'waterhole_a', state: 'clear' },
      }),
    ).toEqual({
      clear: 'water:waterhole_a',
    });
  });

  it('ignores waterholes in locked zones', () => {
    const event = {
      type: 'waterholeStateChanged',
      payload: { id: 'waterhole_b', state: 'dry' },
    } as const;
    expect(alertFor(newGame(), event)).toBeNull();
    expect(alertFor(debugSetChapter(newGame(), 2), event)?.add?.severity).toBe('critical');
  });

  it('flags critical herds and points at them', () => {
    const change = alertFor(newGame(), {
      type: 'populationCritical',
      payload: { zoneId: 'plains', speciesId: 'lion', count: 3 },
    });
    expect(change?.add).toMatchObject({
      severity: 'critical',
      text: 'Lion: only 3 left in Central Plains, too few to breed',
      target: { kind: 'animal', zoneId: 'plains', speciesId: 'lion' },
    });
  });

  it('clears the debt alert when debt ends', () => {
    const list = new AlertList();
    list.apply(alertFor(newGame(), { type: 'debtChanged', payload: { inDebt: true } }));
    expect(list.all.map((a) => a.key)).toEqual(['debt']);
    list.apply(alertFor(newGame(), { type: 'debtChanged', payload: { inDebt: false } }));
    expect(list.all.map((a) => a.key)).toEqual(['debt-cleared']);
  });
});

describe('AlertList', () => {
  it('keeps one alert per key, newest first, and lets info alerts expire', () => {
    const list = new AlertList();
    const at = (day: number) => ({ ...newGame(), clock: { ...newGame().clock, day } });
    list.apply(alertFor(at(1), { type: 'seasonChanged', payload: { season: 'wet' } }));
    list.apply(alertFor(at(2), { type: 'debtChanged', payload: { inDebt: true } }));
    list.apply(alertFor(at(2), { type: 'seasonChanged', payload: { season: 'dry' } }));
    expect(list.all.map((a) => a.key)).toEqual(['season', 'debt']);
    list.expire(4);
    expect(list.all.map((a) => a.key)).toEqual(['debt']);
  });
});
