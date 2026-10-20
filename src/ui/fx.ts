import type Phaser from 'phaser';

const DUST_COUNT = 10;

/** A quick puff of dust at a world point (finished buildings, mended fences). */
export function dustPuff(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  count = DUST_COUNT,
): void {
  const emitter = scene.add
    .particles(x, y, 'fx-dust', {
      speed: { min: 12, max: 40 },
      angle: { min: 180, max: 360 },
      gravityY: 40,
      lifespan: 600,
      alpha: { start: 0.9, end: 0 },
      scale: { start: 1, end: 0.6 },
      emitting: false,
    })
    .setDepth(depth);
  emitter.explode(count);
  scene.time.delayedCall(800, () => emitter.destroy());
}
