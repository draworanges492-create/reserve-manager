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
