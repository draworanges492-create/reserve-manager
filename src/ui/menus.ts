// Content for the Species, Journal and Settings menus (pure, so it can be tested).
import { SPECIES, zoneDef } from '../core/content';
import type { GameState } from '../core/GameState';
import { nextVolume, type Settings } from '../core/Settings';
import { t } from '../core/text';
import { GAME_SPEEDS, type GameSpeed } from '../config/game';
import type { PanelLine } from './animalInfo';
import type { SideContent } from './SidePanel';
import type { LoadResult, SlotId } from '../core/Save';
import { slotName, slotText } from './saveInfo';

/** Herd with the most animals, for "Show". */
export function biggestHerd(
  state: GameState,
  speciesId: string,
): { zoneId: string; count: number } | null {
  let best: { zoneId: string; count: number } | null = null;
  for (const [zoneId, herd] of Object.entries(state.populations)) {
    const n = herd[speciesId] ?? 0;
    if (n > 0 && (!best || n > best.count)) best = { zoneId, count: n };
  }
  return best;
}

export function speciesMenu(
  state: GameState,
  onShow: (zoneId: string, speciesId: string) => void,
): SideContent {
  const present = SPECIES.filter((s) => biggestHerd(state, s.id));
  return {
    title: t('species.title'),
    intro: [{ text: t('species.intro', { n: present.length }) }],
    rows: SPECIES.map((s) => {
      const herds = Object.entries(state.populations)
        .filter(([, h]) => (h[s.id] ?? 0) > 0)
        .map(([zoneId, h]) => `${zoneDef(zoneId)?.name ?? zoneId} ${Math.round(h[s.id] ?? 0)}`);
      const total = Object.values(state.populations).reduce((sum, h) => sum + (h[s.id] ?? 0), 0);
      const where = herds.length ? herds.join(', ') : t('species.none');
      const lines: PanelLine[] = [
        { text: t('species.row', { name: s.name, count: Math.round(total) }) },
        { text: t('species.where', { diet: t(`diet.${s.diet}`), where }) },
      ];
      if (total > 0 && total < s.minViable) {
        lines.push({
          text: t('animal.status.critical', { min: s.minViable }),
          warn: true,
        } as never);
      }
      const herd = biggestHerd(state, s.id);
      return {
        lines,
        actions: [
          {
            label: t('species.show'),
            enabled: !!herd,
            onClick: () => herd && onShow(herd.zoneId, s.id),
          },
        ],
      };
    }),
  };
}

const onOff = (on: boolean): string => t(on ? 'settings.on' : 'settings.off');
const pct = (v: number): string => `${Math.round(v * 100)}%`;

function nextSpeed(speed: GameSpeed): GameSpeed {
  const i = GAME_SPEEDS.indexOf(speed);
  return GAME_SPEEDS[(i + 1) % GAME_SPEEDS.length] ?? 1;
}

export function settingsMenu(
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
  saves: SaveControls,
): SideContent {
  const row = (title: string, label: string, onClick: () => void, detail?: string) => ({
    lines: detail ? [{ text: title }, { text: detail }] : [{ text: title }],
    actions: [{ label, enabled: true, onClick }],
  });
  return {
    title: t('settings.title'),
    intro: [{ text: t('settings.audioNote') }],
    rows: [
      row(t('settings.music'), pct(settings.musicVolume), () =>
        update({ musicVolume: nextVolume(settings.musicVolume) }),
      ),
      row(t('settings.sfx'), pct(settings.sfxVolume), () =>
        update({ sfxVolume: nextVolume(settings.sfxVolume) }),
      ),
      row(t('settings.speed'), `${settings.defaultSpeed}×`, () =>
        update({ defaultSpeed: nextSpeed(settings.defaultSpeed) }),
      ),
      row(
        t('settings.colorblind'),
        onOff(settings.colorblind),
        () => update({ colorblind: !settings.colorblind }),
        t('settings.colorblindDetail'),
      ),
      row(
        t('settings.textSize'),
        t(settings.textSize === 'large' ? 'settings.textLarge' : 'settings.textNormal'),
        () => update({ textSize: settings.textSize === 'large' ? 'normal' : 'large' }),
      ),
      row(t('settings.timeOfDay'), onOff(settings.timeOfDay), () =>
        update({ timeOfDay: !settings.timeOfDay }),
      ),
      row(t('settings.edgeScroll'), onOff(settings.edgeScroll), () =>
        update({ edgeScroll: !settings.edgeScroll }),
      ),
      {
        lines: [{ text: t('settings.controls') }, { text: t('settings.controlsList') }],
        actions: [],
      },
      {
        lines: [{ text: t('settings.saveTitle') }, { text: t('settings.autosaveNote') }],
        actions: [],
      },
      ...saves.slots.map((s) => {
        const status =
          saves.lastSaved === s.slot
            ? t('settings.saved')
            : saves.failed === s.slot
              ? t('settings.saveFailed')
              : null;
        const label = saves.confirming === s.slot ? t('settings.overwrite') : t('settings.save');
        return {
          lines: [
            {
              text: t('settings.saveRow', {
                slot: slotName(s.slot),
                summary: slotText(s.result).text,
              }),
            },
            ...(status ? [{ text: status, warn: saves.failed === s.slot }] : []),
          ],
          actions: [{ label, enabled: true, onClick: () => saves.onSave(s.slot) }],
        };
      }),
      row(
        t('settings.mainMenu'),
        t('settings.mainMenu'),
        saves.onMainMenu,
        t('settings.mainMenuDetail'),
      ),
    ],
  };
}

/** What the Settings menu needs to offer saving (state lives in UIScene). */
export interface SaveControls {
  slots: { slot: SlotId; result: LoadResult }[];
  /** Slot waiting for a second click to overwrite. */
  confirming: SlotId | null;
  lastSaved: SlotId | null;
  failed: SlotId | null;
  onSave: (slot: SlotId) => void;
  onMainMenu: () => void;
}
