// Engine-level constants (spec §2, §4). Gameplay balance lives in balance.json, not here.
export const GAME_TITLE = 'Reserve Manager';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const TILE_SIZE = 16;

/** Real seconds per in-game day at 1× speed. */
export const DAY_LENGTH_SECONDS = 120;
export const SPEED_STEPS = [0, 1, 2, 4] as const;
