import type Phaser from 'phaser';
import { getSettings } from '../core/Settings';
import { crispText } from './crispText';
import { levelColor, levelOf, TEXT_SIZE, UI } from './theme';

const BAR_W = 26;
const BAR_H = 4;
const GAP = 3;

/**
 * Score meter for the top bar (spec §7.4): icon, coloured bar and value. In colourblind
 * mode it also shows an up / level / down status icon (spec §7.7).
 */
export class Meter {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly value: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Image;
  private x = 0;

  constructor(scene: Phaser.Scene, iconKey: string, y: number) {
    this.icon = scene.add.image(0, y, iconKey);
    this.track = scene.add.rectangle(0, y, BAR_W, BAR_H, UI.hover).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(0, y, 0, BAR_H, UI.accent).setOrigin(0, 0.5);
    this.value = crispText(scene, 0, y, '', { fontSize: TEXT_SIZE.small }).setOrigin(0, 0.5);
    this.status = scene.add.image(0, y, 'icon-level-good').setVisible(false);
  }

  /** Width the meter needs. */
  static readonly WIDTH = 12 + GAP + BAR_W + GAP + 16 + 8;

  setX(x: number): void {
    this.x = x;
    this.icon.setX(x + 6);
    this.track.setX(x + 12 + GAP);
    this.fill.setX(x + 12 + GAP);
    this.value.setX(x + 12 + GAP + BAR_W + GAP);
    this.status.setX(x + Meter.WIDTH - 4);
  }

  update(score: number): void {
    const level = levelOf(score);
    this.fill.width = (BAR_W * Math.max(0, Math.min(100, score))) / 100;
    this.fill.setFillStyle(levelColor(level));
    const text = `${Math.round(score)}`;
    if (this.value.text !== text) this.value.setText(text);
    const colorblind = getSettings().colorblind;
    this.status.setVisible(colorblind);
    if (colorblind) this.status.setTexture(`icon-level-${level}`);
  }

  contains(x: number, y: number, barHeight: number): boolean {
    return y <= barHeight && x >= this.x && x <= this.x + Meter.WIDTH;
  }
}
