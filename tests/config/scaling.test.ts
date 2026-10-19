import { describe, expect, it } from 'vitest';
import { computeIntegerZoom } from '../../src/config/scaling';

describe('computeIntegerZoom', () => {
  it('picks the largest whole zoom that fits', () => {
    expect(computeIntegerZoom(1920, 1080)).toBe(4);
    expect(computeIntegerZoom(1440, 900)).toBe(3);
  });

  it('is limited by the tighter axis', () => {
    expect(computeIntegerZoom(2000, 600)).toBe(2);
  });

  it('never goes below 1 for tiny windows', () => {
    expect(computeIntegerZoom(300, 200)).toBe(1);
  });
});
