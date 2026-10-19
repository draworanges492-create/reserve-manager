import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import { eventBus } from '../core/EventBus';
import { t } from '../core/text';
import { crispText } from '../ui/crispText';
import { TimeOfDayOverlay } from '../ui/TimeOfDayOverlay';
import { TOP_BAR_HEIGHT, TopBar } from '../ui/TopBar';
import { UI } from '../ui/theme';
import { zoneDef } from './map/mapObjects';
import { getSession } from './session';

const MARGIN = 6;
const SPEED_KEYS = ['ONE', 'TWO', 'THREE'] as const;

/** HUD overlay, running in parallel with GameScene. */
export class UIScene extends Phaser.Scene {
  private topBar!: TopBar;
  private timeOfDay!: TimeOfDayOverlay;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const session = getSession(this);
    this.timeOfDay = new TimeOfDayOverlay(this);
    this.topBar = new TopBar(this, session);

    const zoneLabel = crispText(this, 0, TOP_BAR_HEIGHT + MARGIN, '', {
      fontSize: '10px',
      backgroundColor: '#241c16dd',
      padding: { x: 5, y: 3 },
    })
      .setOrigin(0.5, 0)
      .setVisible(false);
    const hint = crispText(this, MARGIN, 0, `${t('camera.hint')} · ${t('hud.speedHint')}`, {
      color: UI.textDim,
    }).setOrigin(0, 1);

    const layout = (): void => {
      zoneLabel.setX(Math.round(this.scale.width / 2));
      hint.setY(this.scale.height - MARGIN);
      this.topBar.layout();
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);

    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => session.dispatch({ type: 'togglePause' }));
    SPEED_KEYS.forEach((key, i) =>
      kb?.on(`keydown-${key}`, () =>
        session.dispatch({ type: 'setSpeed', speed: GAME_SPEEDS[i] ?? 1 }),
      ),
    );

    const off = eventBus.on('zoneHover', ({ zoneId }) => {
      const def = zoneId ? zoneDef(zoneId) : undefined;
      if (!def) {
        zoneLabel.setVisible(false);
        return;
      }
      const locked = !session.state.zones[def.id]?.unlocked;
      zoneLabel
        .setText(
          locked ? t('zone.locked', { name: def.name, chapter: def.unlockChapter }) : def.name,
        )
        .setVisible(true);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });
  }

  override update(): void {
    this.topBar.update();
    this.timeOfDay.update(getSession(this).state.clock.dayProgress);
  }
}
