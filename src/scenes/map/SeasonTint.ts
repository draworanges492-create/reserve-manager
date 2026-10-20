import Phaser from 'phaser';
import { BALANCE, type Season } from '../../config/balance';

const FADE_STEPS = 10;

const tintOf = (season: Season): Phaser.Display.Color =>
  Phaser.Display.Color.HexStringToColor(BALANCE.render.seasonTint[season]);

/**
 * Seasons change the terrain's colour (warm and dusty when dry, greener when wet).
 * Only the land is tinted (tile layers and trees), so animals keep their colours (D13).
 */
export class SeasonTint {
  private current: Phaser.Display.Color;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layers: { setTint(color: number): unknown }[],
    season: Season,
  ) {
    this.current = tintOf(season);
    this.apply(this.current);
  }

  fadeTo(season: Season): void {
    const from = this.current;
    const to = tintOf(season);
    this.current = to;
    let lastStep = -1;
    // Re-tinting ~38k tiles each frame is wasteful, so the fade moves in a few steps.
    this.scene.tweens.addCounter({
      from: 0,
      to: FADE_STEPS,
      duration: BALANCE.render.seasonTintFadeMs,
      onUpdate: (tween) => {
        const step = Math.round(tween.getValue() ?? 0);
        if (step === lastStep) return;
        lastStep = step;
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, FADE_STEPS, step);
        this.apply(new Phaser.Display.Color(c.r, c.g, c.b));
      },
    });
  }

  private apply(color: Phaser.Display.Color): void {
    for (const layer of this.layers) layer.setTint(color.color);
  }
}
