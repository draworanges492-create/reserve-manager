// Which game moments make which sound (spec §11).
import { eventBus } from '../core/EventBus';
import type { GameState } from '../core/GameState';
import { audio } from './AudioManager';
import { trackForChapter } from './music';

/** Night ambience between these points of the day (matches the time-of-day tint). */
const NIGHT_FROM = 0.82;
const NIGHT_UNTIL = 0.08;

/** Subscribe sound effects to game events; returns the unsubscribe function. */
export function bindGameAudio(): () => void {
  const offs = [
    eventBus.on('waterholeRefilled', () => audio.sfx('splash')),
    eventBus.on('constructionStarted', () => audio.sfx('build')),
    eventBus.on('buildingCompleted', () => audio.sfx('build')),
    eventBus.on('fenceRepairStarted', () => audio.sfx('build')),
    eventBus.on('staffHired', () => audio.sfx('coin')),
    eventBus.on('goalCompleted', () => audio.sfx('coin')),
    eventBus.on('journalAdded', () => audio.sfx('page')),
    eventBus.on('debtChanged', ({ inDebt }) => inDebt && audio.sfx('alert')),
    eventBus.on('populationCritical', () => audio.sfx('alert')),
    eventBus.on('staffQuit', () => audio.sfx('alert')),
  ];
  return () => offs.forEach((off) => off());
}

/** Music follows the chapter; ambience follows the time of day. Call every frame. */
export function updateGameAudio(state: GameState): void {
  audio.setMusic(trackForChapter(state.chapter.current));
  const p = state.clock.dayProgress;
  audio.setAmbience(p >= NIGHT_FROM || p < NIGHT_UNTIL ? 'night' : 'day');
}
