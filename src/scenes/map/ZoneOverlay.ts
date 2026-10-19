import Phaser from 'phaser';
import { DEPTH } from '../depth';
import { objectsIn, type ZoneArea } from './mapObjects';

const FENCE_COLOR = 0x6a4a32;
const POST_COLOR = 0x4a3222;
const LOCK_TINT = 0x0d120c;
/** Heavy fog: a locked zone inside the camera's rectangle should read as off-limits. */
const LOCK_ALPHA = 0.8;
const HOVER_COLOR = 0xe8d9a8;
const DASH = 8;
const GAP = 5;
const POST_SPACING = 24;

/** Locked-zone dimming, run-down fence lines and the hovered-zone outline (spec §5). */
export class ZoneOverlay {
  private readonly hover: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    zones: ZoneArea[],
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
  }

  setHover(zone: ZoneArea | null, cameraZoom: number): void {
    this.hover.clear();
    if (!zone) return;
    // Keep the outline ~1 screen game-pixel wide at every zoom level.
    this.hover.lineStyle(Math.max(1, 1 / cameraZoom), HOVER_COLOR, 0.9);
    this.hover.strokeRectShape(zone.rect);
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
