import { describe, expect, it } from 'vitest';
import { runDayTick } from '../../src/sim/tick';
import { animalHoverLines, animalPanelContent, zonePanelContent } from '../../src/ui/animalInfo';
import { newGame, withLevel, withPopulation, withVegetation } from '../helpers/newGame';

const texts = (lines: { text: string }[] | undefined): string[] => (lines ?? []).map((l) => l.text);

describe('herd hover and panel text', () => {
  it('labels a herd with its count and zone on hover', () => {
    expect(animalHoverLines(newGame(), 'plains', 'impala')).toEqual([
      'Impala · 80 in Central Plains',
      'Click for details',
    ]);
  });

  it('before the first day, shows the count without a breakdown', () => {
    const panel = animalPanelContent(newGame(), 'plains', 'zebra');
    expect(panel?.title).toBe('Zebra');
    expect(panel?.subtitle).toBe('Central Plains');
    expect(texts(panel?.lines)).toEqual(['Population: 24', 'Diet: Grazer', 'Status: Stable']);
  });

  it('after a day, explains the change and what the land supports', () => {
    const state = runDayTick(newGame(3)).state;
    const lines = texts(animalPanelContent(state, 'plains', 'impala')?.lines);
    expect(lines[0]).toMatch(/^Population: \d+ \([+−±]\d+ yesterday\)$/);
    expect(lines[1]).toMatch(/^Yesterday: /);
    expect(lines[2]).toMatch(
      /^The land supports about \d+ here \(grass \d+%, no water in reach\)$/,
    );
  });

  it('warns when a herd is above what the land can feed', () => {
    // Waterhole A is dry, so the plains support far fewer than 80 impala.
    const state = runDayTick(newGame()).state;
    const panel = animalPanelContent(state, 'plains', 'impala');
    expect(panel?.lines).toContainEqual({
      text: 'More than the land can feed: expect losses',
      warn: true,
    });
  });

  it('flags a group below its minimum viable size', () => {
    const panel = animalPanelContent(
      withPopulation(newGame(), 'plains', 'lion', 3),
      'plains',
      'lion',
    );
    expect(panel?.lines).toContainEqual({
      text: 'Status: Critical — fewer than 4, too few to breed',
      warn: true,
    });
  });
});

describe('zone panel text', () => {
  it('shows grass, its daily change, water and animals', () => {
    const panel = zonePanelContent(withLevel(newGame(), 'waterhole_a', 60), 'plains');
    expect(panel?.subtitle).toBe('Grass 55% · Healthy');
    expect(texts(panel?.lines)).toEqual([
      expect.stringMatching(/^Grass per day: \+\d\.\d regrowth, −\d\.\d grazing \(Dry season\)$/),
      'Water nearby: Yes',
      'Animals: 80 impala · 24 zebras · 4 lions',
    ]);
  });

  it('warns when a zone is degraded or locked', () => {
    const degraded = zonePanelContent(withVegetation(newGame(), 'plains', 20), 'plains');
    expect(degraded?.subtitleWarn).toBe(true);
    expect(degraded?.lines.at(-1)?.warn).toBe(true);
    expect(texts(zonePanelContent(newGame(), 'river')?.lines)[0]).toBe('Locked until Chapter 2');
  });
});
