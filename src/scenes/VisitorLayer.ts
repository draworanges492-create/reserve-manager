import Phaser from 'phaser';
import { WORLD_ART } from '../config/game';
import type { GameSession } from '../core/GameSession';
import { DEPTH } from './depth';

/** Visitors walk in through the main gate (tiles). */
const GATE = { x: 56.5, y: 79.5 };
const ROAD_X = 56.5;
const MAX_WALKERS = 6;
/** One walker on the map per this many visitors yesterday. */
const VISITORS_PER_WALKER = 3;
const SPEED_PX_PER_S = 9;
const FRAME_MS = 260;

interface Walker {
  sprite: Phaser.GameObjects.Sprite;
  path: { x: number; y: number }[];
  next: number;
  waitMs: number;
  frameMs: number;
  returning: boolean;
}

/**
 * Cosmetic tourists (spec §6.6 "visitors appear as small sprites walking the road to
 * towers"): they walk from the gate up the main road to a finished tower, look around for
 * a while, and walk back out. Their number follows yesterday's visitors.
 */
export class VisitorLayer {
  private walkers: Walker[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
    private readonly tileSize: number,
  ) {}

  private towers(): { x: number; y: number }[] {
    return Object.values(this.session.state.slots)
      .filter((s) => s.building?.buildingId === 'observation_tower' && s.building.daysLeft === 0)
      .map((s) => ({ x: s.rect.x + s.rect.w / 2, y: s.rect.y + s.rect.h + 0.4 }));
  }

  private spawn(tower: { x: number; y: number }): void {
    const ts = this.tileSize;
    const jitter = (Math.random() - 0.5) * 0.6;
    const path = [
      GATE,
      { x: ROAD_X + jitter, y: tower.y },
      { x: tower.x + jitter, y: tower.y },
    ].map((p) => ({ x: p.x * ts, y: p.y * ts }));
    const start = path[0] ?? { x: 0, y: 0 };
    const sprite = this.scene.add
      .sprite(start.x, start.y, 'visitor', 0)
      .setOrigin(0.5, 1)
      .setScale(WORLD_ART);
    this.walkers.push({
      sprite,
      path,
      next: 1,
      waitMs: Math.random() * 4000,
      frameMs: 0,
      returning: false,
    });
  }

  update(deltaMs: number): void {
    const { clock, tourism } = this.session.state;
    const towers = this.towers();
    const wanted = towers.length
      ? Math.min(MAX_WALKERS, Math.ceil(tourism.lastVisitors / VISITORS_PER_WALKER))
      : 0;
    if (this.walkers.length < wanted) {
      const tower = towers[this.walkers.length % towers.length];
      if (tower) this.spawn(tower);
    }
    const scaled = clock.paused ? 0 : deltaMs * clock.speed;
    for (const w of this.walkers) this.step(w, scaled);
    // Walkers who made it back to the gate leave; extras leave if visitors dropped.
    this.walkers = this.walkers.filter((w, i) => {
      const gone = (w.returning && w.next < 0) || i >= wanted + 2;
      if (gone) w.sprite.destroy();
      return !gone;
    });
  }

  private step(w: Walker, ms: number): void {
    if (w.waitMs > 0) {
      w.waitMs -= ms;
      w.sprite.setFrame(0);
      return;
    }
    const target = w.path[w.next];
    if (!target) return;
    const dx = target.x - w.sprite.x;
    const dy = target.y - w.sprite.y;
    const dist = Math.hypot(dx, dy);
    const stepPx = (SPEED_PX_PER_S * ms) / 1000;
    if (dist <= stepPx) {
      w.sprite.setPosition(target.x, target.y);
      if (!w.returning && w.next === w.path.length - 1) {
        w.returning = true;
        w.waitMs = 4000 + Math.random() * 6000; // enjoying the view
      }
      w.next += w.returning ? -1 : 1;
    } else {
      w.sprite.setPosition(w.sprite.x + (dx / dist) * stepPx, w.sprite.y + (dy / dist) * stepPx);
      if (Math.abs(dx) > 0.01) w.sprite.setFlipX(dx < 0);
      w.frameMs += ms;
      if (w.frameMs > FRAME_MS) {
        w.frameMs = 0;
        w.sprite.setFrame(String(w.sprite.frame.name) === '0' ? 1 : 0);
      }
    }
    w.sprite.setDepth(DEPTH.actors + w.sprite.y / 10000);
  }
}
