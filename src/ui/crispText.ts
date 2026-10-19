import Phaser from 'phaser';

export const UI_FONT = 'ui-monospace, Menlo, Consolas, monospace';
export const UI_TEXT_COLOR = '#e8d9a8';

/**
 * Text drawn at device resolution. Game pixels are zoomed 2–3× on screen, so text
 * rasterised at game resolution would be blocky and hard to read.
 */
export function crispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  const label = scene.add.text(x, y, text, {
    fontFamily: UI_FONT,
    color: UI_TEXT_COLOR,
    fontSize: '8px',
    ...style,
  });
  const sync = (): void => {
    label.setResolution(scene.scale.zoom * window.devicePixelRatio);
  };
  sync();
  scene.scale.on(Phaser.Scale.Events.RESIZE, sync);
  label.once(Phaser.GameObjects.Events.DESTROY, () =>
    scene.scale.off(Phaser.Scale.Events.RESIZE, sync),
  );
  return label;
}
