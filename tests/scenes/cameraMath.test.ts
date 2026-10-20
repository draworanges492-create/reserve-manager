import { describe, expect, it } from 'vitest';
import {
  centredBounds,
  nearestLevel,
  padBounds,
  zoomLevels,
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

describe('zoomLevels (D108)', () => {
  const ch1 = { x: 0, y: 0, w: 1224, h: 1224 };
  const steps = [0.5, 1, 2, 3];

  it('starts with a level that shows the whole area, then the closer fixed steps', () => {
    const levels = zoomLevels(steps, 756, 432, ch1);
    expect(levels[0]).toBeCloseTo(432 / 1224, 6);
    expect(levels.slice(1)).toEqual([0.5, 1, 2, 3]);
  });

  it('skips a fixed step that is barely closer than the fit', () => {
    expect(zoomLevels(steps, 1300, 1300, ch1).slice(1)).toEqual([2, 3]);
  });

  it('never fits further out than needed for a tiny area', () => {
    expect(zoomLevels(steps, 4000, 4000, { x: 0, y: 0, w: 100, h: 100 })).toEqual([3]);
  });
});

describe('nearestLevel', () => {
  it('finds the closest level by ratio', () => {
    expect(nearestLevel([0.35, 0.5, 1, 2, 3], 1)).toBe(2);
    expect(nearestLevel([0.35, 1, 2], 0.5)).toBe(0);
  });
});

describe('centredBounds / padBounds', () => {
  it('grows bounds evenly when the view is bigger, so the area stays centred', () => {
    expect(centredBounds({ x: 100, y: 100, w: 200, h: 400 }, 400, 300)).toEqual({
      x: 0,
      y: 100,
      w: 400,
      h: 400,
    });
  });

  it('adds a margin on every side', () => {
    expect(padBounds({ x: 10, y: 10, w: 20, h: 20 }, 5)).toEqual({ x: 5, y: 5, w: 30, h: 30 });
  });
});
