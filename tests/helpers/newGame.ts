import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGameState, type GameState, type WaterholeState } from '../../src/core/GameState';
import type { TiledMap } from '../../src/core/TiledFormat';
import { readWorldLayout, type WorldLayout } from '../../src/core/WorldLayout';

export const WORLD_MAP = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../public/assets/maps/reserve.tmj'), 'utf8'),
) as TiledMap;

/** Geometry from the real shipped map, so tests exercise the same layout as the game. */
export const WORLD: WorldLayout = readWorldLayout(WORLD_MAP);

export function newGame(seed = 1, playerName?: string): GameState {
  return createGameState({ seed, world: WORLD, playerName });
}

/** Copy of `state` with one waterhole changed. */
export function withLevel(
  state: GameState,
  id: string,
  level: number,
  extra: Partial<WaterholeState> = {},
): GameState {
  const hole = state.waterholes[id];
  if (!hole) throw new Error(`no waterhole ${id}`);
  return { ...state, waterholes: { ...state.waterholes, [id]: { ...hole, level, ...extra } } };
}
