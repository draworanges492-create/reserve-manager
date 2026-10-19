import { describe, expect, it } from 'vitest';
import { createGameState } from '../../src/core/GameState';

describe('createGameState', () => {
  const state = createGameState({ seed: 123, playerName: 'Sam' });

  it('starts at day 0, chapter 1, with the starting money', () => {
    expect(state.clock).toEqual({ day: 0, dayProgress: 0, speed: 1, paused: false });
    expect(state.chapter.current).toBe(1);
    expect(state.resources.money).toBe(500);
  });

  it('unlocks only the Chapter 1 zones', () => {
    const unlocked = Object.entries(state.zones)
      .filter(([, z]) => z.unlocked)
      .map(([id]) => id)
      .sort();
    expect(unlocked).toEqual(['hq', 'plains']);
  });

  it('is plain serializable data', () => {
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
