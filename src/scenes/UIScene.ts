import Phaser from 'phaser';
import { GAME_SPEEDS } from '../config/game';
import { zoneDef } from '../core/content';
import { type AnimalGroupRef, eventBus, type GameEvents } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { getSettings, onSettingsChanged, updateSettings } from '../core/Settings';
import { t } from '../core/text';
import { isDegraded } from '../sim/Vegetation';
import { AlertFeed } from '../ui/AlertFeed';
import { type Alert, type AlertEvent, AlertList, alertFor } from '../ui/alerts';
import { animalHoverLines, animalPanelContent, zonePanelContent } from '../ui/animalInfo';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import {
  buildingHover,
  buildingPanelContent,
  buildMenu,
  staffHover,
  staffMenu,
} from '../ui/economyInfo';
import { hoverTipLines } from '../ui/hoverTip';
import { InfoPanel } from '../ui/InfoPanel';
import { journalMenu, settingsMenu, speciesMenu } from '../ui/menus';
import { SidePanel } from '../ui/SidePanel';
import { TEXT_SIZE } from '../ui/theme';
import { TimeOfDayOverlay } from '../ui/TimeOfDayOverlay';
import { Tooltip } from '../ui/Tooltip';
import { TOP_BAR_HEIGHT, TopBar } from '../ui/TopBar';
import { waterholeTooltip } from '../ui/waterholeTooltip';
import { placingText } from './BuildingLayer';
import { getSession } from './session';

const MARGIN = 6;
const TOOL_W = 62;
const TOOL_H = 16;
/** Events that can become alerts (spec §7.4). */
const ALERT_EVENTS: AlertEvent['type'][] = [
  'waterholeStateChanged',
  'populationCritical',
  'zoneDegradedChanged',
  'staffQuit',
  'debtChanged',
  'buildingCompleted',
  'seasonChanged',
];

type Menu = 'build' | 'staff' | 'species' | 'journal' | 'settings';
type Selection =
  | { kind: 'animal'; group: AnimalGroupRef }
  | { kind: 'zone'; zoneId: string }
  | { kind: 'slot'; slotId: string };

/** HUD overlay, running in parallel with GameScene (spec §7.4). */
export class UIScene extends Phaser.Scene {
  private session!: GameSession;
  private topBar!: TopBar;
  private timeOfDay!: TimeOfDayOverlay;
  private tooltip!: Tooltip;
  private infoPanel!: InfoPanel;
  private sidePanel!: SidePanel;
  private alertFeed!: AlertFeed;
  private readonly alerts = new AlertList();
  private toolbar: Button[] = [];
  private banner!: Phaser.GameObjects.Text;

  private hover: {
    waterhole: string | null;
    animal: AnimalGroupRef | null;
    slot: string | null;
    staff: string | null;
  } = { waterhole: null, animal: null, slot: null, staff: null };
  private selection: Selection | null = null;
  private menu: Menu | null = null;
  private placing: string | null = null;
  private confirmNewGame = false;
  /** Text size the HUD was built with; a different setting rebuilds it. */
  private builtTextSize = getSettings().textSize;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.session = getSession(this);
    // Phaser reuses this object on restart, so record the size we're building with now.
    this.builtTextSize = getSettings().textSize;
    this.hover = { waterhole: null, animal: null, slot: null, staff: null };
    this.selection = null;
    this.timeOfDay = new TimeOfDayOverlay(this);
    this.topBar = new TopBar(this, this.session);
    this.infoPanel = new InfoPanel(this, () => this.closeSelection());
    this.sidePanel = new SidePanel(this);
    this.alertFeed = new AlertFeed(
      this,
      (alert) => this.openAlert(alert),
      (alert) => this.alerts.remove(alert.key),
    );
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
    this.createToolbar();

    const layout = (): void => {
      const w = this.scale.width;
      zoneLabel.setX(Math.round(w / 2));
      this.banner.setX(Math.round(w / 2));
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

    // Wheel over a menu scrolls it (the camera ignores wheel events over the HUD).
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        if (this.sidePanel.contains(p.x, p.y)) this.sidePanel.scrollBy(dy);
      },
    );

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
      ...ALERT_EVENTS.map((type) =>
        eventBus.on(type, (payload: GameEvents[typeof type]) =>
          this.alerts.apply(alertFor(this.session.state, { type, payload } as AlertEvent)),
        ),
      ),
      // Bigger or smaller text needs the HUD rebuilt; everything else applies live.
      onSettingsChanged((s) => {
        if (s.textSize !== this.builtTextSize) this.scene.restart();
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
      this.alertFeed.contains(x, y) ||
      onToolbar
    );
  }

  override update(): void {
    const { state } = this.session;
    this.topBar.update();
    this.timeOfDay.update(state.clock.dayProgress, getSettings().timeOfDay);
    this.updateTooltip();
    this.infoPanel.update(state, this.scale.height);

    const top = TOP_BAR_HEIGHT + MARGIN;
    const maxHeight = this.scale.height - top - TOOL_H - MARGIN * 3;
    const content = this.menuContent();
    if (content) this.sidePanel.show(content, top, maxHeight);
    else if (this.sidePanel.visible) this.sidePanel.hide();

    this.alerts.expire(state.clock.day);
    this.alertFeed.render(this.alerts.all, top, !this.menu);

    const menus: Menu[] = ['build', 'staff', 'species', 'journal', 'settings'];
    this.toolbar.forEach((b, i) =>
      b.setSelected(this.menu === menus[i] || (i === 0 && !!this.placing)),
    );
    this.banner.setVisible(!!this.placing);
    if (this.placing) this.banner.setText(placingText(this.placing));
  }

  private createToolbar(): void {
    const tools: { menu: Menu; icon: string; label: string; tip: string }[] = [
      { menu: 'build', icon: 'icon-build', label: t('hud.build'), tip: t('tool.build') },
      { menu: 'staff', icon: 'icon-staff', label: t('hud.staff'), tip: t('tool.staff') },
      { menu: 'species', icon: 'icon-species', label: t('hud.species'), tip: t('tool.species') },
      { menu: 'journal', icon: 'icon-journal', label: t('hud.journal'), tip: t('tool.journal') },
      {
        menu: 'settings',
        icon: 'icon-settings',
        label: t('hud.settings'),
        tip: t('tool.settings'),
      },
    ];
    this.toolbar = tools.map(
      (tool) =>
        new Button(this, 0, 0, {
          width: TOOL_W,
          height: TOOL_H,
          icon: tool.icon,
          label: tool.label,
          onClick: () => this.toggleMenu(tool.menu),
          tooltip: () => [tool.tip],
        }),
    );
  }

  private menuContent(): ReturnType<typeof buildMenu> | null {
    const state = this.session.state;
    const dispatch = (c: Parameters<GameSession['dispatch']>[0]): void => {
      this.session.dispatch(c);
    };
    switch (this.menu) {
      case 'build':
        return buildMenu(state, (buildingId) => eventBus.emit('buildModeChanged', { buildingId }));
      case 'staff':
        return staffMenu(state, dispatch);
      case 'species':
        return speciesMenu(state, (zoneId, speciesId) => {
          const r = state.zones[zoneId]?.rect;
          if (r) eventBus.emit('focusRequested', { x: r.x + r.w / 2, y: r.y + r.h / 2 });
          eventBus.emit('animalSelected', { group: { zoneId, speciesId } });
        });
      case 'journal':
        return journalMenu();
      case 'settings':
        return settingsMenu(getSettings(), updateSettings, {
          confirming: this.confirmNewGame,
          onClick: () => {
            // Two clicks, so a stray click can't throw a game away. Saves come in Phase 8.
            if (this.confirmNewGame) window.location.reload();
            this.confirmNewGame = true;
          },
        });
      default:
        return null;
    }
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.session.dispatch({ type: 'togglePause' }));
    (['ONE', 'TWO', 'THREE'] as const).forEach((key, i) =>
      kb?.on(`keydown-${key}`, () =>
        this.session.dispatch({ type: 'setSpeed', speed: GAME_SPEEDS[i] ?? 1 }),
      ),
    );
    const menuKeys: [string, Menu][] = [
      ['B', 'build'],
      ['H', 'staff'],
      ['K', 'species'],
      ['J', 'journal'],
      ['O', 'settings'],
    ];
    for (const [key, menu] of menuKeys) kb?.on(`keydown-${key}`, () => this.toggleMenu(menu));
    // Esc backs out one step: build mode, then a menu, then the info panel.
    kb?.on('keydown-ESC', () => {
      if (this.placing) eventBus.emit('buildModeChanged', { buildingId: null });
      else if (this.menu) this.menu = null;
      else this.closeSelection();
    });
  }

  private toggleMenu(menu: Menu): void {
    if (this.placing) eventBus.emit('buildModeChanged', { buildingId: null });
    this.menu = this.menu === menu ? null : menu;
    this.confirmNewGame = false;
  }

  /** Close the current selection (each layer clears its own highlight). */
  private closeSelection(): void {
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

  /** Clicking an alert pans to its cause and opens what it's about (spec §7.4). */
  private openAlert(alert: Alert): void {
    if (alert.focus) eventBus.emit('focusRequested', alert.focus);
    const target = alert.target;
    if (target?.kind === 'zone') eventBus.emit('zoneSelected', { zoneId: target.zoneId });
    if (target?.kind === 'animal') {
      eventBus.emit('animalSelected', {
        group: { zoneId: target.zoneId, speciesId: target.speciesId },
      });
    }
    if (target?.kind === 'slot') eventBus.emit('slotSelected', { slotId: target.slotId });
    if (alert.severity === 'info') this.alerts.remove(alert.key);
  }

  private updateTooltip(): void {
    const { state } = this.session;
    const p = this.input.activePointer;
    const h = this.hover;
    let lines = hoverTipLines();
    if (!lines.length) {
      lines = h.waterhole
        ? waterholeTooltip(state, h.waterhole)
        : h.staff
          ? staffHover(state, h.staff)
          : h.animal
            ? animalHoverLines(state, h.animal.zoneId, h.animal.speciesId)
            : h.slot
              ? buildingHover(state, h.slot)
              : this.topBar.tooltipAt(p.x, p.y);
    }
    if (lines.length) this.tooltip.show(lines, p.x, p.y);
    else this.tooltip.hide();
  }
}
