// The canvas is drawn at the screen's real resolution (device pixels), and every camera is
// zoomed by a whole number so pixel art stays square while text gets full detail
// (DECISIONS D102). Layout code works in game pixels: use these helpers, not scale.width.
import Phaser from 'phaser';

let scale = 1;

/** Device pixels per game pixel (integer zoom × devicePixelRatio, rounded). */
export function viewScale(): number {
  return scale;
}

/** main.ts only: set before resizing the game, so RESIZE listeners see the new value. */
export function setViewScale(value: number): void {
  scale = value;
}

/** Visible width in game pixels. */
export function viewWidth(scene: Phaser.Scene): number {
  return scene.scale.width / scale;
}

/** Visible height in game pixels. */
export function viewHeight(scene: Phaser.Scene): number {
  return scene.scale.height / scale;
}

/** A pointer's screen position in game pixels (for HUD hit tests and tooltips). */
export function pointerInView(pointer: { x: number; y: number }): { x: number; y: number } {
  return { x: pointer.x / scale, y: pointer.y / scale };
}

/** Make a screen-space scene (HUD, menus, dialogue) lay out in game pixels. */
export function fitUiCamera(scene: Phaser.Scene): void {
  const fit = (): void => {
    scene.cameras.main.setOrigin(0, 0).setZoom(scale);
  };
  fit();
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    scene.scale.off(Phaser.Scale.Events.RESIZE, fit),
  );
}
