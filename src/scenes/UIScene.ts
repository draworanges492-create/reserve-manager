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
import { GoalTracker } from '../ui/GoalTracker';
import { settingsMenu, speciesMenu } from '../ui/menus';
import { fenceTooltip } from '../ui/storyInfo';
import type { JournalScene } from './JournalScene';
import { fencesBlocking } from '../story/StoryManager';
import { SidePanel } from '../ui/SidePanel';
import { TEXT_SIZE } from '../ui/theme';
import { TimeOfDayOverlay } from '../ui/TimeOfDayOverlay';
import { Tooltip } from '../ui/Tooltip';
import { TOP_BAR_HEIGHT, TopBar } from '../ui/TopBar';
import { waterholeTooltip } from '../ui/waterholeTooltip';
import { bindGameAudio, updateGameAudio } from '../audio/hooks';
import { audio } from '../audio/AudioManager';
import { findSecret, onSecretFound, SECRET_IDS } from '../core/Secrets';
import { placingText } from './BuildingLayer';
import { returnToMenu, saveTo } from './launch';
import { listSlots, type LoadResult, localSaveStore, type SlotId } from '../core/Save';
import { getSession } from './session';
import { fitUiCamera, pointerInView, viewHeight, viewWidth } from '../ui/view';

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
  'goalCompleted',
  'journalAdded',
  'encyclopediaUnlocked',
  'cropRaid',
  'herdPlanDone',
  'speciesReintroduced',
  'poachingIncident',
  'poacherCaught',
  'diseaseOutbreak',
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
  private alerts = new AlertList();
  /** Session the alerts belong to: a new or loaded game starts with an empty feed. */
  private alertsFor: GameSession | null = null;
  private toolbar: Button[] = [];
  private banner!: Phaser.GameObjects.Text;

  private hover: {
    waterhole: string | null;
    animal: AnimalGroupRef | null;
    slot: string | null;
    staff: string | null;
    fence: string | null;
    clue: string | null;
    secret: string | null;
  } = {
    waterhole: null,
    animal: null,
    slot: null,
    staff: null,
    fence: null,
    clue: null,
    secret: null,
  };
  private goalTracker!: GoalTracker;
  /** Species whose encyclopedia page is open in the Species panel. */
  private selection: Selection | null = null;
  private menu: Menu | null = null;
  private placing: string | null = null;
  /** Save-slot feedback in Settings: which slot awaits "Overwrite?", and the last result. */
  private saveUi: { confirming: SlotId | null; lastSaved: SlotId | null; failed: SlotId | null } = {
    confirming: null,
    lastSaved: null,
    failed: null,
  };
  /** Manual slots, re-read from storage only when Settings opens or after a save. */
  private manualSlots: { slot: SlotId; result: LoadResult }[] = [];
  /** Text size the HUD was built with; a different setting rebuilds it. */
  private builtTextSize = getSettings().textSize;

  constructor() {
    super('UIScene');
  }

  create(): void {
    fitUiCamera(this);
    this.session = getSession(this);
    if (this.alertsFor !== this.session) {
      this.alerts = new AlertList();
      this.alertsFor = this.session;
      this.menu = null;
      this.placing = null;
    }
    // Phaser reuses this object on restart, so record the size we're building with now.
    this.builtTextSize = getSettings().textSize;
    this.hover = {
      waterhole: null,
      animal: null,
      slot: null,
      staff: null,
      fence: null,
      clue: null,
      secret: null,
    };
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
    this.goalTracker = new GoalTracker(this, MARGIN, TOP_BAR_HEIGHT + MARGIN);
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
      const w = viewWidth(this);
      zoneLabel.setX(Math.round(w / 2));
      this.banner.setX(Math.round(w / 2));
      this.toolbar.forEach((b, i) =>
        b.setPosition(
          w - MARGIN - (this.toolbar.length - i) * (TOOL_W + 3) + 3,
          viewHeight(this) - MARGIN - TOOL_H,
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
        const { x, y } = pointerInView(p);
        if (this.sidePanel.contains(x, y)) this.sidePanel.scrollBy(dy);
      },
    );

    const offs = [
      // Easter eggs (D132): a chime and a quiet note, nothing more.
      onSecretFound((_id, n) => {
        audio.sfx('secret');
        this.alerts.apply({
          add: {
            key: 'secret',
            severity: 'info',
            text: t('secrets.found', { n, total: SECRET_IDS.length }),
            day: this.session.state.clock.day,
          },
        });
      }),
      eventBus.on('journalAdded', ({ entryId }) => {
        if (entryId !== 'visitor_1000') return;
        audio.sfx('coin');
        findSecret('visitor_1000');
      }),
      eventBus.on('animalHover', ({ group }) => (this.hover.animal = group)),
      eventBus.on('waterholeHover', ({ id }) => (this.hover.waterhole = id)),
      eventBus.on('slotHover', ({ slotId }) => (this.hover.slot = slotId)),
      eventBus.on('staffHover', ({ staffId }) => (this.hover.staff = staffId)),
      eventBus.on('fenceHover', ({ segmentId }) => (this.hover.fence = segmentId)),
      eventBus.on('clueHover', ({ clueId }) => (this.hover.clue = clueId)),
      eventBus.on('secretHover', ({ text }) => (this.hover.secret = text)),
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
        const blocking = fencesBlocking(this.session.state, def.id).length;
        const opensNow = def.unlockChapter <= this.session.state.chapter.current && blocking > 0;
        const label = !zone.unlocked
          ? opensNow
            ? `${def.name} · ${t('zone.fencesToOpen', { n: blocking })}`
            : t('zone.locked', { name: def.name, chapter: def.unlockChapter })
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
    const offAudio = bindGameAudio();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offAudio();
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
  /** `screenX/Y` are pointer coordinates (device pixels), as Phaser reports them. */
  isPointerOverUI(screenX: number, screenY: number): boolean {
    const { x, y } = pointerInView({ x: screenX, y: screenY });
    const onToolbar = this.toolbar.some(
      (b) => x >= b.x && y >= b.y && x <= b.x + TOOL_W && y <= b.y + TOOL_H,
    );
    return (
      this.topBar.contains(x, y) ||
      this.goalTracker.contains(x, y) ||
      this.infoPanel.contains(x, y) ||
      this.sidePanel.contains(x, y) ||
      this.alertFeed.contains(x, y) ||
      onToolbar
    );
  }

  override update(): void {
    const { state } = this.session;
    this.topBar.update();
    updateGameAudio(state);
    this.goalTracker.update(state);
    this.timeOfDay.update(state.clock.dayProgress, getSettings().timeOfDay);
    this.updateTooltip();
    this.infoPanel.update(state, viewHeight(this));

    const top = TOP_BAR_HEIGHT + MARGIN;
    const maxHeight = viewHeight(this) - top - TOOL_H - MARGIN * 3;
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
        return speciesMenu(
          state,
          (zoneId, speciesId) => {
            const r = state.zones[zoneId]?.rect;
            if (r) eventBus.emit('focusRequested', { x: r.x + r.w / 2, y: r.y + r.h / 2 });
            eventBus.emit('animalSelected', { group: { zoneId, speciesId } });
          },
          // Field notes in the journal replace the old encyclopedia page (D130).
          (speciesId) => this.journal().openAt('notes', `notes:${speciesId}`),
          (speciesId) => dispatch({ type: 'reintroduce', speciesId }),
        );
      case 'settings':
        return settingsMenu(getSettings(), updateSettings, {
          ...this.saveUi,
          slots: this.manualSlots,
          onSave: (slot) => this.saveToSlot(slot),
          onMainMenu: () => returnToMenu(this),
        });
      default:
        return null;
    }
  }

  private bindKeys(): void {
    const raw = this.input.keyboard;
    // While someone is talking, Space / 1–3 / Esc belong to the dialogue box.
    const talking = (): boolean => this.session.dialogueView !== null;
    // Panels shouldn't open behind the journal book (J still closes it).
    const behindBook = new Set(['keydown-B', 'keydown-H', 'keydown-K', 'keydown-O']);
    const kb = raw && {
      on: (event: string, fn: () => void) =>
        raw.on(event, () => {
          if (talking() || (behindBook.has(event) && this.journal().isOpen)) return;
          fn();
        }),
    };
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

  private refreshSlots(): void {
    this.manualSlots = listSlots(localSaveStore()).filter((s) => s.slot !== 'auto');
  }

  /** Empty slots save at once; a used slot asks "Overwrite?" first. */
  private saveToSlot(slot: SlotId): void {
    const result = this.manualSlots.find((s) => s.slot === slot)?.result;
    const used = !!result && (result.ok || result.error !== 'empty');
    if (used && this.saveUi.confirming !== slot) {
      this.saveUi = { confirming: slot, lastSaved: null, failed: null };
      return;
    }
    const ok = saveTo(this.session, slot);
    this.saveUi = { confirming: null, lastSaved: ok ? slot : null, failed: ok ? null : slot };
    this.refreshSlots();
  }

  private journal(): JournalScene {
    return this.scene.get('JournalScene') as JournalScene;
  }

  private toggleMenu(menu: Menu): void {
    if (this.placing) eventBus.emit('buildModeChanged', { buildingId: null });
    // The journal is a book over the map, not a side panel (D130).
    if (menu === 'journal') {
      this.menu = null;
      this.journal().toggle();
      return;
    }
    this.menu = this.menu === menu ? null : menu;
    this.saveUi = { confirming: null, lastSaved: null, failed: null };
    if (this.menu === 'settings') this.refreshSlots();
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
      this.infoPanel.show((s) => animalPanelContent(s, zoneId, speciesId, dispatch), state);
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
    const p = pointerInView(this.input.activePointer);
    const h = this.hover;
    let lines = hoverTipLines();
    if (!lines.length) {
      lines = h.clue
        ? [t('clue.hover')]
        : h.fence
          ? fenceTooltip(state, h.fence)
          : h.waterhole
            ? waterholeTooltip(state, h.waterhole)
            : h.staff
              ? staffHover(state, h.staff)
              : h.animal
                ? animalHoverLines(state, h.animal.zoneId, h.animal.speciesId)
                : h.slot
                  ? buildingHover(state, h.slot)
                  : h.secret
                    ? [h.secret]
                    : this.topBar.tooltipAt(p.x, p.y);
    }
    if (lines.length) this.tooltip.show(lines, p.x, p.y);
    else this.tooltip.hide();
  }
}
