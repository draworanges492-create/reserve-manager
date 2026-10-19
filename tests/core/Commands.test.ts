import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/core/Commands';
import { createGameState } from '../../src/core/GameState';

const fresh = () => createGameState({ seed: 1 });

describe('applyCommand', () => {
  it('sets a valid speed and announces it', () => {
    const r = applyCommand(fresh(), { type: 'setSpeed', speed: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.clock.speed).toBe(4);
    expect(r.events).toEqual([{ type: 'speedChanged', payload: { speed: 4, paused: false } }]);
  });

  it('rejects an unknown speed with a reason', () => {
    expect(applyCommand(fresh(), { type: 'setSpeed', speed: 3 })).toEqual({
      ok: false,
      reason: 'command.invalidSpeed',
    });
  });

  it('toggles pause and keeps the chosen speed', () => {
    const fast = applyCommand(fresh(), { type: 'setSpeed', speed: 2 });
    if (!fast.ok) throw new Error('setup failed');
    const paused = applyCommand(fast.state, { type: 'togglePause' });
    if (!paused.ok) throw new Error('pause failed');
    expect(paused.state.clock).toMatchObject({ paused: true, speed: 2 });
    const resumed = applyCommand(paused.state, { type: 'togglePause' });
    expect(resumed.ok && resumed.state.clock).toMatchObject({ paused: false, speed: 2 });
  });

  it('un-pauses when a speed is chosen', () => {
    const paused = applyCommand(fresh(), { type: 'setPaused', paused: true });
    if (!paused.ok) throw new Error('setup failed');
    const r = applyCommand(paused.state, { type: 'setSpeed', speed: 1 });
    expect(r.ok && r.state.clock.paused).toBe(false);
  });
});
