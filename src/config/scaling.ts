import { BASE_HEIGHT, BASE_WIDTH } from './game';

export interface Viewport {
  /** Whole-number screen pixels per game pixel. */
  zoom: number;
  /** Internal canvas size in game pixels. */
  width: number;
  height: number;
}

/**
 * Picks the largest whole-number zoom at which the base resolution still fits,
 * then widens the canvas to fill the window at that zoom. Integer zoom keeps
 * every pixel square; fractional scaling would smear pixel art.
 */
export interface RenderSize {
  /** Device pixels per game pixel: the whole-number zoom × devicePixelRatio, rounded. */
  scale: number;
  /** Canvas size in device pixels. */
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Size of a canvas that covers the window at full device resolution, so text and fine
 * detail are drawn with every screen pixel instead of being stretched (DECISIONS D102).
 */
export function computeRender(windowWidth: number, windowHeight: number, dpr: number): RenderSize {
  const { zoom } = computeViewport(windowWidth, windowHeight);
  const scale = Math.max(1, Math.round(zoom * dpr));
  // Never smaller than the base view: a hidden or zero-size window must still give WebGL a
  // real canvas (a 0×0 canvas fails to boot).
  return {
    scale,
    canvasWidth: Math.max(BASE_WIDTH * scale, Math.round(windowWidth * dpr)),
    canvasHeight: Math.max(BASE_HEIGHT * scale, Math.round(windowHeight * dpr)),
  };
}

export function computeViewport(
  windowWidth: number,
  windowHeight: number,
  baseWidth = BASE_WIDTH,
  baseHeight = BASE_HEIGHT,
): Viewport {
  const fit = Math.min(windowWidth / baseWidth, windowHeight / baseHeight);
  const zoom = Math.max(1, Math.floor(fit));
  return {
    zoom,
    width: Math.max(baseWidth, Math.floor(windowWidth / zoom)),
    height: Math.max(baseHeight, Math.floor(windowHeight / zoom)),
  };
}
