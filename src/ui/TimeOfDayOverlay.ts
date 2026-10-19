import Phaser from 'phaser';
import { BALANCE, type TimeOfDayKey } from '../config/balance';

const KEYS: TimeOfDayKey[] = BALANCE.render.timeOfDay;

/** Cosmetic dawn/day/dusk/night wash over the world (spec §4). Never affects the sim. */
export class TimeOfDayOverlay {
  private readonly rect: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    this.rect = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0).setOrigin(0).setDepth(-1);
  }

  update(dayProgress: number, enabled = true): void {
    this.rect.setVisible(enabled);
    if (!enabled) return;
    this.rect.setSize(this.scene.scale.width, this.scene.scale.height);
    const next = KEYS.findIndex((k) => k.at > dayProgress);
    const b = KEYS[next === -1 ? KEYS.length - 1 : next];
    const a = KEYS[Math.max(0, (next === -1 ? KEYS.length : next) - 1)];
    if (!a || !b) return;
    const span = b.at - a.at;
    const f = span > 0 ? (dayProgress - a.at) / span : 0;
    const from = Phaser.Display.Color.HexStringToColor(a.color);
    const to = Phaser.Display.Color.HexStringToColor(b.color);
    const mix = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, f * 100);
    this.rect.setFillStyle(
      Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b),
      a.alpha + (b.alpha - a.alpha) * f,
    );
  }
}
