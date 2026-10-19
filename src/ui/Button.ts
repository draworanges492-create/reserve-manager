import Phaser from 'phaser';
import { crispText } from './crispText';
import { UI } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label?: string;
  icon?: string;
  onClick: () => void;
}

/** Small HUD button: icon or text, hover and "selected" states. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private selected = false;
  private hovered = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    this.bg = scene.add
      .rectangle(0, 0, opts.width, opts.height, UI.panel)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border)
      .setInteractive({ useHandCursor: true });
    this.add(this.bg);
    const cx = opts.width / 2;
    const cy = opts.height / 2;
    if (opts.icon) this.add(scene.add.image(cx, cy, opts.icon));
    if (opts.label) this.add(crispText(scene, cx, cy, opts.label).setOrigin(0.5));

    this.bg.on(Phaser.Input.Events.POINTER_OVER, () => this.setHovered(true));
    this.bg.on(Phaser.Input.Events.POINTER_OUT, () => this.setHovered(false));
    this.bg.on(Phaser.Input.Events.POINTER_DOWN, () => opts.onClick());
    scene.add.existing(this);
  }

  setSelected(selected: boolean): this {
    if (selected !== this.selected) {
      this.selected = selected;
      this.refresh();
    }
    return this;
  }

  private setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.refresh();
  }

  private refresh(): void {
    this.bg.setFillStyle(this.selected ? UI.selected : this.hovered ? UI.hover : UI.panel);
  }
}
