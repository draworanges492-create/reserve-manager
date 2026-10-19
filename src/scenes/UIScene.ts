import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import { eventBus } from '../core/EventBus';
import { t } from '../core/text';
import { crispText } from '../ui/crispText';
import { TimeOfDayOverlay } from '../ui/TimeOfDayOverlay';
import { Tooltip } from '../ui/Tooltip';
import { waterholeTooltip } from '../ui/waterholeTooltip';
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
  private tooltip!: Tooltip;
  private hoveredWaterhole: string | null = null;

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

    const offWater = eventBus.on('waterholeHover', ({ id }) => {
      this.hoveredWaterhole = id;
      if (!id) this.tooltip.hide();
    });
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
    this.tooltip = new Tooltip(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      offWater();
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });
  }

  /**
   * Whether a screen point is over HUD chrome. Computed from our own panel bounds, NOT
   * with `input.hitTestPointer`: Phaser's hit test reuses one shared array, so calling it
   * while GameScene is processing a pointer event wipes GameScene's hits and its
   * hover (over/out) events silently stop working.
   */
  isPointerOverUI(x: number, y: number): boolean {
    return this.topBar.contains(x, y);
  }

  override update(): void {
    this.topBar.update();
    const { state } = getSession(this);
    this.timeOfDay.update(state.clock.dayProgress);
    if (this.hoveredWaterhole) {
      const p = this.input.activePointer;
      this.tooltip.show(waterholeTooltip(state, this.hoveredWaterhole), p.x, p.y);
    }
  }
}
