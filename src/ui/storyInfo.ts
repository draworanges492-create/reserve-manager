// Text for the goal tracker, journal, fences and clues (pure, so it can be tested).
import { BALANCE } from '../config/balance';
import { fenceRepairable } from '../core/buildCommands';
import { zoneDef } from '../core/content';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { chapterDef, journalTemplate } from '../story/content';
import { fillText } from '../story/DialogueRunner';
import { goalProgress } from '../story/StoryManager';
import type { Goal } from '../story/types';
import type { SideContent } from './SidePanel';

export function goalText(state: GameState, goal: Goal): string {
  const progress = goalProgress(state, goal);
  const flags = goal.counter?.flags ?? [];
  return goal.text
    .replace('{n}', String(Math.min(progress.days, goal.days ?? 0)))
    .replace('{days}', String(goal.days ?? 0))
    .replace('{found}', String(flags.filter((f) => state.flags[f]).length))
    .replace('{total}', String(flags.length));
}

export interface TrackerContent {
  title: string;
  goals: { text: string; done: boolean }[];
}

export function trackerContent(state: GameState): TrackerContent {
  const chapter = chapterDef(state.chapter.current);
  if (state.flags.game_complete) return { title: t('story.legacy'), goals: [] };
  if (!chapter || state.flags.story_paused) return { title: t('story.freePlay'), goals: [] };
  return {
    title: t('story.chapter', { n: chapter.id, title: chapter.title }),
    goals: chapter.goals.map((g) => ({
      text: goalText(state, g),
      done: goalProgress(state, g).done,
    })),
  };
}

export function fenceTooltip(state: GameState, segmentId: string): string[] {
  const fence = state.fences[segmentId];
  if (!fence) return [];
  if (fence.status === 'repairing') return [t('fence.repairing')];
  if (fence.status === 'intact') return [t('fence.intact')];
  if (!fenceRepairable(state, segmentId)) return [t('fence.notYet')];
  const lines = [
    t('fence.broken', { cost: BALANCE.fences.repairCost, days: BALANCE.fences.repairDays }),
  ];
  if (!state.zones[fence.zoneId]?.unlocked) {
    lines.push(t('fence.opens', { zone: zoneDef(fence.zoneId)?.name ?? fence.zoneId }));
  }
  return lines;
}

export type JournalFilter = 'all' | number;

export function journalMenu(
  state: GameState,
  filter: JournalFilter,
  onFilter: (f: JournalFilter) => void,
): SideContent {
  const chapters = [...new Set(state.journal.map((j) => j.chapter))].sort((a, b) => a - b);
  const cycle: JournalFilter[] = ['all', ...chapters];
  const next = cycle[(cycle.indexOf(filter) + 1) % cycle.length] ?? 'all';
  const label =
    filter === 'all' ? t('journal.filterAll') : t('journal.filterChapter', { n: filter });
  const entries = state.journal
    .filter((j) => filter === 'all' || j.chapter === filter)
    .slice()
    .reverse() // newest first
    .flatMap((j) => {
      const tpl = journalTemplate(j.entryId);
      return tpl
        ? [
            {
              lines: [
                { text: t('journal.entry', { day: j.day + 1, title: tpl.title }) },
                { text: fillText(state, tpl.text) },
              ],
              actions: [],
            },
          ]
        : [];
    });
  return {
    title: t('journal.title'),
    intro: entries.length ? [] : [{ text: t('journal.empty') }],
    rows: [
      {
        lines: [{ text: t('journal.showing') }],
        actions: [{ label, enabled: cycle.length > 1, onClick: () => onFilter(next) }],
      },
      ...entries,
    ],
  };
}
