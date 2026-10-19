import Phaser from 'phaser';
import { TEXT_SIZE, UI } from './theme';

/**
 * Alegreya (SIL OFL 1.1, bundled via @fontsource): a bookish serif with an expedition-
 * journal feel that stays readable at small sizes (DECISIONS D45). Swap it here.
 */
export const UI_FONT = 'Alegreya, Georgia, serif';
export const UI_TEXT_COLOR = UI.text;

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
    fontSize: TEXT_SIZE.body,
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

/** Soft dark shadow so text stays readable when drawn straight over the map. */
export function withShadow(text: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  return text.setShadow(1, 1, UI.shadow, 2, false, true);
}
