import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { buildingDef } from '../core/content';
import { eventBus } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { t } from '../core/text';
import { validSlotsFor } from '../ui/economyInfo';
import { dustPuff } from '../ui/fx';
import { DEPTH } from './depth';
import { WORLD_ART } from '../config/game';

const BAR_W = 36;
const BAR_H = 3;
const SPOT_COLOR = 0x8fdc6a;

interface SlotView {
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  /** Clickable outline shown in build mode. */
  spot: Phaser.GameObjects.Rectangle;
  shown: string | null;
}

/**
 * Buildings on their build slots (spec §7.2): scaffold + progress bar while under
 * construction, the finished sprite afterwards, and — in build mode — green highlights on
 * every spot where the chosen building can go.
 */
export class BuildingLayer {
  private readonly views = new Map<string, SlotView>();
  private placing: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
    tileSize: number,
    /** Map buildings layer: an old ruin on a build slot is hidden once something is built. */
    private readonly objects?: Phaser.Tilemaps.TilemapLayer,
  ) {
    for (const [slotId, slot] of Object.entries(session.state.slots)) {
      const r = slot.rect;
      const px = { x: r.x * tileSize, y: r.y * tileSize, w: r.w * tileSize, h: r.h * tileSize };
      const sprite = scene.add
        .image(px.x + px.w / 2, px.y + px.h, 'building-scaffold')
        .setOrigin(0.5, 1)
        .setScale(WORLD_ART)
        .setDepth(DEPTH.actors + (px.y + px.h) / 10000)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      const click = (pointer: Phaser.Input.Pointer): boolean =>
        pointer.getDistance() <= BALANCE.render.animals.clickMaxMovePx;
      sprite.on(Phaser.Input.Events.POINTER_OVER, () => eventBus.emit('slotHover', { slotId }));
      sprite.on(Phaser.Input.Events.POINTER_OUT, () =>
        eventBus.emit('slotHover', { slotId: null }),
      );
      sprite.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
        if (click(p) && !this.placing) eventBus.emit('slotSelected', { slotId });
      });

      const spot = scene.add
        .rectangle(px.x, px.y, px.w, px.h, SPOT_COLOR, 0.35)
        .setOrigin(0)
        .setStrokeStyle(1, SPOT_COLOR)
        .setDepth(DEPTH.hover)
        .setVisible(false);
      spot.on(Phaser.Input.Events.POINTER_OVER, () => spot.setFillStyle(SPOT_COLOR, 0.6));
      spot.on(Phaser.Input.Events.POINTER_OUT, () => spot.setFillStyle(SPOT_COLOR, 0.35));
      spot.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
        if (click(p)) this.place(slotId, spot);
      });

      const bar = scene.add.graphics().setDepth(DEPTH.floatingText);
      this.views.set(slotId, { sprite, bar, spot, shown: null });
    }

    const off = eventBus.on('buildModeChanged', ({ buildingId }) => {
      this.placing = buildingId;
      this.refreshSpots();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private showRuin(slotId: string, visible: boolean): void {
    const rect = this.session.state.slots[slotId]?.rect;
    if (!rect || !this.objects) return;
    this.objects.forEachTile(
      (tile) => tile.setVisible(visible),
      this,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
    );
  }

  update(): void {
    const { slots, clock } = this.session.state;
    for (const [slotId, view] of this.views) {
      const b = slots[slotId]?.building;
      const key = b ? (b.daysLeft > 0 ? 'building-scaffold' : `building-${b.buildingId}`) : null;
      if (key !== view.shown) {
        const finished =
          view.shown === 'building-scaffold' && key !== null && key !== 'building-scaffold';
        view.shown = key;
        view.sprite.setVisible(!!key);
        this.showRuin(slotId, !key);
        if (key) view.sprite.setTexture(key);
        if (finished) {
          // A little "ta-da": the building settles into place in a puff of dust.
          dustPuff(this.scene, view.sprite.x, view.sprite.y - 2, DEPTH.effects, 16);
          view.sprite.setScale(WORLD_ART, WORLD_ART * 0.8);
          this.scene.tweens.add({
            targets: view.sprite,
            scaleY: WORLD_ART,
            duration: 300,
            ease: 'Back.easeOut',
          });
        }
      }
      view.bar.clear();
      if (b && b.daysLeft > 0) {
        const total = buildingDef(b.buildingId)?.buildDays ?? 1;
        // Include today's progress so the bar moves smoothly between day ticks.
        const done = Math.min(1, (total - b.daysLeft + clock.dayProgress) / total);
        const x = view.sprite.x - BAR_W / 2;
        const y = view.sprite.y - view.sprite.height - 6;
        view.bar.fillStyle(0x241c16, 0.9).fillRect(x - 1, y - 1, BAR_W + 2, BAR_H + 2);
        view.bar.fillStyle(0xe8d9a8, 1).fillRect(x, y, BAR_W * done, BAR_H);
      }
    }
    if (this.placing) this.refreshSpots();
  }

  private refreshSpots(): void {
    const valid = new Set(this.placing ? validSlotsFor(this.session.state, this.placing) : []);
    for (const [slotId, view] of this.views) {
      const on = valid.has(slotId);
      if (on !== view.spot.visible) {
        view.spot.setVisible(on);
        if (on) view.spot.setInteractive({ useHandCursor: true });
        else view.spot.disableInteractive();
      }
    }
  }

  private place(slotId: string, spot: Phaser.GameObjects.Rectangle): void {
    if (!this.placing) return;
    const result = this.session.dispatch({ type: 'build', slotId, buildingId: this.placing });
    if (result.ok) {
      eventBus.emit('buildModeChanged', { buildingId: null });
    } else {
      eventBus.emit('commandFailed', {
        reason: result.reason,
        worldX: spot.x + spot.width / 2,
        worldY: spot.y,
      });
    }
  }
}

/** Banner text while placing a building. */
export function placingText(buildingId: string): string {
  return t('build.placing', { name: buildingDef(buildingId)?.name ?? buildingId });
}
