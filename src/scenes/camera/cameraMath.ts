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
 * The zoom levels on offer: first the one that fits the whole area on screen (the bird's-eye
 * view, DECISIONS D108), then every fixed step that zooms in further than that.
 */
export function zoomLevels(
  steps: readonly number[],
  viewWidth: number,
  viewHeight: number,
  bounds: Bounds,
): number[] {
  const fit = Math.min(viewWidth / bounds.w, viewHeight / bounds.h, ...steps.slice(-1));
  // Skip fixed steps barely closer than the fit: they'd feel like a wasted scroll.
  return [fit, ...steps.filter((z) => z > fit * 1.1)];
}

/** Index of the level closest to `zoom`. */
export function nearestLevel(levels: readonly number[], zoom: number): number {
  let best = 0;
  levels.forEach((z, i) => {
    if (Math.abs(Math.log(z / zoom)) < Math.abs(Math.log((levels[best] ?? z) / zoom))) best = i;
  });
  return best;
}

/**
 * Camera bounds for a view of `viewWidth × viewHeight` world pixels: the area itself, grown
 * evenly on any side where the view is bigger, so a zoomed-out view stays centred on it.
 */
export function centredBounds(bounds: Bounds, viewWidth: number, viewHeight: number): Bounds {
  const w = Math.max(bounds.w, viewWidth);
  const h = Math.max(bounds.h, viewHeight);
  return { x: bounds.x - (w - bounds.w) / 2, y: bounds.y - (h - bounds.h) / 2, w, h };
}

/** Grow a rectangle by `margin` on every side. */
export function padBounds(bounds: Bounds, margin: number): Bounds {
  return {
    x: bounds.x - margin,
    y: bounds.y - margin,
    w: bounds.w + margin * 2,
    h: bounds.h + margin * 2,
  };
}
