// Pure camera helpers (no Phaser) so the maths can be unit-tested.

export function nextZoomIndex(current: number, direction: 1 | -1, stepCount: number): number {
  return Math.min(stepCount - 1, Math.max(0, current + direction));
}

/**
 * New scroll value that keeps the world point under `screenPos` fixed while zooming.
 * Matches Phaser's camera model, which zooms around the viewport centre.
 */
export function scrollToKeepPoint(
  scroll: number,
  viewSize: number,
  screenPos: number,
  oldZoom: number,
  newZoom: number,
): number {
  const half = viewSize / 2;
  const world = scroll + half + (screenPos - half) / oldZoom;
  return world - half - (screenPos - half) / newZoom;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Smallest rectangle containing all the given rectangles. */
export function unionBounds(rects: readonly Bounds[]): Bounds | null {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Lowest zoom-step index whose view still fits inside the bounds, so zooming out can
 * never show land beyond them. Falls back to the closest-in step if none fits.
 */
export function minZoomIndex(
  steps: readonly number[],
  viewWidth: number,
  viewHeight: number,
  bounds: Bounds,
): number {
  const fits = steps.findIndex((z) => viewWidth / z <= bounds.w && viewHeight / z <= bounds.h);
  return fits === -1 ? steps.length - 1 : fits;
}
