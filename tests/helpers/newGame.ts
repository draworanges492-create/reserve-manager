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

/** Copy of `state` with one herd's count changed. */
export function withPopulation(
  state: GameState,
  zoneId: string,
  speciesId: string,
  n: number,
): GameState {
  return {
    ...state,
    populations: {
      ...state.populations,
      [zoneId]: { ...state.populations[zoneId], [speciesId]: n },
    },
  };
}

/** Copy of `state` with a zone's vegetation changed. */
export function withVegetation(state: GameState, zoneId: string, vegetation: number): GameState {
  const zone = state.zones[zoneId];
  if (!zone) throw new Error(`no zone ${zoneId}`);
  return { ...state, zones: { ...state.zones, [zoneId]: { ...zone, vegetation } } };
}

/** Unwraps a value the test knows exists, failing loudly if it doesn't. */
export function must<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error('expected a value');
  return value;
}
