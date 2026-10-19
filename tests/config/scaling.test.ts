import { describe, expect, it } from 'vitest';
import { computeViewport } from '../../src/config/scaling';

describe('computeViewport', () => {
  it('fills a MacBook Pro 14" browser window at 2×', () => {
    expect(computeViewport(1512, 865)).toEqual({ zoom: 2, width: 756, height: 432 });
  });

  it('fills a MacBook Pro 16" browser window at 2×', () => {
    expect(computeViewport(1728, 1000)).toEqual({ zoom: 2, width: 864, height: 500 });
  });

  it('uses 3× on a large 1080p+ window', () => {
    expect(computeViewport(1920, 1080).zoom).toBe(3);
  });

  it('never shows less than the base resolution', () => {
    expect(computeViewport(300, 200)).toEqual({ zoom: 1, width: 640, height: 360 });
  });

  it('never exceeds the window, so nothing is cropped', () => {
    const v = computeViewport(1515, 867);
    expect(v.width * v.zoom).toBeLessThanOrEqual(1515);
    expect(v.height * v.zoom).toBeLessThanOrEqual(867);
  });
});
