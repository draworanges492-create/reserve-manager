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

/**
 * World camera zoom steps (on top of the whole-screen integer zoom). Spec §5 said 2×–4×,
 * but that was for 480×270 with no screen zoom; here 1× already shows ~31×18 tiles on a
 * MacBook, and 0.5× gives an overview (DECISIONS D14).
 */
export const CAMERA_ZOOM_STEPS = [0.5, 1, 2, 3] as const;
export const CAMERA_DEFAULT_ZOOM_INDEX = 1;
/** Keyboard / edge-scroll pan speed in screen game-pixels per second. */
export const CAMERA_PAN_SPEED = 420;
/** Mouse within this many game pixels of the edge scrolls the map. */
export const CAMERA_EDGE_SCROLL_MARGIN = 6;
/** Accumulated wheel delta needed for one zoom step (trackpads send many small deltas). */
export const CAMERA_WHEEL_STEP = 60;
export const CAMERA_WHEEL_COOLDOWN_MS = 180;
/** Finger-distance ratio that counts as one pinch zoom step. */
export const CAMERA_PINCH_STEP = 1.25;

/** Chapter shown before GameState exists (Phase 2); drives locked-zone dimming. */
export const START_CHAPTER = 1;
