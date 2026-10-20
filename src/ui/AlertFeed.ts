import type Phaser from 'phaser';
import { getSettings } from '../core/Settings';
import { t } from '../core/text';
import type { Alert, Severity } from './alerts';
import { Button } from './Button';
import { crispText } from './crispText';
import { levelColor, TEXT_SIZE, UI } from './theme';

const WIDTH = 176;
const PAD = 4;
const GAP = 3;
const MAX_VISIBLE = 5;
const CLOSE = 11;
const SLIDE_PX = 24;
const SLIDE_MS = 250;

function severityColor(severity: Severity): number {
  if (severity === 'critical') return levelColor('poor');
  if (severity === 'warning') return levelColor('fair');
  return getSettings().colorblind ? 0x56b4e9 : 0x7fa3b5;
}

/**
 * Alerts feed on the right (spec §7.4): colour-coded cards with a severity badge.
 * Clicking a card pans to its cause; × dismisses it.
 */
export class AlertFeed {
  private readonly root: Phaser.GameObjects.Container;
  private cards: { alert: Alert; y: number; h: number }[] = [];
  private signature = '';
  private shownKeys = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onOpen: (alert: Alert) => void,
    private readonly onDismiss: (alert: Alert) => void,
  ) {
    this.root = scene.add.container(0, 0);
  }

  contains(x: number, y: number): boolean {
    if (!this.root.visible) return false;
    const left = this.root.x;
    return this.cards.some(
      (c) =>
        x >= left && x <= left + WIDTH && y >= this.root.y + c.y && y <= this.root.y + c.y + c.h,
    );
  }

  /** Show the newest alerts from `top` down on the right edge (hidden while a menu is open). */
  render(alerts: readonly Alert[], top: number, visible: boolean): void {
    this.root.setVisible(visible).setPosition(this.scene.scale.width - WIDTH - PAD, top);
    const shown = alerts.slice(0, MAX_VISIBLE);
    const signature = JSON.stringify([
      shown.map((a) => [a.key, a.text, a.severity]),
      getSettings().colorblind,
    ]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.root.removeAll(true);
    this.cards = [];
    let y = 0;
    const previous = this.shownKeys;
    this.shownKeys = new Set(shown.map((a) => a.key));
    for (const alert of shown) {
      // Each card is built at y = 0 inside its own container, so it can slide in.
      const text = crispText(this.scene, PAD + 16, PAD, alert.text, {
        fontSize: TEXT_SIZE.small,
        wordWrap: { width: WIDTH - PAD * 2 - 16 - CLOSE - 2 },
      });
      const h = Math.max(18, text.height + PAD * 2);
      const bg = this.scene.add
        .rectangle(0, 0, WIDTH, h, UI.panel, UI.panelAlpha)
        .setOrigin(0)
        .setStrokeStyle(1, UI.border)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onOpen(alert));
      const strip = this.scene.add
        .rectangle(0, 0, 3, h, severityColor(alert.severity))
        .setOrigin(0);
      const badge = this.scene.add.image(PAD + 8, h / 2, `icon-alert-${alert.severity}`);
      const close = new Button(this.scene, WIDTH - CLOSE - 2, 2, {
        width: CLOSE,
        height: CLOSE,
        label: '×',
        onClick: () => this.onDismiss(alert),
        tooltip: () => [t('alert.dismiss')],
      });
      const card = this.scene.add.container(0, y, [bg, strip, badge, text, close]);
      this.root.add(card);
      if (!previous.has(alert.key)) {
        // New alerts slide in from the right.
        card.setX(SLIDE_PX).setAlpha(0);
        this.scene.tweens.add({
          targets: card,
          x: 0,
          alpha: 1,
          duration: SLIDE_MS,
          ease: 'Cubic.easeOut',
        });
      }
      this.cards.push({ alert, y, h });
      y += h + GAP;
    }
  }
}
