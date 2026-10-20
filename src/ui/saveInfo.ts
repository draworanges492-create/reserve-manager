// Describing save slots for the menu and Settings (pure, so it can be tested).
import type { LoadResult, SaveSummary, SlotId } from '../core/Save';
import { t } from '../core/text';

export function slotName(slot: SlotId): string {
  return slot === 'auto' ? t('save.slot.auto') : t('save.slot.n', { n: slot });
}

export function playTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m >= 60
    ? t('save.time.hours', { h: Math.floor(m / 60), m: m % 60 })
    : t('save.time.minutes', { m });
}

export function summaryText(s: SaveSummary): string {
  return t('save.summary', {
    name: s.playerName || '—',
    chapter: s.chapter,
    // Day of the season-year calendar the player sees ("Day 12/30" style counts from 1).
    day: s.day + 1,
    money: s.money,
    time: playTime(s.playTimeSeconds),
  });
}

/** One line describing what's in a slot (or why it can't be loaded). */
export function slotText(result: LoadResult): {
  text: string;
  loadable: boolean;
  deletable: boolean;
} {
  if (result.ok) return { text: summaryText(result.summary), loadable: true, deletable: true };
  if (result.error === 'empty') return { text: t('save.empty'), loadable: false, deletable: false };
  return { text: t(`save.error.${result.error}`), loadable: false, deletable: true };
}

export function savedAtText(s: SaveSummary, locale?: string): string {
  if (!s.savedAt) return '';
  const when = new Date(s.savedAt).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return t('save.savedAt', { when });
}
