// The ending (spec §9.3) and epilogue slides, chosen from scores, money and story flags.
// Pure, so it can be tested; EpilogueScene shows the result (DECISIONS D126).
import epilogueData from '../data/epilogue.json';
import type { GameState } from '../core/GameState';
import { allHold } from './conditions';
import { fillText } from './DialogueRunner';
import type { Condition } from './types';

export type EndingId = 'thriving' | 'profitable' | 'fortress';

interface Slide {
  title: string;
  text: string;
}
interface Option extends Slide {
  when: Condition[];
}
interface EpilogueData {
  groups: { id: string; options: Option[] }[];
  endings: Record<EndingId, Slide>;
  credits: Slide;
}

const DATA = epilogueData as EpilogueData;

/**
 * How well the reserve fits each ending, 0–3ish. The best fit wins (ties: thriving):
 * thriving rewards health and trust and is hurt by Hale's deal; profitable rewards
 * reputation, money and the deal; fortress rewards health with low trust and the lock-down.
 */
export function endingScores(state: GameState): Record<EndingId, number> {
  const E = state.scores.ecosystem / 100;
  const T = state.scores.trust / 100;
  const R = state.scores.reputation / 100;
  const money = Math.min(1, Math.max(0, state.resources.money) / 10000);
  const deal = state.flags.hale_deal ? 1 : 0;
  const lock = state.flags.hale_lockdown ? 1 : 0;
  return {
    thriving: E + T + (deal ? -1 : 0.3) - 0.3 * lock,
    profitable: R + money + deal - T / 2,
    fortress: E + (1 - T) + lock,
  };
}

export function chooseEnding(state: GameState): EndingId {
  const s = endingScores(state);
  const order: EndingId[] = ['thriving', 'profitable', 'fortress'];
  return order.reduce((best, id) => (s[id] > s[best] ? id : best), order[0] ?? 'thriving');
}

/** One slide per major decision (first matching option of each group), then the ending, then credits. */
export function epilogueSlides(state: GameState, ending: EndingId): Slide[] {
  const slides: Slide[] = [];
  for (const group of DATA.groups) {
    const option = group.options.find((o) => allHold(state, o.when));
    if (option) slides.push({ title: option.title, text: option.text });
  }
  slides.push(DATA.endings[ending], DATA.credits);
  return slides.map((s) => ({ title: s.title, text: fillText(state, s.text) }));
}

export function endingOf(state: GameState): EndingId | null {
  const id = (['thriving', 'profitable', 'fortress'] as const).find(
    (e) => state.flags[`ending_${e}`],
  );
  return id ?? null;
}
