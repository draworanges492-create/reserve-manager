import Phaser from 'phaser';
import {
  CAMERA_DEFAULT_ZOOM_INDEX,
  CAMERA_EDGE_SCROLL_MARGIN,
  CAMERA_PAN_SPEED,
  CAMERA_PINCH_STEP,
  CAMERA_WHEEL_COOLDOWN_MS,
  CAMERA_WHEEL_STEP,
  CAMERA_ZOOM_STEPS,
} from '../../config/game';
import { nextZoomIndex, scrollToKeepPoint } from './cameraMath';

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Camera input (spec §5 + DECISIONS D4): drag-pan with mouse or one finger, WASD/arrows,
 * edge scroll (mouse only), wheel/trackpad zoom and two-finger pinch zoom, in integer-friendly
 * steps, clamped to the map.
 */
export class CameraController {
  private zoomIndex = CAMERA_DEFAULT_ZOOM_INDEX;
  private wheelAccum = 0;
  private lastWheelStep = 0;
  private pinchStartDistance: number | null = null;
  private pointerInside = false;
  private dragging = false;
  private readonly keys: Record<Direction, Phaser.Input.Keyboard.Key[]>;

  constructor(
    private readonly scene: Phaser.Scene,
    worldWidth: number,
    worldHeight: number,
    private readonly onChange: () => void,
    /** True when the pointer is over a HUD element; those clicks must not move the map. */
    private readonly isOverUI: (pointer: Phaser.Input.Pointer) => boolean,
  ) {
    const cam = scene.cameras.main;
    cam.setBounds(0, 0, worldWidth, worldHeight);
    cam.setZoom(this.zoom());
    cam.setRoundPixels(true);

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
      (p: Phaser.Input.Pointer) => (this.dragging = !this.isOverUI(p)),
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
    if (this.pointerInside && !p.wasTouch && !p.isDown && !this.isOverUI(p)) {
      const m = CAMERA_EDGE_SCROLL_MARGIN;
      if (p.x < m) dx = -1;
      else if (p.x > cam.width - m) dx = 1;
      if (p.y < m) dy = -1;
      else if (p.y > cam.height - m) dy = 1;
    }

    if (dx === 0 && dy === 0) return;
    const distance = (CAMERA_PAN_SPEED * deltaMs) / 1000 / cam.zoom;
    cam.setScroll(cam.scrollX + dx * distance, cam.scrollY + dy * distance);
    this.onChange();
  }

  private zoom(): number {
    return CAMERA_ZOOM_STEPS[this.zoomIndex] ?? 1;
  }

  private stepZoom(direction: 1 | -1, screenX: number, screenY: number): void {
    const next = nextZoomIndex(this.zoomIndex, direction, CAMERA_ZOOM_STEPS.length);
    if (next === this.zoomIndex) return;
    const cam = this.scene.cameras.main;
    const oldZoom = this.zoom();
    this.zoomIndex = next;
    const newZoom = this.zoom();
    const scrollX = scrollToKeepPoint(cam.scrollX, cam.width, screenX, oldZoom, newZoom);
    const scrollY = scrollToKeepPoint(cam.scrollY, cam.height, screenY, oldZoom, newZoom);
    cam.setZoom(newZoom);
    cam.setScroll(scrollX, scrollY);
    this.onChange();
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
