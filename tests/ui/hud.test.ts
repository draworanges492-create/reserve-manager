import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/core/Settings';
import { dateText, dateTooltip, scoreTooltip } from '../../src/ui/hudInfo';
import { biggestHerd, type SaveControls, settingsMenu, speciesMenu } from '../../src/ui/menus';
import { runDayTick } from '../../src/sim/tick';
import { must, newGame, withPopulation } from '../helpers/newGame';

describe('top bar text', () => {
  it('has a full and a compact date', () => {
    expect(dateText(newGame(), false)).toBe('Year 1 · Dry season · Day 1/30');
    expect(dateText(newGame(), true)).toBe('Y1 · Dry · 1/30');
  });

  it('explains the season and when the next day comes', () => {
    expect(dateTooltip(newGame())).toEqual([
      'Dry season: evaporation ×2, grass regrowth ×0.4',
      'Next day in about 120 s at 1×',
    ]);
  });

  it('breaks Ecosystem Health into its parts', () => {
    const state = runDayTick(newGame()).state;
    const lines = scoreTooltip(state, 'ecosystem');
    expect(lines[0]).toMatch(/^Ecosystem health: \d+$/);
    expect(lines.slice(1).map((l) => l.split(' ')[0])).toEqual(['Grass', 'Viable', 'Open']);
  });
});

describe('species menu', () => {
  it('lists every species with where they are, and finds the biggest herd', () => {
    const menu = speciesMenu(newGame(), () => undefined);
    expect(menu.rows.map((r) => r.lines[0]?.text)).toEqual([
      'Impala · 80',
      'Zebra · 24',
      'Lion · 4',
    ]);
    expect(menu.rows[0]?.lines[1]?.text).toBe('Grazer · Central Plains 80');
    expect(biggestHerd(newGame(), 'zebra')).toEqual({ zoneId: 'plains', count: 24 });
  });

  it('flags a species below its minimum and disables Show when none are left', () => {
    const state = withPopulation(
      withPopulation(newGame(), 'plains', 'lion', 2),
      'plains',
      'zebra',
      0,
    );
    const rows = speciesMenu(state, () => undefined).rows;
    expect(rows[2]?.lines.at(-1)?.warn).toBe(true);
    expect(rows[1]?.lines[1]?.text).toBe('Grazer · None left in the reserve');
    expect(must(rows[1]?.actions[0]).enabled).toBe(false);
  });
});

describe('settings menu', () => {
  const saves = (over: Partial<SaveControls> = {}): SaveControls => ({
    slots: [
      { slot: '1', result: { ok: false, error: 'empty' } },
      { slot: '2', result: { ok: false, error: 'tooNew' } },
    ],
    confirming: null,
    lastSaved: null,
    failed: null,
    onSave: () => undefined,
    onMainMenu: () => undefined,
    ...over,
  });

  it('cycles values through update()', () => {
    const update = vi.fn();
    const menu = settingsMenu(DEFAULT_SETTINGS, update, saves());
    const byTitle = (title: string) => menu.rows.find((r) => r.lines[0]?.text === title);
    byTitle('Music volume')?.actions[0]?.onClick();
    byTitle('Colourblind-friendly colours')?.actions[0]?.onClick();
    byTitle('Starting speed for new games')?.actions[0]?.onClick();
    expect(update.mock.calls).toEqual([
      [{ musicVolume: 0.7 }],
      [{ colorblind: true }],
      [{ defaultSpeed: 2 }],
    ]);
  });

  it('lists save slots, asks before overwriting, and offers the main menu', () => {
    const onSave = vi.fn();
    const menu = settingsMenu(
      DEFAULT_SETTINGS,
      () => undefined,
      saves({ confirming: '2', onSave }),
    );
    const slotRows = menu.rows.filter((r) => r.lines[0]?.text.startsWith('Slot'));
    expect(slotRows.map((r) => [r.lines[0]?.text, r.actions[0]?.label])).toEqual([
      ['Slot 1: Empty', 'Save'],
      ['Slot 2: Made by a newer version of the game: update to load it', 'Overwrite?'],
    ]);
    slotRows[0]?.actions[0]?.onClick();
    expect(onSave).toHaveBeenCalledWith('1');
    expect(menu.rows.at(-1)?.actions[0]?.label).toBe('Main menu');
  });
});
