import Phaser from 'phaser';
import { BALANCE } from '../../config/balance';
import { fenceRepairable } from '../../core/buildCommands';
import { eventBus } from '../../core/EventBus';
import type { FenceStatus } from '../../core/GameState';
import type { GameSession } from '../../core/GameSession';
import { DEPTH } from '../depth';
import { objectProp, objectsIn } from './mapObjects';

const WOOD = 0x6a4a32;
const POST = 0x4a3222;
const MENDING = 0xe8b23a;
/** Broken fences you can mend now that would open a new zone: make them easy to spot. */
const OPENS_ZONE = 0xf0b46a;
const DASH = 8;
const GAP = 5;
const POST_SPACING = 24;
/** Half-thickness of the clickable strip along a fence, in px. */
const HIT = 6;

interface Segment {
  id: string;
  from: Phaser.Math.Vector2;
  to: Phaser.Math.Vector2;
  hit: Phaser.GameObjects.Rectangle;
}

/**
 * Fences (spec §5, §7.1): drawn by state — broken (dashed), being mended (dashed gold),
 * sound (solid). Broken fences you can reach are clickable to mend.
 */
export class FenceLayer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly segments: Segment[] = [];
  private signature = '';

  constructor(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    private readonly session: GameSession,
  ) {
    this.graphics = scene.add.graphics().setDepth(DEPTH.fences);
    for (const obj of objectsIn(map, 'fence_segments')) {
      const [a, b] = obj.polyline ?? [];
      if (!a || !b) continue;
      const id = String(objectProp(obj, 'segmentId'));
      const from = new Phaser.Math.Vector2((obj.x ?? 0) + a.x, (obj.y ?? 0) + a.y);
      const to = new Phaser.Math.Vector2((obj.x ?? 0) + b.x, (obj.y ?? 0) + b.y);
      const hit = scene.add
        .rectangle(
          Math.min(from.x, to.x) - HIT,
          Math.min(from.y, to.y) - HIT,
          Math.abs(to.x - from.x) + HIT * 2,
          Math.abs(to.y - from.y) + HIT * 2,
          0xffffff,
          0,
        )
        .setOrigin(0)
        .setDepth(DEPTH.fences);
      hit.on(Phaser.Input.Events.POINTER_OVER, () =>
        eventBus.emit('fenceHover', { segmentId: id }),
      );
      hit.on(Phaser.Input.Events.POINTER_OUT, () =>
        eventBus.emit('fenceHover', { segmentId: null }),
      );
      hit.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
        if (p.getDistance() > BALANCE.render.animals.clickMaxMovePx) return;
        const result = this.session.dispatch({ type: 'repairFence', segmentId: id });
        if (!result.ok) {
          const world = p.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;
          eventBus.emit('commandFailed', {
            reason: result.reason,
            worldX: world.x,
            worldY: world.y - 8,
          });
        }
      });
      this.segments.push({ id, from, to, hit });
    }
    this.update();
  }

  update(): void {
    const state = this.session.state;
    const signature = this.segments
      .map((s) => `${state.fences[s.id]?.status}${fenceRepairable(state, s.id) ? '!' : ''}`)
      .join(',');
    if (signature === this.signature) return;
    this.signature = signature;
    this.graphics.clear();
    for (const s of this.segments) {
      const fence = state.fences[s.id];
      const repairable = fenceRepairable(state, s.id);
      // Only broken fences you can mend take clicks (so they don't block herd clicks elsewhere).
      if (repairable) s.hit.setInteractive({ useHandCursor: true });
      else s.hit.disableInteractive();
      const opensZone = repairable && !state.zones[fence?.zoneId ?? '']?.unlocked;
      this.draw(s, fence?.status ?? 'broken', opensZone);
    }
  }

  private draw(s: Segment, status: FenceStatus, opensZone: boolean): void {
    const g = this.graphics;
    const length = s.from.distance(s.to);
    const dir = s.to.clone().subtract(s.from).normalize();
    if (status === 'intact') {
      g.lineStyle(2, WOOD, 1).lineBetween(s.from.x, s.from.y, s.to.x, s.to.y);
    } else {
      const color = status === 'repairing' ? MENDING : opensZone ? OPENS_ZONE : WOOD;
      g.lineStyle(opensZone ? 3 : 2, color, 1);
      for (let d = 0; d < length; d += DASH + GAP) {
        const a = s.from.clone().add(dir.clone().scale(d));
        const b = s.from.clone().add(dir.clone().scale(Math.min(length, d + DASH)));
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    g.fillStyle(POST, 1);
    for (let d = 0; d <= length; d += POST_SPACING) {
      const p = s.from.clone().add(dir.clone().scale(d));
      g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
  }
}
