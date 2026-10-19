import Phaser from 'phaser';
import { Rng } from '../core/Rng';
import { DEPTH } from '../scenes/depth';

const SCATTER_X = 30;
const SCATTER_Y = 18;

/**
 * A few animal sprites around one point. Phase 1 uses it only as a static preview so
 * the art's readability can be judged; Phase 4 adds wandering and population counts.
 * Readability (DECISIONS D13): saturated outlined sprite + ground shadow + idle bob.
 */
export class AnimalGroupSprite {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    count: number,
    seed: number,
  ) {
    const rng = new Rng(seed);
    const frame = scene.textures.getFrame(textureKey, 0);
    const shadowKey = frame.width > 24 ? 'shadow-lg' : 'shadow-sm';
    for (let i = 0; i < count; i++) {
      const px = Math.round(x + rng.int(-SCATTER_X, SCATTER_X));
      const py = Math.round(y + rng.int(-SCATTER_Y, SCATTER_Y));
      const depth = DEPTH.actors + py / 1000;
      const shadow = scene.add.image(px, py - 1, shadowKey).setDepth(depth);
      const sprite = scene.add
        .sprite(px, py, textureKey, rng.int(0, 1))
        .setOrigin(0.5, 1)
        .setFlipX(rng.chance(0.5))
        .setDepth(depth);
      this.parts.push(shadow, sprite);
      scene.tweens.add({
        targets: sprite,
        y: py - 1,
        duration: rng.int(500, 900),
        delay: rng.int(0, 800),
        yoyo: true,
        repeat: -1,
        ease: 'Stepped',
      });
    }
  }

  destroy(): void {
    this.parts.forEach((part) => part.destroy());
  }
}
