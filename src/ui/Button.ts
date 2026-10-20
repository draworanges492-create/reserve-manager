import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { crispText } from './crispText';
import { clearHoverTip, setHoverTip } from './hoverTip';
import { TEXT_SIZE, UI } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label?: string;
  icon?: string;
  onClick: () => void;
  /** Tooltip lines while hovered (spec §7.4: tooltips everywhere). */
  tooltip?: () => string[];
}

const ICON_GAP = 3;

/** Small HUD button: icon and/or text, with hover, selected and disabled states. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private selected = false;
  private hovered = false;
  private enabled = true;

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
    const icon = opts.icon ? scene.add.image(0, cy, opts.icon) : null;
    const label = opts.label
      ? crispText(scene, 0, cy, opts.label, { fontSize: TEXT_SIZE.small }).setOrigin(0, 0.5)
      : null;
    // Centre icon + label together.
    const total = (icon?.width ?? 0) + (icon && label ? ICON_GAP : 0) + (label?.width ?? 0);
    let x0 = cx - total / 2;
    if (icon) {
      icon.setX(Math.round(x0 + icon.width / 2));
      x0 += icon.width + (label ? ICON_GAP : 0);
      this.add(icon);
    }
    if (label) this.add(label.setX(Math.round(x0)));

    const tip = opts.tooltip;
    this.bg.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.setHovered(true);
      if (tip) setHoverTip(tip);
    });
    this.bg.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.setHovered(false);
      if (tip) clearHoverTip(tip);
    });
    if (tip) this.once(Phaser.GameObjects.Events.DESTROY, () => clearHoverTip(tip));
    this.bg.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.enabled) return;
      audio.sfx('click');
      opts.onClick();
    });
    scene.add.existing(this);
  }

  setSelected(selected: boolean): this {
    if (selected !== this.selected) {
      this.selected = selected;
      this.refresh();
    }
    return this;
  }

  setEnabled(enabled: boolean): this {
    if (enabled !== this.enabled) {
      this.enabled = enabled;
      this.setAlpha(enabled ? 1 : 0.45);
      this.refresh();
    }
    return this;
  }

  private setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.refresh();
  }

  private refresh(): void {
    const hover = this.hovered && this.enabled;
    this.bg.setFillStyle(this.selected ? UI.selected : hover ? UI.hover : UI.panel);
  }
}
