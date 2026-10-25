import type Phaser from 'phaser';
import { crispText } from './crispText';
import { TEXT_SIZE, UI } from './theme';
import { viewHeight, viewWidth } from './view';

const OFFSET = 10;
const PAD = 5;
/** Longer lines wrap, so a tooltip never runs off a small screen. */
const MAX_TEXT_W = 240;

/** Pointer-following tooltip with several lines; stays inside the screen. */
export class Tooltip {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private lastText = '';

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add
      .rectangle(0, 0, 1, 1, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border);
    this.text = crispText(scene, 0, 0, '', {
      fontSize: TEXT_SIZE.body,
      lineSpacing: 1,
      wordWrap: { width: Math.min(MAX_TEXT_W, viewWidth(scene) - PAD * 2 - 4) },
    });
    this.hide();
  }

  show(lines: string[], pointerX: number, pointerY: number): void {
    const joined = lines.join('\n');
    if (joined !== this.lastText) {
      this.lastText = joined;
      this.text.setText(joined);
    }
    const w = this.text.width + PAD * 2;
    const h = this.text.height + PAD * 2;
    // Below-right of the pointer; flipped above-left when that would leave the screen.
    const vw = viewWidth(this.scene);
    const vh = viewHeight(this.scene);
    const fitsRight = pointerX + OFFSET + w <= vw - 2;
    const fitsBelow = pointerY + OFFSET + h <= vh - 2;
    const x = Math.max(
      2,
      fitsRight ? pointerX + OFFSET : Math.min(pointerX - OFFSET - w, vw - w - 2),
    );
    const y = Math.max(
      2,
      fitsBelow ? pointerY + OFFSET : Math.min(pointerY - OFFSET - h, vh - h - 2),
    );
    this.bg.setPosition(Math.round(x), Math.round(y)).setSize(w, h).setVisible(true);
    this.text.setPosition(Math.round(x + PAD), Math.round(y + PAD)).setVisible(true);
  }

  hide(): void {
    this.bg.setVisible(false);
    this.text.setVisible(false);
  }
}
