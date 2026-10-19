import { GAME_HEIGHT, GAME_WIDTH } from './game';

/**
 * Largest whole-number zoom that fits the window. Integer steps keep every pixel
 * square; fractional scaling would smear pixel art.
 */
export function computeIntegerZoom(
  windowWidth: number,
  windowHeight: number,
  baseWidth = GAME_WIDTH,
  baseHeight = GAME_HEIGHT,
): number {
  const fit = Math.min(windowWidth / baseWidth, windowHeight / baseHeight);
  return Math.max(1, Math.floor(fit));
}
