import Phaser from 'phaser';
import { BALANCE } from '../../config/balance';
import { DEPTH } from '../depth';
import { objectsIn, type ZoneArea } from './mapObjects';

const FENCE_COLOR = 0x6a4a32;
const POST_COLOR = 0x4a3222;
const LOCK_TINT = 0x0d120c;
/** Heavy fog: a locked zone inside the camera's rectangle should read as off-limits. */
const LOCK_ALPHA = 0.8;
const HOVER_COLOR = 0xe8d9a8;
/** Brown wash over overgrazed zones (spec §6.2: "visual brown overlay"). */
const DEGRADED_TINT = 0x7a4a1e;
const DEGRADED_ALPHA = 0.3;
const DASH = 8;
const GAP = 5;
const POST_SPACING = 24;

/**
 * Zone-level drawing: locked-zone fog, run-down fences, degraded-grass wash (spec §5, §6.2)
 * and outlines for the hovered and selected zone.
 */
export class ZoneOverlay {
  private readonly hover: Phaser.GameObjects.Graphics;
  private readonly degraded: Phaser.GameObjects.Graphics;
  private hovered: ZoneArea | null = null;
  private selected: ZoneArea | null = null;
  private zoom = 1;

  constructor(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    private readonly zones: ZoneArea[],
    isUnlocked: (zoneId: string) => boolean,
  ) {
    const dim = scene.add.graphics().setDepth(DEPTH.zoneDim);
    dim.fillStyle(LOCK_TINT, LOCK_ALPHA);
    for (const zone of zones) if (!isUnlocked(zone.id)) dim.fillRectShape(zone.rect);

    const fences = scene.add.graphics().setDepth(DEPTH.fences);
    for (const segment of objectsIn(map, 'fence_segments')) {
      const points = (segment.polyline ?? []).map(
        (p) => new Phaser.Math.Vector2((segment.x ?? 0) + p.x, (segment.y ?? 0) + p.y),
      );
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (a && b) drawBrokenFence(fences, a, b);
      }
    }

    this.hover = scene.add.graphics().setDepth(DEPTH.hover);
    // On the ground, under waterholes and animals.
    this.degraded = scene.add.graphics().setDepth(DEPTH.objects + 0.5);
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

/** Dashed line with posts: the fences start run-down (Chapter 1 repairs them). */
function drawBrokenFence(
  g: Phaser.GameObjects.Graphics,
  a: Phaser.Math.Vector2,
  b: Phaser.Math.Vector2,
): void {
  const length = a.distance(b);
  const dir = b.clone().subtract(a).normalize();
  g.lineStyle(2, FENCE_COLOR, 1);
  for (let d = 0; d < length; d += DASH + GAP) {
    const start = a.clone().add(dir.clone().scale(d));
    const end = a.clone().add(dir.clone().scale(Math.min(length, d + DASH)));
    g.lineBetween(start.x, start.y, end.x, end.y);
  }
  g.fillStyle(POST_COLOR, 1);
  for (let d = 0; d <= length; d += POST_SPACING) {
    const p = a.clone().add(dir.clone().scale(d));
    g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
}
