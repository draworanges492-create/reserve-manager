// Content for the journal book (D130): Diary, Field notes, Records and Decisions. Pure, so
// it can be tested; JournalScene lays the entries out on pages.
import epilogueData from '../data/epilogue.json';
import { SPECIES, zoneDef } from '../core/content';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { calendarOf } from '../sim/Seasons';
import { allHold, speciesPresent, totalOf } from '../story/conditions';
import { journalTemplate } from '../story/content';
import { fillText } from '../story/DialogueRunner';
import type { Condition } from '../story/types';

export type JournalTab = 'diary' | 'notes' | 'records' | 'decisions';
export const JOURNAL_TABS: JournalTab[] = ['diary', 'notes', 'records', 'decisions'];

export interface BookEntry {
  /** Stable id, e.g. the diary entry id or `notes:impala` (used to open at a page). */
  key: string;
  title: string;
  /** Small line under the title (date, place). */
  meta?: string;
  body: string[];
  /** Texture key drawn beside the entry (first frame). */
  sprite?: string;
  isNew?: boolean;
  /** Clicking the entry pans the map here (tiles). */
  focus?: { x: number; y: number };
}

export function dateOf(day: number): string {
  const cal = calendarOf(day);
  return t('journal.date', {
    year: cal.year,
    season: t(cal.season === 'dry' ? 'season.dry' : 'season.wet').toLowerCase(),
    day: cal.dayOfSeason,
  });
}

/** Diary: every story and notable-moment entry, oldest first, new ones marked. */
export function diaryEntries(state: GameState): BookEntry[] {
  return state.journal.flatMap((j, i) => {
    const tpl = journalTemplate(j.entryId);
    if (!tpl) return [];
    return [
      {
        key: j.entryId,
        title: tpl.title,
        meta: `${dateOf(j.day)} · ${t('journal.chapterShort', { n: j.chapter })}`,
        body: [fillText(state, tpl.text)],
        isNew: i >= state.journalRead,
        ...(tpl.focus ? { focus: tpl.focus } : {}),
      },
    ];
  });
}

/** Field notes: one page per species; unseen ones stay a mystery. */
export function fieldNoteEntries(state: GameState): BookEntry[] {
  return SPECIES.map((s) => {
    if (!state.encyclopedia.includes(s.id))
      return { key: `notes:${s.id}`, title: t('notes.unseen'), body: [t('notes.unseenHint')] };
    const note = state.fieldNotes[s.id];
    const firstSeen =
      !note || note.day < 0
        ? t('notes.seenBefore')
        : t('notes.firstSeen', {
            date: dateOf(note.day),
            zone: note.zoneId ? (zoneDef(note.zoneId)?.name ?? note.zoneId) : t('notes.somewhere'),
          });
    const now = totalOf(state, s.id);
    const peak = Math.max(now, state.records[`peak_${s.id}`]?.value ?? 0);
    return {
      key: `notes:${s.id}`,
      title: s.name,
      meta: firstSeen,
      sprite: s.spriteKey,
      body: [
        t('notes.count', { now: Math.round(now), peak: Math.round(peak) }),
        t('notes.diet', { diet: t(`diet.${s.diet}`), min: s.minViable }),
        // A bare "TODO: verify" placeholder says nothing yet, so it's left out.
        ...s.facts
          .filter((f) => f.text.trim() !== 'TODO: verify')
          .map((f) => (f.verified ? f.text : t('notes.unverified', { text: f.text }))),
      ],
    };
  });
}

/** Records: the reserve's bests and running totals. */
export function recordEntries(state: GameState): BookEntry[] {
  const rec = (key: string, label: string): string => {
    const r = state.records[key];
    return r
      ? t('records.best', { label, value: r.value, date: dateOf(r.day) })
      : t('records.none', { label });
  };
  const c = (k: string) => state.counters[k] ?? 0;
  return [
    {
      key: 'records:bests',
      title: t('records.bestsTitle'),
      body: [
        rec('ecosystem', t('records.ecosystem')),
        rec('reputation', t('records.reputation')),
        rec('trust', t('records.trust')),
        rec('species', t('records.species')),
        rec('visitorsMonth', t('records.visitorsMonth')),
        rec('money', t('records.money')),
      ],
    },
    {
      key: 'records:totals',
      title: t('records.totalsTitle'),
      body: [
        t('records.days', { n: state.clock.day + 1 }),
        t('records.speciesNow', { n: speciesPresent(state), total: SPECIES.length }),
        t('records.births', { n: c('births') }),
        t('records.visitors', { n: c('visitors') }),
        t('records.poachersCaught', { n: c('poachersCaught') }),
        t('records.poached', { n: c('poached') }),
        t('records.managed', {
          culled: c('culled'),
          relocated: c('relocated'),
          brought: c('reintroduced'),
        }),
        t('records.cropRaids', { n: c('cropRaids') }),
      ],
    },
  ];
}

interface DecisionGroup {
  id: string;
  chapter?: number;
  options: { when: Condition[]; title: string; decision?: string }[];
}

/** Decisions: each big choice made so far. */
export function decisionEntries(state: GameState): BookEntry[] {
  const groups = (epilogueData as { groups: DecisionGroup[] }).groups;
  const entries: BookEntry[] = [];
  for (const g of groups) {
    const option = g.options.find((o) => o.decision && allHold(state, o.when));
    if (!option?.decision) continue;
    entries.push({
      key: `decision:${g.id}`,
      title: option.title,
      meta: g.chapter ? t('journal.chapterShort', { n: g.chapter }) : undefined,
      body: [fillText(state, option.decision)],
    });
  }
  if (!entries.length)
    entries.push({
      key: 'decision:none',
      title: t('decisions.noneTitle'),
      body: [t('decisions.none')],
    });
  return entries;
}

export function tabEntries(state: GameState, tab: JournalTab): BookEntry[] {
  switch (tab) {
    case 'diary':
      return diaryEntries(state);
    case 'notes':
      return fieldNoteEntries(state);
    case 'records':
      return recordEntries(state);
    case 'decisions':
      return decisionEntries(state);
  }
}
