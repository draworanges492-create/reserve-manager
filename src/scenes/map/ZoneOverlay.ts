import Phaser from 'phaser';
import { BALANCE } from '../../config/balance';
import { DEPTH } from '../depth';
import type { ZoneArea } from './mapObjects';

const LOCK_TINT = 0x0d120c;
/** Heavy fog: a locked zone inside the camera's rectangle should read as off-limits. */
const LOCK_ALPHA = 0.8;
const HOVER_COLOR = 0xe8d9a8;
/** Brown wash over overgrazed zones (spec §6.2: "visual brown overlay"). */
const DEGRADED_TINT = 0x7a4a1e;
const DEGRADED_ALPHA = 0.3;

/**
 * Zone-level drawing: locked-zone fog, degraded-grass wash (spec §5, §6.2) and outlines
 * for the hovered and selected zone. Fences are drawn by FenceLayer.
 */
export class ZoneOverlay {
  private readonly hover: Phaser.GameObjects.Graphics;
  private readonly degraded: Phaser.GameObjects.Graphics;
  private readonly dim: Phaser.GameObjects.Graphics;
  private hovered: ZoneArea | null = null;
  private selected: ZoneArea | null = null;
  private zoom = 1;

  constructor(
    scene: Phaser.Scene,
    _map: Phaser.Tilemaps.Tilemap,
    private readonly zones: ZoneArea[],
    isUnlocked: (zoneId: string) => boolean,
  ) {
    this.dim = scene.add.graphics().setDepth(DEPTH.zoneDim);
    this.refreshLocks(isUnlocked);

    this.hover = scene.add.graphics().setDepth(DEPTH.hover);
    // On the ground, under waterholes and animals.
    this.degraded = scene.add.graphics().setDepth(DEPTH.objects + 0.5);
  }

  /** Redraw the fog over locked zones (after an unlock). */
  refreshLocks(isUnlocked: (zoneId: string) => boolean): void {
    this.dim.clear().fillStyle(LOCK_TINT, LOCK_ALPHA);
    for (const zone of this.zones) if (!isUnlocked(zone.id)) this.dim.fillRectShape(zone.rect);
  }

  setHover(zone: ZoneArea | null, cameraZoom: number): void {
    this.hovered = zone;
    this.zoom = cameraZoom;
    this.drawOutlines();
  }

  setSelected(zone: ZoneArea | null): void {
    this.selected = zone;
    this.drawOutlines();
  }

  /** Redraw the brown wash for zones whose vegetation is below the degraded line. */
  refreshDegraded(vegetationOf: (zoneId: string) => number): void {
    this.degraded.clear().fillStyle(DEGRADED_TINT, DEGRADED_ALPHA);
    for (const zone of this.zones) {
      if (vegetationOf(zone.id) < BALANCE.vegetation.degradedBelow)
        this.degraded.fillRectShape(zone.rect);
    }
  }

  private drawOutlines(): void {
    // Keep outlines a constant on-screen width at every zoom level.
    const px = Math.max(1, 1 / this.zoom);
    this.hover.clear();
    if (this.hovered && this.hovered !== this.selected) {
      this.hover.lineStyle(px, HOVER_COLOR, 0.6).strokeRectShape(this.hovered.rect);
    }
    if (this.selected)
      this.hover.lineStyle(px * 2, HOVER_COLOR, 1).strokeRectShape(this.selected.rect);
  }
}
