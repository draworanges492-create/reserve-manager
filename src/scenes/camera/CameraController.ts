import Phaser from 'phaser';
import {
  CAMERA_EDGE_SCROLL_MARGIN,
  CAMERA_PAN_SPEED,
  CAMERA_PINCH_STEP,
  CAMERA_WHEEL_COOLDOWN_MS,
  CAMERA_WHEEL_STEP,
  CAMERA_ZOOM_STEPS,
} from '../../config/game';
import { getSettings } from '../../core/Settings';
import {
  type Bounds,
  centredBounds,
  nearestLevel,
  nextZoomIndex,
  scrollToKeepPoint,
  zoomLevels,
} from './cameraMath';
import { viewScale } from '../../ui/view';

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Camera input (spec §5 + DECISIONS D4): drag-pan with mouse or one finger, WASD/arrows,
 * edge scroll (mouse only), wheel/trackpad zoom and two-finger pinch zoom, in integer-friendly
 * steps. The camera is clamped to the unlocked zones plus a small margin, and zooms out
 * as far as a view of the whole area (DECISIONS D44, D108).
 */
export class CameraController {
  /** Zoom in game pixels per world pixel; the camera's zoom is this × viewScale(). */
  private zoomStep = 1;
  private wheelAccum = 0;
  private lastWheelStep = 0;
  private pinchStartDistance: number | null = null;
  private pointerInside = false;
  private dragging = false;
  private readonly keys: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private bounds: Bounds;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Area the camera may show, in world pixels. */
    bounds: Bounds,
    private readonly onChange: () => void,
    /** True when the pointer is over a HUD element; those clicks must not move the map. */
    private readonly isOverUI: (pointer: Phaser.Input.Pointer) => boolean,
    /** True over world objects where a press is an action, not a drag (e.g. pumping a waterhole). */
    private readonly isOverInteractive: (pointer: Phaser.Input.Pointer) => boolean = () => false,
  ) {
    this.bounds = bounds;
    const cam = scene.cameras.main;
    cam.setRoundPixels(true);
    this.setBounds(bounds);
    // A different window size changes which zoom fits the whole area.
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this),
    );

    const input = scene.input;
    const kb = input.keyboard;
    const keys = (...codes: string[]): Phaser.Input.Keyboard.Key[] =>
      kb ? codes.map((code) => kb.addKey(code)) : [];
    this.keys = {
      up: keys('W', 'UP'),
      down: keys('S', 'DOWN'),
      left: keys('A', 'LEFT'),
      right: keys('D', 'RIGHT'),
    };

    input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (p: Phaser.Input.Pointer) =>
        (this.dragging = !this.isOverUI(p) && !this.isOverInteractive(p)),
    );
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel, this);
    input.on(Phaser.Input.Events.GAME_OVER, () => (this.pointerInside = true));
    input.on(Phaser.Input.Events.GAME_OUT, () => (this.pointerInside = false));
  }

  update(deltaMs: number): void {
    const cam = this.scene.cameras.main;
    const held = (dir: Direction): boolean => this.keys[dir].some((k) => k.isDown);
    let dx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    let dy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);

    const p = this.scene.input.activePointer;
    const edgeScroll = getSettings().edgeScroll;
    if (edgeScroll && this.pointerInside && !p.wasTouch && !p.isDown && !this.isOverUI(p)) {
      const m = CAMERA_EDGE_SCROLL_MARGIN * viewScale();
      if (p.x < m) dx = -1;
      else if (p.x > cam.width - m) dx = 1;
      if (p.y < m) dy = -1;
      else if (p.y > cam.height - m) dy = 1;
    }

    if (dx === 0 && dy === 0) return;
    const distance = (CAMERA_PAN_SPEED * viewScale() * deltaMs) / 1000 / cam.zoom;
    cam.setScroll(cam.scrollX + dx * distance, cam.scrollY + dy * distance);
    this.onChange();
  }

  /** Change the area the camera may show (e.g. when a zone unlocks). */
  setBounds(bounds: Bounds): void {
    this.bounds = bounds;
    this.applyZoom();
  }

  /** True at the closest zoom level. */
  isFullyZoomedIn(): boolean {
    const levels = this.levels();
    return this.zoomStep >= (levels[levels.length - 1] ?? Infinity);
  }

  /** Zoom levels in game pixels per world pixel: fit-everything first (DECISIONS D108). */
  private levels(): number[] {
    const cam = this.scene.cameras.main;
    return zoomLevels(
      CAMERA_ZOOM_STEPS,
      cam.width / viewScale(),
      cam.height / viewScale(),
      this.bounds,
    );
  }

  /** Re-apply the zoom (after a resize or new bounds), keeping the closest available level. */
  private applyZoom(): void {
    const levels = this.levels();
    const level = levels[nearestLevel(levels, this.zoomStep)] ?? 1;
    this.zoomStep = level;
    this.setCameraZoom(level);
    this.onChange();
  }

  /** Set the camera zoom (device px per world px) and re-centre the bounds for that view. */
  private setCameraZoom(level: number): void {
    const cam = this.scene.cameras.main;
    const zoom = level * viewScale();
    const b = centredBounds(this.bounds, cam.width / zoom, cam.height / zoom);
    cam.setZoom(zoom).setBounds(b.x, b.y, b.w, b.h);
  }

  private stepZoom(direction: 1 | -1, screenX: number, screenY: number): void {
    const levels = this.levels();
    const current = nearestLevel(levels, this.zoomStep);
    const next = nextZoomIndex(current, direction, levels.length);
    const level = levels[next];
    if (next === current || level === undefined) return;
    const cam = this.scene.cameras.main;
    const oldZoom = cam.zoom;
    this.zoomStep = level;
    const newZoom = level * viewScale();
    const scrollX = scrollToKeepPoint(cam.scrollX, cam.width, screenX, oldZoom, newZoom);
    const scrollY = scrollToKeepPoint(cam.scrollY, cam.height, screenY, oldZoom, newZoom);
    this.setCameraZoom(level);
    cam.setScroll(scrollX, scrollY);
    this.onChange();
  }

  /** Current zoom level in game pixels per world pixel (1 = normal). */
  get level(): number {
    return this.zoomStep;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const { pointer1, pointer2 } = this.scene.input;
    if (pointer1.isDown && pointer2.isDown) {
      this.handlePinch(pointer1, pointer2);
      return;
    }
    if (!pointer.isDown || !this.dragging || this.pinchStartDistance !== null) return;
    const cam = this.scene.cameras.main;
    cam.setScroll(
      cam.scrollX - (pointer.x - pointer.prevPosition.x) / cam.zoom,
      cam.scrollY - (pointer.y - pointer.prevPosition.y) / cam.zoom,
    );
    this.onChange();
  }

  private onPointerUp(): void {
    const { pointer1, pointer2 } = this.scene.input;
    if (!pointer1.isDown && !pointer2.isDown) this.pinchStartDistance = null;
    if (!this.scene.input.activePointer.isDown) this.dragging = false;
  }

  private handlePinch(a: Phaser.Input.Pointer, b: Phaser.Input.Pointer): void {
    const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    if (this.pinchStartDistance === null) {
      this.pinchStartDistance = distance;
      return;
    }
    const ratio = distance / this.pinchStartDistance;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    if (ratio > CAMERA_PINCH_STEP) {
      this.stepZoom(1, midX, midY);
      this.pinchStartDistance = distance;
    } else if (ratio < 1 / CAMERA_PINCH_STEP) {
      this.stepZoom(-1, midX, midY);
      this.pinchStartDistance = distance;
    }
  }

  private onWheel(pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void {
    if (this.isOverUI(pointer)) return;
    const now = this.scene.time.now;
    if (now - this.lastWheelStep < CAMERA_WHEEL_COOLDOWN_MS) {
      this.wheelAccum = 0; // swallow trackpad momentum right after a step
      return;
    }
    this.wheelAccum += dy;
    if (Math.abs(this.wheelAccum) < CAMERA_WHEEL_STEP) return;
    this.stepZoom(this.wheelAccum < 0 ? 1 : -1, pointer.x, pointer.y);
    this.wheelAccum = 0;
    this.lastWheelStep = now;
  }
}
