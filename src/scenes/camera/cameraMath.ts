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
