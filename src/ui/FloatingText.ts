import type Phaser from 'phaser';
import { crispText } from './crispText';
import { TEXT_SIZE } from './theme';

const RISE = 14;
const DURATION_MS = 1400;

/** Short message that floats up and fades at a world position (e.g. "It's already full."). */
export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  depth: number,
): void {
  const label = crispText(scene, x, y, text, {
    fontSize: TEXT_SIZE.body,
    backgroundColor: '#241c16dd',
    padding: { x: 3, y: 2 },
  })
    .setOrigin(0.5, 1)
    .setDepth(depth);
  scene.tweens.add({
    targets: label,
    y: y - RISE,
    alpha: { from: 1, to: 0 },
    delay: DURATION_MS / 2,
    duration: DURATION_MS / 2,
    onComplete: () => label.destroy(),
  });
}
