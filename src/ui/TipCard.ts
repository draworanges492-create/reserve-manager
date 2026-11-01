import Phaser from 'phaser';
import { t } from '../core/text';
import { reduceMotion } from '../core/Settings';
import { Button } from './Button';
import { crispText } from './crispText';
import { TEXT_SIZE, UI } from './theme';
import type { Tip } from './tips';

const WIDTH = 260;
const PAD = 6;
const FACE = 30;
const BUTTON_H = 14;
/** A tip that nobody dismisses fades after this long. */
const SHOW_MS = 25_000;

/**
 * Tendai's tip (D150): a small card under the top bar with his face, one or two lines, and
 * "Got it" (plus "Show me" when the tip points at a place). Never pauses or blocks.
 */
export class TipCard {
  private root: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  current: Tip | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onDone: (tip: Tip) => void,
    private readonly onShowMe: (tip: Tip) => void,
  ) {}

  /** Shows the tip with its bottom-left corner at (left, bottom). */
  show(tip: Tip, left: number, bottom: number): void {
    this.hide();
    this.current = tip;
    const s = this.scene;
    const textX = PAD + FACE + PAD;
    const name = crispText(s, textX, PAD, t('tip.from'), {
      fontSize: TEXT_SIZE.small,
      fontStyle: 'bold',
      color: '#f0b46a',
    });
    const body = crispText(s, textX, PAD + name.height + 1, tip.text, {
      fontSize: TEXT_SIZE.small,
      lineSpacing: 2,
      wordWrap: { width: WIDTH - textX - PAD },
    });
    const buttonsY = Math.max(PAD + FACE, body.y + body.height) + 5;
    const height = buttonsY + BUTTON_H + PAD;
    const bg = s.add
      .rectangle(0, 0, WIDTH, height, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border)
      .setInteractive(); // clicks on the card don't reach the map
    const face = s.add
      .image(PAD, PAD, 'portrait-tendai', 0)
      .setOrigin(0)
      .setDisplaySize(FACE, FACE);
    const gotIt = new Button(s, WIDTH - PAD - 56, buttonsY, {
      width: 56,
      height: BUTTON_H,
      label: t('tip.gotIt'),
      onClick: () => this.dismiss(),
    });
    const parts: Phaser.GameObjects.GameObject[] = [bg, face, name, body, gotIt];
    if (tip.focus) {
      parts.push(
        new Button(s, WIDTH - PAD - 56 - 4 - 62, buttonsY, {
          width: 62,
          height: BUTTON_H,
          label: t('tip.showMe'),
          onClick: () => {
            this.onShowMe(tip);
            this.dismiss();
          },
        }),
      );
    }
    this.root = s.add.container(Math.round(left), Math.round(bottom - height), parts).setDepth(50);
    if (!reduceMotion()) {
      this.root.setAlpha(0);
      s.tweens.add({ targets: this.root, alpha: 1, duration: 250 });
    }
    this.timer = s.time.delayedCall(SHOW_MS, () => this.dismiss());
  }

  /** Keep the card above `bottom` (e.g. when an info panel opens under it). */
  moveAbove(bottom: number): void {
    if (!this.root) return;
    const b = this.root.getBounds();
    const y = Math.round(bottom - b.height);
    if (y !== this.root.y) this.root.setY(y);
  }

  contains(x: number, y: number): boolean {
    if (!this.root) return false;
    const b = this.root.getBounds();
    return b.contains(x, y);
  }

  /** Mark the tip done and remove it. */
  dismiss(): void {
    const tip = this.current;
    this.hide();
    if (tip) this.onDone(tip);
  }

  hide(): void {
    this.timer?.remove();
    this.timer = null;
    this.root?.destroy();
    this.root = null;
    this.current = null;
  }
}
