import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import { type AnimalGroupRef, eventBus } from '../core/EventBus';
import { t } from '../core/text';
import { crispText, withShadow } from '../ui/crispText';
import { TimeOfDayOverlay } from '../ui/TimeOfDayOverlay';
import { animalHoverLines, animalPanelContent, zonePanelContent } from '../ui/animalInfo';
import { InfoPanel } from '../ui/InfoPanel';
import { Tooltip } from '../ui/Tooltip';
import { waterholeTooltip } from '../ui/waterholeTooltip';
import { TOP_BAR_HEIGHT, TopBar } from '../ui/TopBar';
import { TEXT_SIZE, UI } from '../ui/theme';
import { zoneDef } from '../core/content';
import { isDegraded } from '../sim/Vegetation';
import { getSession } from './session';

const MARGIN = 6;
const SPEED_KEYS = ['ONE', 'TWO', 'THREE'] as const;

/** HUD overlay, running in parallel with GameScene. */
export class UIScene extends Phaser.Scene {
  private topBar!: TopBar;
  private timeOfDay!: TimeOfDayOverlay;
  private tooltip!: Tooltip;
  private hoveredWaterhole: string | null = null;
  private hoveredAnimal: AnimalGroupRef | null = null;
  private infoPanel!: InfoPanel;
  private hintHeight = 0;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const session = getSession(this);
    this.timeOfDay = new TimeOfDayOverlay(this);
    this.topBar = new TopBar(this, session);

    const zoneLabel = crispText(this, 0, TOP_BAR_HEIGHT + MARGIN, '', {
      fontSize: TEXT_SIZE.label,
      backgroundColor: '#241c16dd',
      padding: { x: 5, y: 3 },
    })
      .setOrigin(0.5, 0)
      .setVisible(false);
    const hint = withShadow(
      crispText(this, MARGIN, 0, `${t('camera.hint')} · ${t('hud.speedHint')}`, {
        fontSize: TEXT_SIZE.small,
        color: UI.text,
      }),
    )
      .setAlpha(0.85)
      .setOrigin(0, 1);
    this.hintHeight = hint.height + MARGIN;

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

    // One panel shows the current selection: a herd or a zone.
    let panelKind: 'animal' | 'zone' | null = null;
    const closePanel = (): void => {
      if (panelKind === 'animal') eventBus.emit('animalSelected', { group: null });
      if (panelKind === 'zone') eventBus.emit('zoneSelected', { zoneId: null });
    };
    this.infoPanel = new InfoPanel(this, closePanel);
    kb?.on('keydown-ESC', closePanel);
    const offAnimalHover = eventBus.on('animalHover', ({ group }) => {
      this.hoveredAnimal = group;
      if (!group && !this.hoveredWaterhole) this.tooltip.hide();
    });
    const offSelect = eventBus.on('animalSelected', ({ group }) => {
      if (group) {
        panelKind = 'animal';
        this.infoPanel.show(
          (s) => animalPanelContent(s, group.zoneId, group.speciesId),
          session.state,
        );
      } else if (panelKind === 'animal') {
        panelKind = null;
        this.infoPanel.hide();
      }
    });
    const offZoneSelect = eventBus.on('zoneSelected', ({ zoneId }) => {
      if (zoneId) {
        panelKind = 'zone';
        this.infoPanel.show((s) => zonePanelContent(s, zoneId), session.state);
      } else if (panelKind === 'zone') {
        panelKind = null;
        this.infoPanel.hide();
      }
    });
    const offWater = eventBus.on('waterholeHover', ({ id }) => {
      this.hoveredWaterhole = id;
      if (!id && !this.hoveredAnimal) this.tooltip.hide();
    });
    const off = eventBus.on('zoneHover', ({ zoneId }) => {
      const def = zoneId ? zoneDef(zoneId) : undefined;
      if (!def) {
        zoneLabel.setVisible(false);
        return;
      }
      const zone = session.state.zones[def.id];
      const label = !zone?.unlocked
        ? t('zone.locked', { name: def.name, chapter: def.unlockChapter })
        : isDegraded(zone.vegetation)
          ? `${def.name} · ${t('zone.state.degraded')}`
          : def.name;
      zoneLabel.setText(label).setVisible(true);
    });
    this.tooltip = new Tooltip(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      offWater();
      offAnimalHover();
      offSelect();
      offZoneSelect();
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
    return this.topBar.contains(x, y) || this.infoPanel.contains(x, y);
  }

  override update(): void {
    this.topBar.update();
    const { state } = getSession(this);
    this.timeOfDay.update(state.clock.dayProgress);
    const p = this.input.activePointer;
    if (this.hoveredWaterhole) {
      this.tooltip.show(waterholeTooltip(state, this.hoveredWaterhole), p.x, p.y);
    } else if (this.hoveredAnimal) {
      const { zoneId, speciesId } = this.hoveredAnimal;
      this.tooltip.show(animalHoverLines(state, zoneId, speciesId), p.x, p.y);
    }
    // Sit just above the controls hint at the bottom-left.
    this.infoPanel.update(state, this.scale.height - this.hintHeight);
  }
}
