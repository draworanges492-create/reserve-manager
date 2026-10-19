import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { eventBus } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { DEPTH } from '../scenes/depth';
import { waterVisualState, type WaterVisualState } from '../sim/Water';

const FRAME: Record<WaterVisualState, number> = { clear: 0, muddy: 1, drying: 2, dry: 3 };
/** Clickable area: an ellipse a little larger than the full pool (frame is 96×96). */
const HIT_AREA = new Phaser.Geom.Ellipse(48, 48, 88, 72);
const SPLASH_DROPS = 6;
const BUCKET_LIFT = 26;

/**
 * A waterhole on the map. Its frame follows the level (clear / muddy / drying / dry);
 * clicking refills once and holding keeps pumping (spec §6.1 chore).
 */
export class WaterholeSprite {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly splash: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bucket: Phaser.GameObjects.Image;
  private holdTimer: Phaser.Time.TimerEvent | null = null;
  private shown: WaterVisualState | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
    private readonly id: string,
    tileSize: number,
  ) {
    const hole = session.state.waterholes[id];
    if (!hole) throw new Error(`Unknown waterhole "${id}"`);
    const x = hole.x * tileSize;
    const y = hole.y * tileSize;

    this.sprite = scene.add.sprite(x, y, 'waterhole', 0).setDepth(DEPTH.waterholes);
    // Pressing here pumps water, so it must not start a camera drag.
    this.sprite.setData('blocksDrag', true);
    this.sprite.setInteractive({
      hitArea: HIT_AREA,
      hitAreaCallback: Phaser.Geom.Ellipse.Contains,
      useHandCursor: true,
    });
    this.splash = scene.add
      .particles(x, y, 'fx-drop', {
        speed: { min: 25, max: 60 },
        angle: { min: 210, max: 330 },
        gravityY: 160,
        lifespan: 450,
        emitting: false,
      })
      .setDepth(DEPTH.effects);
    this.bucket = scene.add
      .image(x + 10, y - 10, 'bucket')
      .setDepth(DEPTH.effects)
      .setAlpha(0);

    this.sprite.on(Phaser.Input.Events.POINTER_OVER, () => eventBus.emit('waterholeHover', { id }));
    this.sprite.on(Phaser.Input.Events.POINTER_OUT, () => {
      eventBus.emit('waterholeHover', { id: null });
      this.stopHold();
    });
    this.sprite.on(Phaser.Input.Events.POINTER_DOWN, () => this.startHold());
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.stopHold, this);

    const off = eventBus.on('waterholeRefilled', (e) => {
      if (e.id === id) this.playRefill();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      scene.input.off(Phaser.Input.Events.POINTER_UP, this.stopHold, this);
    });
    this.update();
  }

  update(): void {
    const level = this.session.state.waterholes[this.id]?.level ?? 0;
    const state = waterVisualState(level);
    if (state !== this.shown) {
      this.shown = state;
      this.sprite.setFrame(FRAME[state]);
    }
  }

  private startHold(): void {
    this.stopHold();
    if (!this.refill()) return;
    this.holdTimer = this.scene.time.addEvent({
      delay: BALANCE.water.refillHoldIntervalMs,
      loop: true,
      callback: () => {
        if (!this.refill()) this.stopHold();
      },
    });
  }

  private stopHold(): void {
    this.holdTimer?.remove();
    this.holdTimer = null;
  }

  /** Returns false (and shows why) when the refill was refused. */
  private refill(): boolean {
    const result = this.session.dispatch({ type: 'refillWaterhole', id: this.id });
    if (!result.ok) {
      eventBus.emit('commandFailed', {
        reason: result.reason,
        worldX: this.sprite.x,
        worldY: this.sprite.y - 30,
      });
    }
    this.update();
    return result.ok;
  }

  private playRefill(): void {
    this.splash.explode(SPLASH_DROPS);
    const startY = this.sprite.y - 10;
    this.scene.tweens.killTweensOf(this.bucket);
    this.bucket
      .setPosition(this.sprite.x + 10, startY)
      .setAlpha(1)
      .setAngle(0);
    this.scene.tweens.add({
      targets: this.bucket,
      y: startY - BUCKET_LIFT / 2,
      angle: -45,
      duration: 160,
      yoyo: true,
      onComplete: () => this.scene.tweens.add({ targets: this.bucket, alpha: 0, duration: 250 }),
    });
  }
}
