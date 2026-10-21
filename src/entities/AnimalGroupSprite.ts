import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { eventBus } from '../core/EventBus';
import { DEPTH } from '../scenes/depth';
import { pickSpot, type Rect, stepToward } from './herdMath';
import { ART_SCALE, WORLD_ART } from '../config/game';

const CFG = BALANCE.render.animals;
const RING_COLOR = 0xe8d9a8;
/** How far (in tiles) a herd's centre may wander per move across its zone. */
const HERD_ROAM_TILES = 8;

export interface AnimalGroupOptions {
  zoneId: string;
  speciesId: string;
  textureKey: string;
  /** Zone rectangle in world pixels; members never leave it. */
  area: Rect;
  /** Where the herd starts, in world pixels. */
  home: { x: number; y: number };
  tileSize: number;
  /** True where an animal can't stand (deep water, rocks, buildings, waterhole pools). */
  blocked: (x: number, y: number) => boolean;
  /** A waterhole with water in this zone (world px), if any: herds wander toward it (spec §5). */
  waterSpot?: () => { x: number; y: number } | null;
  /** A single animal was clicked (Easter eggs, D132). `special` = the albino member. */
  onMemberClick?: (sprite: Phaser.GameObjects.Sprite, special: boolean) => void;
}

/** Chance a herd heads for water (when there is some) each time it picks a new spot. */
const WATER_PULL = 0.5;
/** How close to a waterhole's centre a thirsty herd gathers, in tiles. */
const DRINKING_RADIUS_TILES = 3;

interface Member {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  target: { x: number; y: number } | null;
  pauseMs: number;
  speed: number;
  frameMs: number;
  /** Lying on its back until this many ms of game time have passed (the lazy lion). */
  rollMs: number;
}

const between = (r: { min: number; max: number }): number => Phaser.Math.FloatBetween(r.min, r.max);

/**
 * One species in one zone, drawn as a small herd (spec §5: population is a number; each
 * sprite stands for a share). Purely visual: members graze, then amble slowly to a new
 * spot near the herd's centre, which itself drifts around the zone (user request: animals
 * never stay in one place). Hovering shows the count; clicking selects the herd.
 */
export class AnimalGroupSprite {
  readonly key: string;
  private readonly members: Member[] = [];
  private readonly ring: Phaser.GameObjects.Graphics;
  private centre: { x: number; y: number };
  private centreTarget: { x: number; y: number } | null = null;
  private restMs = between(CFG.herdRestMs);
  private highlighted = false;
  /** Texture of the one special (albino) member, if any. */
  private specialKey: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: AnimalGroupOptions,
  ) {
    this.key = `${opts.zoneId}:${opts.speciesId}`;
    this.centre = { ...opts.home };
    this.ring = scene.add.graphics().setDepth(DEPTH.actors - 0.5);
  }

  /** Add or remove sprites so the herd shows `count` of them. */
  setCount(count: number): void {
    while (this.members.length < count) this.members.push(this.spawnMember());
    while (this.members.length > count) {
      const m = this.members.pop();
      m?.sprite.destroy();
      m?.shadow.destroy();
    }
  }

  /** Give the first member a special texture (null puts it back). Safe to call every frame. */
  setSpecial(textureKey: string | null): void {
    const first = this.members[0];
    const want = textureKey ?? this.opts.textureKey;
    this.specialKey = textureKey;
    if (first && first.sprite.texture.key !== want) first.sprite.setTexture(want, 0);
  }

  /** Where the special member stands, for focusing the camera. */
  specialPosition(): { x: number; y: number } | null {
    const first = this.members[0];
    return this.specialKey && first ? { x: first.sprite.x, y: first.sprite.y } : null;
  }

  /** The lazy lion (D132): roll this animal onto its back for a while. */
  rollOver(sprite: Phaser.GameObjects.Sprite, ms: number): void {
    const m = this.members.find((x) => x.sprite === sprite);
    if (!m) return;
    m.rollMs = ms;
    m.target = null;
    sprite.setFrame(0).setFlipY(true);
    this.scene.tweens.add({ targets: sprite, y: sprite.y - 3, duration: 140, yoyo: true });
  }

  setHighlighted(on: boolean): void {
    this.highlighted = on;
    if (!on) this.ring.clear();
  }

  /** `timeScale` is the game speed (0 while paused), so herds move faster at 4×. */
  update(deltaMs: number, timeScale: number): void {
    const dt = (deltaMs / 1000) * timeScale;
    // Rolls last in real time, so they read the same at any speed.
    for (const m of this.members)
      if (m.rollMs > 0) {
        m.rollMs -= deltaMs;
        if (m.rollMs <= 0) m.sprite.setFlipY(false);
      }
    if (timeScale > 0) {
      this.moveHerdCentre(dt, deltaMs * timeScale);
      for (const m of this.members) this.moveMember(m, dt, deltaMs * timeScale);
    }
    if (this.highlighted) this.drawRing();
  }

  /** True if any member stands inside `view` (world px), i.e. the player can see this herd. */
  visibleIn(view: Phaser.Geom.Rectangle): boolean {
    return this.members.some((m) => view.contains(m.sprite.x, m.sprite.y));
  }

  destroy(): void {
    this.setCount(0);
    this.ring.destroy();
  }

  private spawnMember(): Member {
    const { scene, opts } = this;
    const at = this.spotNearCentre() ?? this.centre;
    const shadowKey =
      scene.textures.getFrame(opts.textureKey, 0).width > 24 * ART_SCALE
        ? 'shadow-lg'
        : 'shadow-sm';
    const shadow = scene.add.image(at.x, at.y - 1, shadowKey).setScale(WORLD_ART);
    const sprite = scene.add
      .sprite(at.x, at.y, opts.textureKey, 0)
      .setOrigin(0.5, 1)
      .setScale(WORLD_ART)
      .setFlipX(Math.random() < 0.5);
    // Click target: the body, not the transparent corners of the frame.
    const w = sprite.width;
    const h = sprite.height;
    sprite.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(w * 0.15, h * 0.2, w * 0.7, h * 0.75),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    const group = { zoneId: opts.zoneId, speciesId: opts.speciesId };
    sprite.on(Phaser.Input.Events.POINTER_OVER, () => eventBus.emit('animalHover', { group }));
    sprite.on(Phaser.Input.Events.POINTER_OUT, () => eventBus.emit('animalHover', { group: null }));
    sprite.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() > CFG.clickMaxMovePx) return;
      eventBus.emit('animalSelected', { group });
      const special = !!this.specialKey && this.members[0]?.sprite === sprite;
      opts.onMemberClick?.(sprite, special);
    });
    const member: Member = {
      sprite,
      shadow,
      target: null,
      pauseMs: between(CFG.grazePauseMs),
      speed: between(CFG.walkSpeed),
      frameMs: 0,
      rollMs: 0,
    };
    this.place(member, at.x, at.y);
    return member;
  }

  private spotNearCentre(): { x: number; y: number } | null {
    const { opts } = this;
    return pickSpot(
      this.centre,
      CFG.herdRadiusTiles * opts.tileSize,
      opts.area,
      opts.blocked,
      Math.random,
    );
  }

  private moveHerdCentre(dt: number, scaledMs: number): void {
    if (this.centreTarget) {
      const next = stepToward(this.centre, this.centreTarget, CFG.herdDriftSpeed * dt);
      this.centre = { x: next.x, y: next.y };
      if (next.arrived) {
        this.centreTarget = null;
        this.restMs = between(CFG.herdRestMs);
      }
      return;
    }
    this.restMs -= scaledMs;
    if (this.restMs <= 0) {
      const { opts } = this;
      const water = opts.waterSpot?.();
      this.centreTarget =
        water && Math.random() < WATER_PULL
          ? pickSpot(
              water,
              DRINKING_RADIUS_TILES * opts.tileSize,
              opts.area,
              opts.blocked,
              Math.random,
            )
          : pickSpot(
              this.centre,
              HERD_ROAM_TILES * opts.tileSize,
              opts.area,
              opts.blocked,
              Math.random,
            );
      this.restMs = between(CFG.herdRestMs);
    }
  }

  private moveMember(m: Member, dt: number, scaledMs: number): void {
    if (m.rollMs > 0) return;
    if (m.pauseMs > 0) {
      m.pauseMs -= scaledMs;
      m.sprite.setFrame(0); // standing / grazing
      return;
    }
    m.target ??= this.spotNearCentre();
    if (!m.target) {
      m.pauseMs = between(CFG.grazePauseMs);
      return;
    }
    const next = stepToward(m.sprite, m.target, m.speed * dt);
    if (next.x !== m.sprite.x) m.sprite.setFlipX(next.x < m.sprite.x);
    this.place(m, next.x, next.y);
    m.frameMs += scaledMs;
    if (m.frameMs >= CFG.walkFrameMs) {
      m.frameMs = 0;
      m.sprite.setFrame(String(m.sprite.frame.name) === '0' ? 1 : 0);
    }
    if (next.arrived) {
      m.target = null;
      m.pauseMs = between(CFG.grazePauseMs);
    }
  }

  private place(m: Member, x: number, y: number): void {
    // Lower on screen draws in front.
    const depth = DEPTH.actors + y / 10000;
    m.sprite.setPosition(x, y).setDepth(depth);
    // Shadows sit on the ground under every animal (and under the highlight ring).
    m.shadow.setPosition(Math.round(x), Math.round(y) - 1).setDepth(DEPTH.actors - 1);
  }

  private drawRing(): void {
    this.ring.clear().lineStyle(1, RING_COLOR, 0.9);
    for (const m of this.members) {
      this.ring.strokeEllipse(m.sprite.x, m.sprite.y - 1, m.sprite.displayWidth * 0.8, 7);
    }
  }
}
