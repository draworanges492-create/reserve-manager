import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import type { GameSession } from '../core/GameSession';
import { t } from '../core/text';
import { calendarOf } from '../sim/Seasons';
import { Button } from './Button';
import { crispText } from './crispText';
import { UI } from './theme';

export const TOP_BAR_HEIGHT = 18;
const PAD = 4;
const BUTTON_W = 20;
const BUTTON_H = 13;
const PROGRESS_W = 56;

/**
 * HUD top bar (spec §7.4, Phase 2 part): season icon, date, day progress and speed
 * controls. Money and score meters join it in later phases.
 */
export class TopBar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly seasonIcon: Phaser.GameObjects.Image;
  private readonly date: Phaser.GameObjects.Text;
  private readonly pausedLabel: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Rectangle;
  private readonly progressTrack: Phaser.GameObjects.Rectangle;
  private readonly pauseButton: Button;
  private readonly speedButtons: Button[];
  private lastDateText = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
  ) {
    // Interactive (with no handler) so clicks on the bar don't fall through to the map.
    this.bg = scene.add
      .rectangle(0, 0, 1, TOP_BAR_HEIGHT, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setInteractive();
    scene.add.rectangle(0, TOP_BAR_HEIGHT, 4000, 1, UI.border).setOrigin(0);
    this.seasonIcon = scene.add.image(PAD + 6, TOP_BAR_HEIGHT / 2, 'icon-dry');
    this.date = crispText(scene, PAD + 16, TOP_BAR_HEIGHT / 2, '', { fontSize: '9px' }).setOrigin(
      0,
      0.5,
    );
    this.progressTrack = scene.add
      .rectangle(0, TOP_BAR_HEIGHT / 2, PROGRESS_W, 3, UI.hover)
      .setOrigin(0, 0.5);
    this.progress = scene.add.rectangle(0, TOP_BAR_HEIGHT / 2, 0, 3, UI.accent).setOrigin(0, 0.5);
    this.pausedLabel = crispText(scene, 0, TOP_BAR_HEIGHT / 2, t('hud.paused'), { color: UI.text })
      .setOrigin(1, 0.5)
      .setVisible(false);

    const y = (TOP_BAR_HEIGHT - BUTTON_H) / 2;
    this.pauseButton = new Button(scene, 0, y, {
      width: BUTTON_W,
      height: BUTTON_H,
      icon: 'icon-pause',
      onClick: () => session.dispatch({ type: 'togglePause' }),
    });
    this.speedButtons = GAME_SPEEDS.map(
      (speed) =>
        new Button(scene, 0, y, {
          width: BUTTON_W,
          height: BUTTON_H,
          label: `${speed}×`,
          onClick: () => session.dispatch({ type: 'setSpeed', speed }),
        }),
    );
    this.layout();
  }

  /** True if a screen point (game pixels) is on the bar. */
  contains(x: number, y: number): boolean {
    return x >= 0 && x <= this.scene.scale.width && y >= 0 && y <= TOP_BAR_HEIGHT;
  }

  /** Re-position for the current canvas width. */
  layout(): void {
    const width = this.scene.scale.width;
    this.bg.setSize(width, TOP_BAR_HEIGHT);
    this.bg.input?.hitArea.setSize(width, TOP_BAR_HEIGHT);
    const buttons = [this.pauseButton, ...this.speedButtons];
    let x = width - PAD - buttons.length * (BUTTON_W + 2) + 2;
    this.pausedLabel.setX(x - PAD);
    for (const b of buttons) {
      b.setX(x);
      x += BUTTON_W + 2;
    }
  }

  update(): void {
    const { clock } = this.session.state;
    const cal = calendarOf(clock.day);
    const text = t('hud.date', {
      year: cal.year,
      season: t(cal.season === 'dry' ? 'season.dry' : 'season.wet'),
      day: cal.dayOfSeason,
      days: cal.daysPerSeason,
    });
    if (text !== this.lastDateText) {
      this.lastDateText = text;
      this.date.setText(text);
      this.seasonIcon.setTexture(`icon-${cal.season}`);
      const right = this.date.x + this.date.width + PAD * 2;
      this.progressTrack.setX(right);
      this.progress.setX(right);
    }
    this.progress.width = PROGRESS_W * clock.dayProgress;
    this.pausedLabel.setVisible(clock.paused);
    this.pauseButton.setSelected(clock.paused);
    this.speedButtons.forEach((b, i) =>
      b.setSelected(!clock.paused && GAME_SPEEDS[i] === clock.speed),
    );
  }
}
