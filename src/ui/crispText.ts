import Phaser from 'phaser';
import { TEXT_SIZE, UI } from './theme';
import { viewScale } from './view';

/**
 * Inter (SIL OFL 1.1, bundled via @fontsource): a plain, very legible sans-serif, chosen
 * after playtest feedback that the old serif was hard to read (DECISIONS D103). Swap it here.
 */
export const UI_FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

/** World text (e.g. floating messages) can be magnified by the map zoom, up to 3×. */
const WORLD_TEXT_OVERSAMPLE = 3;
export const UI_TEXT_COLOR = UI.text;

/**
 * Text drawn at device resolution. Game pixels are several device pixels wide, so text
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
    // A stopped scene can leave a destroyed label behind; touching its canvas would throw.
    if (!label.scene || !label.canvas) return;
    const world = scene.scene.key === 'GameScene';
    label.setResolution(viewScale() * (world ? WORLD_TEXT_OVERSAMPLE : 1));
    // Smooth sampling: the game's pixel-art mode would otherwise give text jagged edges.
    label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  };
  sync();
  // The scale manager is game-wide, so the listener must go when the label or its scene does.
  const off = (): void => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, sync);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, off);
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, sync);
  label.once(Phaser.GameObjects.Events.DESTROY, off);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  return label;
}

/** Soft dark shadow so text stays readable when drawn straight over the map. */
export function withShadow(text: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  return text.setShadow(1, 1, UI.shadow, 2, false, true);
}
