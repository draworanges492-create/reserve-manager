import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import { zoneDef } from '../core/content';
import { type AnimalGroupRef, eventBus } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { t } from '../core/text';
import { isDegraded } from '../sim/Vegetation';
import { animalHoverLines, animalPanelContent, zonePanelContent } from '../ui/animalInfo';
import { Button } from '../ui/Button';
import { crispText, withShadow } from '../ui/crispText';
import {
  buildingHover,
  buildingPanelContent,
  buildMenu,
  moneyTooltip,
  staffHover,
  staffMenu,
} from '../ui/economyInfo';
import { InfoPanel } from '../ui/InfoPanel';
import { SidePanel } from '../ui/SidePanel';
import { TEXT_SIZE, UI } from '../ui/theme';
import { TimeOfDayOverlay } from '../ui/TimeOfDayOverlay';
import { Tooltip } from '../ui/Tooltip';
import { TOP_BAR_HEIGHT, TopBar } from '../ui/TopBar';
import { waterholeTooltip } from '../ui/waterholeTooltip';
import { placingText } from './BuildingLayer';
import { getSession } from './session';

const MARGIN = 6;
const SPEED_KEYS = ['ONE', 'TWO', 'THREE'] as const;
const TOOL_W = 58;
const TOOL_H = 16;

type Selection =
  | { kind: 'animal'; group: AnimalGroupRef }
  | { kind: 'zone'; zoneId: string }
  | { kind: 'slot'; slotId: string };

/** HUD overlay, running in parallel with GameScene. */
export class UIScene extends Phaser.Scene {
  private session!: GameSession;
  private topBar!: TopBar;
  private timeOfDay!: TimeOfDayOverlay;
  private tooltip!: Tooltip;
  private infoPanel!: InfoPanel;
  private sidePanel!: SidePanel;
  private toolbar: Button[] = [];
  private banner!: Phaser.GameObjects.Text;
  private hintHeight = 0;

  private hover: {
    waterhole: string | null;
    animal: AnimalGroupRef | null;
    slot: string | null;
    staff: string | null;
  } = { waterhole: null, animal: null, slot: null, staff: null };
  private selection: Selection | null = null;
  private menu: 'build' | 'staff' | null = null;
  private placing: string | null = null;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.session = getSession(this);
    this.timeOfDay = new TimeOfDayOverlay(this);
    this.topBar = new TopBar(this, this.session);
    this.infoPanel = new InfoPanel(this, () => this.select(null));
    this.sidePanel = new SidePanel(this);
    this.tooltip = new Tooltip(this);

    const zoneLabel = crispText(this, 0, TOP_BAR_HEIGHT + MARGIN, '', {
      fontSize: TEXT_SIZE.label,
      backgroundColor: '#241c16dd',
      padding: { x: 5, y: 3 },
    })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.banner = crispText(this, 0, TOP_BAR_HEIGHT + MARGIN + 22, '', {
      fontSize: TEXT_SIZE.body,
      backgroundColor: '#3a5a2add',
      padding: { x: 5, y: 3 },
    })
      .setOrigin(0.5, 0)
      .setVisible(false);
    const hint = withShadow(
      crispText(
        this,
        MARGIN,
        0,
        `${t('camera.hint')} · ${t('hud.speedHint')} · ${t('hud.menuHint')}`,
        {
          fontSize: TEXT_SIZE.small,
          color: UI.text,
        },
      ),
    )
      .setAlpha(0.85)
      .setOrigin(0, 1);
    this.hintHeight = hint.height + MARGIN;

    this.toolbar = [
      new Button(this, 0, 0, {
        width: TOOL_W,
        height: TOOL_H,
        icon: 'icon-build',
        label: t('hud.build'),
        onClick: () => this.toggleMenu('build'),
      }),
      new Button(this, 0, 0, {
        width: TOOL_W,
        height: TOOL_H,
        icon: 'icon-staff',
        label: t('hud.staff'),
        onClick: () => this.toggleMenu('staff'),
      }),
    ];

    const layout = (): void => {
      const w = this.scale.width;
      zoneLabel.setX(Math.round(w / 2));
      this.banner.setX(Math.round(w / 2));
      hint.setY(this.scale.height - MARGIN);
      this.toolbar.forEach((b, i) =>
        b.setPosition(
          w - MARGIN - (this.toolbar.length - i) * (TOOL_W + 3) + 3,
          this.scale.height - MARGIN - TOOL_H,
        ),
      );
      this.topBar.layout();
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);

    this.bindKeys();
    const offs = [
      eventBus.on('animalHover', ({ group }) => (this.hover.animal = group)),
      eventBus.on('waterholeHover', ({ id }) => (this.hover.waterhole = id)),
      eventBus.on('slotHover', ({ slotId }) => (this.hover.slot = slotId)),
      eventBus.on('staffHover', ({ staffId }) => (this.hover.staff = staffId)),
      eventBus.on('animalSelected', ({ group }) =>
        this.onSelected(group && { kind: 'animal', group }),
      ),
      eventBus.on('zoneSelected', ({ zoneId }) =>
        this.onSelected(zoneId ? { kind: 'zone', zoneId } : null),
      ),
      eventBus.on('slotSelected', ({ slotId }) =>
        this.onSelected(slotId ? { kind: 'slot', slotId } : null),
      ),
      eventBus.on('buildModeChanged', ({ buildingId }) => {
        this.placing = buildingId;
        if (buildingId) this.menu = null; // get the menu out of the way while placing
      }),
      eventBus.on('zoneHover', ({ zoneId }) => {
        const def = zoneId ? zoneDef(zoneId) : undefined;
        const zone = def && this.session.state.zones[def.id];
        if (!def || !zone) {
          zoneLabel.setVisible(false);
          return;
        }
        const label = !zone.unlocked
          ? t('zone.locked', { name: def.name, chapter: def.unlockChapter })
          : isDegraded(zone.vegetation)
            ? `${def.name} · ${t('zone.state.degraded')}`
            : def.name;
        zoneLabel.setText(label).setVisible(true);
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offs.forEach((off) => off());
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
    const onToolbar = this.toolbar.some(
      (b) => x >= b.x && y >= b.y && x <= b.x + TOOL_W && y <= b.y + TOOL_H,
    );
    return (
      this.topBar.contains(x, y) ||
      this.infoPanel.contains(x, y) ||
      this.sidePanel.contains(x, y) ||
      onToolbar
    );
  }

  override update(): void {
    const { state } = this.session;
    this.topBar.update();
    this.timeOfDay.update(state.clock.dayProgress);
    this.updateTooltip();
    this.infoPanel.update(state, this.scale.height - this.hintHeight);

    const dispatch = (c: Parameters<GameSession['dispatch']>[0]): void => {
      this.session.dispatch(c);
    };
    if (this.menu === 'build') {
      this.sidePanel.show(
        buildMenu(state, (buildingId) => eventBus.emit('buildModeChanged', { buildingId })),
        TOP_BAR_HEIGHT + MARGIN,
      );
    } else if (this.menu === 'staff') {
      this.sidePanel.show(staffMenu(state, dispatch), TOP_BAR_HEIGHT + MARGIN);
    } else if (this.sidePanel.visible) {
      this.sidePanel.hide();
    }
    this.toolbar[0]?.setSelected(this.menu === 'build' || !!this.placing);
    this.toolbar[1]?.setSelected(this.menu === 'staff');
    this.banner.setVisible(!!this.placing);
    if (this.placing) this.banner.setText(placingText(this.placing));
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.session.dispatch({ type: 'togglePause' }));
    SPEED_KEYS.forEach((key, i) =>
      kb?.on(`keydown-${key}`, () =>
        this.session.dispatch({ type: 'setSpeed', speed: GAME_SPEEDS[i] ?? 1 }),
      ),
    );
    kb?.on('keydown-B', () => this.toggleMenu('build'));
    kb?.on('keydown-H', () => this.toggleMenu('staff'));
    // Esc backs out one step: build mode, then a menu, then the info panel.
    kb?.on('keydown-ESC', () => {
      if (this.placing) eventBus.emit('buildModeChanged', { buildingId: null });
      else if (this.menu) this.menu = null;
      else this.select(null);
    });
  }

  private toggleMenu(menu: 'build' | 'staff'): void {
    if (this.placing) eventBus.emit('buildModeChanged', { buildingId: null });
    this.menu = this.menu === menu ? null : menu;
  }

  /** Close the current selection (each layer clears its own highlight). */
  private select(selection: Selection | null): void {
    if (selection) return;
    const current = this.selection;
    if (current?.kind === 'animal') eventBus.emit('animalSelected', { group: null });
    if (current?.kind === 'zone') eventBus.emit('zoneSelected', { zoneId: null });
    if (current?.kind === 'slot') eventBus.emit('slotSelected', { slotId: null });
  }

  /** One bottom-left panel shows the latest selection: a herd, a zone or a building. */
  private onSelected(selection: Selection | null): void {
    const dispatch = (c: Parameters<GameSession['dispatch']>[0]): void => {
      this.session.dispatch(c);
    };
    if (!selection) {
      this.selection = null;
      this.infoPanel.hide();
      return;
    }
    this.selection = selection;
    const state = this.session.state;
    if (selection.kind === 'animal') {
      const { zoneId, speciesId } = selection.group;
      this.infoPanel.show((s) => animalPanelContent(s, zoneId, speciesId), state);
    } else if (selection.kind === 'zone') {
      this.infoPanel.show((s) => zonePanelContent(s, selection.zoneId), state);
    } else {
      this.infoPanel.show((s) => buildingPanelContent(s, selection.slotId, dispatch), state);
    }
  }

  private updateTooltip(): void {
    const { state } = this.session;
    const p = this.input.activePointer;
    const h = this.hover;
    const lines = h.waterhole
      ? waterholeTooltip(state, h.waterhole)
      : h.staff
        ? staffHover(state, h.staff)
        : h.animal
          ? animalHoverLines(state, h.animal.zoneId, h.animal.speciesId)
          : h.slot
            ? buildingHover(state, h.slot)
            : this.topBar.overMoney(p.x, p.y)
              ? moneyTooltip(state)
              : [];
    if (lines.length) this.tooltip.show(lines, p.x, p.y);
    else this.tooltip.hide();
  }
}
