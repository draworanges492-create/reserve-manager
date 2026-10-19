import { describe, expect, it } from 'vitest';
import { nextZoomIndex, scrollToKeepPoint } from '../../src/scenes/camera/cameraMath';

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
