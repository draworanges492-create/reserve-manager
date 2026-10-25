import type Phaser from 'phaser';
import { reduceMotion } from '../core/Settings';
import { type Focusable, registerFocusable } from '../ui/focus';

const PAN_MS = 250;

/**
 * Lets the keyboard reach something on the map (D139): when it takes focus the camera moves
 * to it, and `hover` shows the same tooltip the mouse would.
 */
export function registerMapFocusable(
  scene: Phaser.Scene,
  target: Focusable['target'],
  activate: () => void,
  opts: {
    available?: () => boolean;
    priority?: () => number;
    hover?: (on: boolean) => void;
  } = {},
): void {
  const unregister = registerFocusable({
    scene,
    target,
    world: true,
    activate,
    available: opts.available,
    priority: opts.priority,
    onFocus: () => {
      const b = target.getBounds();
      const cam = scene.cameras.main;
      if (reduceMotion()) cam.centerOn(b.centerX, b.centerY);
      else cam.pan(b.centerX, b.centerY, PAN_MS, 'Sine.easeInOut');
      opts.hover?.(true);
    },
    onBlur: () => opts.hover?.(false),
  });
  target.once('destroy', unregister);
}
