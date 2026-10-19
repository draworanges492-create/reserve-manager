import { describe, expect, it } from 'vitest';
import { animalHoverLines, animalPanelText } from '../../src/ui/animalInfo';
import { newGame, withLevel } from '../helpers/newGame';

describe('animal info text', () => {
  it('labels a herd with its count and zone on hover', () => {
    expect(animalHoverLines(newGame(), 'plains', 'impala')).toEqual([
      'Impala · 80 in Central Plains',
      'Click for details',
    ]);
  });

  it('shows population, diet, status and water in the panel', () => {
    expect(animalPanelText(newGame(), 'plains', 'zebra')).toEqual({
      title: 'Zebra',
      subtitle: 'Central Plains',
      critical: false,
      lines: [
        'Population: 24',
        'Diet: Grazer',
        'Status: Stable',
        'Water nearby: No — refill a waterhole',
      ],
    });
  });

  it('flags a group below its minimum viable size, and notices water', () => {
    const panel = animalPanelText(withLevel(newGame(), 'waterhole_a', 60), 'plains', 'lion');
    expect(panel?.critical).toBe(true);
    expect(panel?.lines).toContain('Status: Critical — fewer than 4, too few to breed');
    expect(panel?.lines).toContain('Water nearby: Yes');
  });
});
