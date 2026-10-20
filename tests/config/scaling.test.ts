import { describe, expect, it } from 'vitest';
import { computeRender, computeViewport } from '../../src/config/scaling';

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

describe('computeRender', () => {
  it('draws a Retina MacBook window at full resolution, 4 device pixels per game pixel', () => {
    expect(computeRender(1512, 865, 2)).toEqual({
      scale: 4,
      canvasWidth: 3024,
      canvasHeight: 1730,
    });
  });

  it('uses one device pixel per screen pixel on a normal display', () => {
    expect(computeRender(1920, 1080, 1)).toEqual({
      scale: 3,
      canvasWidth: 1920,
      canvasHeight: 1080,
    });
  });

  it('never makes a zero-size canvas (hidden window)', () => {
    const r = computeRender(0, 0, 2);
    expect(r.canvasWidth).toBeGreaterThan(0);
    expect(r.canvasHeight).toBeGreaterThan(0);
  });
});
