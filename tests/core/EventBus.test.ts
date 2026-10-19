import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus';

type Events = { ping: { n: number } };

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus<Events>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.emit('ping', { n: 3 });
    expect(handler).toHaveBeenCalledWith({ n: 3 });
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new EventBus<Events>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    off();
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});
