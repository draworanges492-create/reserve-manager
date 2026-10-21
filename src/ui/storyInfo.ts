// Text for the goal tracker, fences and clues (pure, so it can be tested).
import { BALANCE } from '../config/balance';
import { fenceRepairable } from '../core/buildCommands';
import { zoneDef } from '../core/content';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { chapterDef } from '../story/content';
import { goalProgress } from '../story/StoryManager';
import type { Goal } from '../story/types';

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
