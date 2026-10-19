import { describe, expect, it } from 'vitest';
import {
  minZoomIndex,
  nextZoomIndex,
  scrollToKeepPoint,
  unionBounds,
} from '../../src/scenes/camera/cameraMath';

const worldAt = (scroll: number, view: number, screen: number, zoom: number): number =>
  scroll + view / 2 + (screen - view / 2) / zoom;

describe('nextZoomIndex', () => {
  it('steps and clamps at both ends', () => {
    expect(nextZoomIndex(1, 1, 4)).toBe(2);
    expect(nextZoomIndex(3, 1, 4)).toBe(3);
    expect(nextZoomIndex(0, -1, 4)).toBe(0);
  });
});

describe('scrollToKeepPoint', () => {
  it('keeps the world point under the cursor fixed when zooming in and out', () => {
    for (const [oldZ, newZ] of [
      [1, 2],
      [2, 0.5],
      [3, 1],
    ] as const) {
      const before = worldAt(400, 756, 600, oldZ);
      const scroll = scrollToKeepPoint(400, 756, 600, oldZ, newZ);
      expect(worldAt(scroll, 756, 600, newZ)).toBeCloseTo(before, 6);
    }
  });

  it('does not move when zooming at the viewport centre', () => {
    expect(scrollToKeepPoint(250, 800, 400, 1, 2)).toBeCloseTo(250, 6);
  });
});

describe('unionBounds', () => {
  it('wraps all rectangles', () => {
    expect(
      unionBounds([
        { x: 36, y: 32, w: 48, h: 36 },
        { x: 36, y: 68, w: 48, h: 12 },
      ]),
    ).toEqual({ x: 36, y: 32, w: 48, h: 48 });
    expect(unionBounds([])).toBeNull();
  });
});

describe('minZoomIndex', () => {
  const steps = [0.5, 1, 2, 3];
  const ch1 = { x: 0, y: 0, w: 1152, h: 1152 }; // plains + HQ, in pixels

  it('forbids zooming out past the open area', () => {
    expect(minZoomIndex(steps, 756, 432, ch1)).toBe(1); // 0.5× would show 1512 px
    expect(minZoomIndex(steps, 500, 300, ch1)).toBe(0);
  });

  it('falls back to the closest zoom if nothing fits', () => {
    expect(minZoomIndex(steps, 4000, 4000, { x: 0, y: 0, w: 100, h: 100 })).toBe(3);
  });
});
