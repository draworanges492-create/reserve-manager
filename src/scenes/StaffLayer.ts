import Phaser from 'phaser';
import { staffRole } from '../core/content';
import { eventBus } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { pickSpot, type Rect, stepToward } from '../entities/herdMath';
import { DEPTH } from './depth';
import type { ZoneArea } from './map/mapObjects';
import { WORLD_ART } from '../config/game';

/** Patrol pace in game px/s at 1× — brisker than grazing animals. */
const WALK_SPEED = 12;
const PAUSE_MS = { min: 800, max: 3000 };
const PATROL_RADIUS_TILES = 10;
const FRAME_MS = 220;

interface Walker {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  zoneId: string | null;
  target: { x: number; y: number } | null;
  pauseMs: number;
  frameMs: number;
}

/**
 * Staff on the map (spec §7.3): each member walks a patrol around their assigned zone,
 * or waits around HQ while unassigned. Purely visual; follows `state.staff`.
 */
export class StaffLayer {
  private readonly walkers = new Map<string, Walker>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
    private readonly zones: ZoneArea[],
    private readonly tileSize: number,
    private readonly blocked: (x: number, y: number) => boolean,
  ) {}

  update(deltaMs: number): void {
    const { staff, clock } = this.session.state;
    const timeScale = clock.paused ? 0 : clock.speed;
    const present = new Set(staff.map((s) => s.id));
    for (const [id, w] of this.walkers) {
      if (!present.has(id)) {
        w.sprite.destroy();
        w.shadow.destroy();
        this.walkers.delete(id);
      }
    }
    for (const member of staff) {
      const walker =
        this.walkers.get(member.id) ?? this.spawn(member.id, member.role, member.zoneId);
      if (walker.zoneId !== member.zoneId) {
        walker.zoneId = member.zoneId; // reassigned: head for the new zone
        walker.target = null;
        walker.pauseMs = 0;
      }
      if (timeScale > 0) this.move(walker, deltaMs * timeScale);
    }
  }

  private areaOf(zoneId: string | null): Rect {
    const zone = this.zones.find((z) => z.id === (zoneId ?? 'hq')) ?? this.zones[0];
    const r = zone?.rect ?? new Phaser.Geom.Rectangle(0, 0, 1, 1);
    const inset = this.tileSize / 2;
    return { x: r.x + inset, y: r.y + inset, w: r.width - inset * 2, h: r.height - inset * 2 };
  }

  private spawn(id: string, roleId: string, zoneId: string | null): Walker {
    const area = this.areaOf(null);
    const start = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
    const key = staffRole(roleId)?.spriteKey ?? 'ranger';
    const shadow = this.scene.add
      .image(start.x, start.y - 1, 'shadow-sm')
      .setScale(WORLD_ART)
      .setDepth(DEPTH.actors - 1);
    const sprite = this.scene.add
      .sprite(start.x, start.y, key, 0)
      .setOrigin(0.5, 1)
      .setScale(WORLD_ART)
      .setInteractive({ useHandCursor: true });
    sprite.on(Phaser.Input.Events.POINTER_OVER, () => eventBus.emit('staffHover', { staffId: id }));
    sprite.on(Phaser.Input.Events.POINTER_OUT, () =>
      eventBus.emit('staffHover', { staffId: null }),
    );
    const walker: Walker = { sprite, shadow, zoneId, target: null, pauseMs: 0, frameMs: 0 };
    this.walkers.set(id, walker);
    return walker;
  }

  private move(w: Walker, scaledMs: number): void {
    if (w.pauseMs > 0) {
      w.pauseMs -= scaledMs;
      w.sprite.setFrame(0);
      return;
    }
    const area = this.areaOf(w.zoneId);
    if (!w.target) {
      // Away from the zone (just reassigned): walk to its middle first.
      const inside =
        w.sprite.x >= area.x &&
        w.sprite.y >= area.y &&
        w.sprite.x <= area.x + area.w &&
        w.sprite.y <= area.y + area.h;
      const centre = inside
        ? { x: w.sprite.x, y: w.sprite.y }
        : { x: area.x + area.w / 2, y: area.y + area.h / 2 };
      w.target = inside
        ? pickSpot(centre, PATROL_RADIUS_TILES * this.tileSize, area, this.blocked, Math.random)
        : centre;
      if (!w.target) {
        w.pauseMs = PAUSE_MS.min;
        return;
      }
    }
    const next = stepToward(w.sprite, w.target, (WALK_SPEED * scaledMs) / 1000);
    if (next.x !== w.sprite.x) w.sprite.setFlipX(next.x < w.sprite.x);
    const depth = DEPTH.actors + next.y / 10000;
    w.sprite.setPosition(next.x, next.y).setDepth(depth);
    w.shadow.setPosition(Math.round(next.x), Math.round(next.y) - 1);
    w.frameMs += scaledMs;
    if (w.frameMs >= FRAME_MS) {
      w.frameMs = 0;
      w.sprite.setFrame(w.sprite.frame.name === '0' ? 1 : 0);
    }
    if (next.arrived) {
      w.target = null;
      w.pauseMs = Phaser.Math.Between(PAUSE_MS.min, PAUSE_MS.max);
    }
  }
}
