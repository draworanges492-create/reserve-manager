import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import type { GameSession } from '../core/GameSession';
import type { ScoreId } from '../core/GameState';
import { t } from '../core/text';
import { calendarOf } from '../sim/Seasons';
import { Button } from './Button';
import { crispText } from './crispText';
import { moneyText, moneyTooltip } from './economyInfo';
import { dateText, dateTooltip, scoreTooltip } from './hudInfo';
import { WARN_COLOR } from './InfoPanel';
import { Meter } from './Meter';
import { TEXT_SIZE, UI } from './theme';
import { viewWidth } from './view';

export const TOP_BAR_HEIGHT = 20;
const PAD = 4;
const BUTTON_W = 20;
const BUTTON_H = 13;
const PROGRESS_W = 48;
/** Fixed slot so changing digits don't shuffle the meters. */
const MONEY_W = 92;
const SCORES: ScoreId[] = ['ecosystem', 'trust', 'reputation'];
const SPEED_KEYS = ['1', '2', '3'];

/**
 * HUD top bar (spec §7.4): season and date, day progress, money with daily net, the three
 * score meters, and speed controls. Lays itself out to fit — down to the 640 px minimum —
 * by switching to a compact date when space is short.
 */
export class TopBar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly seasonIcon: Phaser.GameObjects.Image;
  private readonly date: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Rectangle;
  private readonly progressTrack: Phaser.GameObjects.Rectangle;
  private readonly pausedLabel: Phaser.GameObjects.Text;
  private readonly coin: Phaser.GameObjects.Image;
  private readonly money: Phaser.GameObjects.Text;
  private readonly meters: Meter[];
  private readonly pauseButton: Button;
  private readonly speedButtons: Button[];
  private compact = false;
  private lastDate = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
  ) {
    const mid = TOP_BAR_HEIGHT / 2;
    // Interactive (with no handler) so clicks on the bar don't fall through to the map.
    this.bg = scene.add
      .rectangle(0, 0, 1, TOP_BAR_HEIGHT, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setInteractive();
    scene.add.rectangle(0, TOP_BAR_HEIGHT, 4000, 1, UI.border).setOrigin(0);
    this.seasonIcon = scene.add.image(PAD + 6, mid, 'icon-dry');
    this.date = crispText(scene, PAD + 16, mid, '', { fontSize: TEXT_SIZE.label }).setOrigin(
      0,
      0.5,
    );
    this.progressTrack = scene.add.rectangle(0, mid, PROGRESS_W, 3, UI.hover).setOrigin(0, 0.5);
    this.progress = scene.add.rectangle(0, mid, 0, 3, UI.accent).setOrigin(0, 0.5);
    this.pausedLabel = crispText(scene, 0, mid, t('hud.paused'), {
      fontSize: TEXT_SIZE.small,
      color: WARN_COLOR,
    })
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.coin = scene.add.image(0, mid, 'icon-coin');
    this.money = crispText(scene, 0, mid, '', { fontSize: TEXT_SIZE.label }).setOrigin(0, 0.5);
    this.meters = SCORES.map((id) => new Meter(scene, `icon-${id}`, mid));

    const y = (TOP_BAR_HEIGHT - BUTTON_H) / 2;
    this.pauseButton = new Button(scene, 0, y, {
      width: BUTTON_W,
      height: BUTTON_H,
      icon: 'icon-pause',
      onClick: () => session.dispatch({ type: 'togglePause' }),
      tooltip: () => [t('hud.tip.pause')],
    });
    this.speedButtons = GAME_SPEEDS.map(
      (speed, i) =>
        new Button(scene, 0, y, {
          width: BUTTON_W,
          height: BUTTON_H,
          label: `${speed}×`,
          onClick: () => session.dispatch({ type: 'setSpeed', speed }),
          tooltip: () => [t('hud.tip.speed', { speed, key: SPEED_KEYS[i] ?? '' })],
        }),
    );
    this.layout();
  }

  /** True if a screen point (game pixels) is on the bar. */
  contains(x: number, y: number): boolean {
    return x >= 0 && x <= viewWidth(this.scene) && y >= 0 && y <= TOP_BAR_HEIGHT;
  }

  /** Tooltip for the date, money or a meter under the pointer (buttons have their own). */
  tooltipAt(x: number, y: number): string[] {
    if (y > TOP_BAR_HEIGHT) return [];
    const state = this.session.state;
    if (x <= this.progressTrack.x + PROGRESS_W) return dateTooltip(state);
    if (x >= this.coin.x - 8 && x <= this.coin.x + MONEY_W) return moneyTooltip(state);
    const i = this.meters.findIndex((m) => m.contains(x, y, TOP_BAR_HEIGHT));
    const score = SCORES[i];
    return score ? scoreTooltip(state, score) : [];
  }

  /** Re-position for the current canvas width. */
  layout(): void {
    const width = viewWidth(this.scene);
    this.bg.setSize(width, TOP_BAR_HEIGHT);
    this.bg.input?.hitArea.setSize(width, TOP_BAR_HEIGHT);
    const buttons = [this.pauseButton, ...this.speedButtons];
    const buttonsLeft = width - PAD - buttons.length * (BUTTON_W + 2) + 2;
    buttons.forEach((b, i) => b.setX(buttonsLeft + i * (BUTTON_W + 2)));

    // Try the full date first; fall back to the compact one if the meters would collide.
    for (const compact of [false, true]) {
      this.compact = compact;
      this.date.setText(dateText(this.session.state, compact));
      const end = this.placeFrom(this.date.x + this.date.width);
      if (end <= buttonsLeft - PAD || compact) break;
    }
    this.lastDate = this.date.text;
  }

  /** Lays out everything after the date; returns where the meters end. */
  private placeFrom(dateEnd: number): number {
    let x = dateEnd + PAD * 2;
    this.progressTrack.setX(x);
    this.progress.setX(x);
    this.pausedLabel.setX(x);
    x += PROGRESS_W + PAD * 3;
    this.coin.setX(x + 6);
    this.money.setX(x + 14);
    x += MONEY_W;
    for (const m of this.meters) {
      m.setX(x);
      x += Meter.WIDTH + PAD;
    }
    return x;
  }

  update(): void {
    const { clock, scores } = this.session.state;
    const date = dateText(this.session.state, this.compact);
    if (date !== this.lastDate) {
      this.lastDate = date;
      this.date.setText(date);
      this.seasonIcon.setTexture(`icon-${calendarOf(clock.day).season}`);
      this.layout(); // date width changed
    }
    // While paused the progress bar makes way for a "Paused" label.
    this.progress.width = PROGRESS_W * clock.dayProgress;
    this.progress.setVisible(!clock.paused);
    this.progressTrack.setVisible(!clock.paused);
    this.pausedLabel.setVisible(clock.paused);

    const money = moneyText(this.session.state);
    if (this.money.text !== money.text) this.money.setText(money.text);
    this.money.setColor(money.warn ? WARN_COLOR : UI.text);
    this.meters.forEach((m, i) => m.update(scores[SCORES[i] ?? 'ecosystem']));

    this.pauseButton.setSelected(clock.paused);
    this.speedButtons.forEach((b, i) =>
      b.setSelected(!clock.paused && GAME_SPEEDS[i] === clock.speed),
    );
  }
}
