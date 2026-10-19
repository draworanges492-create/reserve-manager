// Engine-level constants (spec §2, §4). Gameplay balance lives in balance.json, not here.
export const GAME_TITLE = 'Reserve Manager';

/**
 * Minimum internal resolution. The canvas grows beyond this to fill the window
 * (see scaling.ts), so wider screens show more map instead of black bars.
 */
export const BASE_WIDTH = 640;
export const BASE_HEIGHT = 360;
export const TILE_SIZE = 24;

/** Real seconds per in-game day at 1× speed. */
export const DAY_LENGTH_SECONDS = 120;
export const SPEED_STEPS = [0, 1, 2, 4] as const;
