import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from '../../src/core/EventBus';
import { newGame } from '../helpers/newGame';
import { GameSession } from '../../src/core/GameSession';

describe('GameSession', () => {
  const offs: (() => void)[] = [];
  afterEach(() => offs.splice(0).forEach((off) => off()));

  it('runs day ticks as real time passes and publishes them', () => {
    const onDay = vi.fn();
    offs.push(eventBus.on('dayTick', onDay));
    const session = new GameSession(newGame(3));
    session.update(120_000);
    expect(session.state.clock.day).toBe(1);
    expect(onDay).toHaveBeenCalledWith({ day: 1 });
  });

  it('stops the clock while paused', () => {
    const session = new GameSession(newGame(3));
    session.dispatch({ type: 'togglePause' });
    session.update(600_000);
    expect(session.state.clock.day).toBe(0);
  });
});
