import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, nextVolume, sanitizeSettings } from '../../src/core/Settings';

describe('settings', () => {
  it('falls back to defaults for missing or broken values', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(
      sanitizeSettings({ musicVolume: 7, defaultSpeed: 3, colorblind: 'yes', textSize: 'huge' }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    expect(
      sanitizeSettings({ sfxVolume: 0.3, defaultSpeed: 4, colorblind: true, textSize: 'large' }),
    ).toMatchObject({
      sfxVolume: 0.3,
      defaultSpeed: 4,
      colorblind: true,
      textSize: 'large',
    });
  });

  it('steps volume by 10% and wraps', () => {
    expect(nextVolume(0.6)).toBe(0.7);
    expect(nextVolume(1)).toBe(0);
  });
});
