import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { eventBus } from '../core/EventBus';
import { t } from '../core/text';
import { WORLD_ART } from '../config/game';
import type { GameSession } from '../core/GameSession';
import { findSecret } from '../core/Secrets';
import { DEPTH } from './depth';
import type { ZoneArea } from './map/mapObjects';

const CFG = BALANCE.secrets;
/** Night, as a share of the day (matches the darkest part of the time-of-day wash). */
const NIGHT_END = 0.06;
const NIGHT_START = 0.9;
const STAR_MS = 700;
const BADGER_FRAME_MS = 160;
/** The HQ office on the map, in tiles (tools/map/layout.ts). */
const HQ_OFFICE = { x: 50, y: 72, w: 3, h: 2 };

export function isNight(dayProgress: number): boolean {
  return dayProgress < NIGHT_END || dayProgress > NIGHT_START;
}

/**
 * Easter eggs that live on the map but outside the simulation (D132): the honey badger
 * trotting across the woodland, and shooting stars over the outcrop at night. Purely visual.
 */
export class SecretsLayer {
  private badger: {
    sprite: Phaser.GameObjects.Sprite;
    shadow: Phaser.GameObjects.Image;
    tween: Phaser.Tweens.Tween;
    frameMs: number;
  } | null = null;
  private teaShown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
    private readonly zones: ZoneArea[],
    private readonly fullyZoomedIn: () => boolean,
    private readonly tileSize: number,
  ) {}

  update(deltaMs: number): void {
    const { clock, flags } = this.session.state;
    if (flags.secret_name) findSecret('name'); // Tendai reacted to the player's name
    this.tea();
    if (clock.paused) return;
    const seconds = deltaMs / 1000;
    this.maybeBadger(seconds);
    this.animateBadger(deltaMs);
    this.maybeShootingStar(seconds);
  }

  /** Late at night, hovering over the HQ office: "Tendai is brewing something terrible." */
  private tea(): void {
    const p = this.scene.input.activePointer;
    const world = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    const ts = this.tileSize;
    const over =
      isNight(this.session.state.clock.dayProgress) &&
      world.x >= HQ_OFFICE.x * ts &&
      world.x < (HQ_OFFICE.x + HQ_OFFICE.w) * ts &&
      world.y >= HQ_OFFICE.y * ts &&
      world.y < (HQ_OFFICE.y + HQ_OFFICE.h) * ts;
    if (over === this.teaShown) return;
    this.teaShown = over;
    eventBus.emit('secretHover', { text: over ? t('secrets.tea') : null });
    if (over) findSecret('tea');
  }

  private zone(id: string): ZoneArea | undefined {
    return this.zones.find((z) => z.id === id);
  }

  private maybeBadger(seconds: number): void {
    const { state } = this.session;
    if (this.badger || state.chapter.current < CFG.badgerFromChapter) return;
    const woodland = this.zone('woodland');
    if (!woodland || !state.zones.woodland?.unlocked) return;
    const view = this.scene.cameras.main.worldView;
    if (!Phaser.Geom.Rectangle.Overlaps(view, woodland.rect)) return;
    if (Math.random() >= CFG.badgerChancePerSecond * seconds) return;
    // Cross the part of the woodland the player can see.
    const area = Phaser.Geom.Rectangle.Intersection(view, woodland.rect);
    if (area.width < 48 || area.height < 24) return;
    const leftToRight = Math.random() < 0.5;
    const y = area.y + area.height * Phaser.Math.FloatBetween(0.3, 0.8);
    const fromX = leftToRight ? area.x - 12 : area.right + 12;
    const toX = leftToRight ? area.right + 12 : area.x - 12;
    const shadow = this.scene.add
      .image(fromX, y - 1, 'shadow-sm')
      .setScale(WORLD_ART * 0.8)
      .setDepth(DEPTH.actors - 1);
    const sprite = this.scene.add
      .sprite(fromX, y, 'badger', 0)
      .setOrigin(0.5, 1)
      .setScale(WORLD_ART)
      .setFlipX(!leftToRight)
      .setDepth(DEPTH.actors + y / 10000)
      .setInteractive({ useHandCursor: true });
    const tween = this.scene.tweens.add({
      targets: [sprite, shadow],
      x: toX,
      duration: CFG.badgerCrossMs * (area.width / (this.scene.cameras.main.worldView.width || 1)),
      onComplete: () => this.removeBadger(),
    });
    sprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.session.dispatch({ type: 'noteRarity', id: 'honey_badger', zoneId: 'woodland' });
      findSecret('honey_badger');
      tween.timeScale = 3; // and off it scurries
    });
    this.badger = { sprite, shadow, tween, frameMs: 0 };
  }

  private animateBadger(deltaMs: number): void {
    const b = this.badger;
    if (!b) return;
    b.frameMs += deltaMs * b.tween.timeScale;
    if (b.frameMs >= BADGER_FRAME_MS) {
      b.frameMs = 0;
      b.sprite.setFrame(String(b.sprite.frame.name) === '0' ? 1 : 0);
    }
  }

  private removeBadger(): void {
    this.badger?.sprite.destroy();
    this.badger?.shadow.destroy();
    this.badger = null;
  }

  /** At night, fully zoomed in over the outcrop, a shooting star now and then. */
  private maybeShootingStar(seconds: number): void {
    const outcrop = this.zone('outcrop');
    const cam = this.scene.cameras.main;
    if (!outcrop || !isNight(this.session.state.clock.dayProgress) || !this.fullyZoomedIn()) return;
    if (!outcrop.rect.contains(cam.worldView.centerX, cam.worldView.centerY)) return;
    if (Math.random() >= CFG.shootingStarChancePerSecond * seconds) return;
    const v = cam.worldView;
    const x = v.x + v.width * Phaser.Math.FloatBetween(0.15, 0.7);
    const y = v.y + v.height * Phaser.Math.FloatBetween(0.08, 0.3);
    const len = v.width * 0.25;
    const star = this.scene.add.graphics().setDepth(DEPTH.floatingText);
    const progress = { t: 0 };
    this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration: STAR_MS,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const head = { x: x + len * progress.t, y: y + len * 0.4 * progress.t };
        const tail = 0.35 * len * Math.min(progress.t * 3, 1);
        star.clear();
        star.lineStyle(1, 0xfff6d8, 1 - progress.t * 0.8);
        star.lineBetween(head.x - tail, head.y - tail * 0.4, head.x, head.y);
        star.fillStyle(0xffffff, 1 - progress.t * 0.6).fillCircle(head.x, head.y, 0.8);
      },
      onComplete: () => star.destroy(),
    });
    findSecret('shooting_star');
  }
}
