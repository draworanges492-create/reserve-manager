// Story content from src/data, typed. Add a chapter's dialogue file to DIALOGUE_FILES.
import chaptersData from '../data/chapters.json';
import charactersData from '../data/characters.json';
import ch01 from '../data/dialogue/ch01.json';
import ch02 from '../data/dialogue/ch02.json';
import ch03 from '../data/dialogue/ch03.json';
import ch04 from '../data/dialogue/ch04.json';
import ch05 from '../data/dialogue/ch05.json';
import ch06 from '../data/dialogue/ch06.json';
import journalData from '../data/journal.json';
import type { Chapter, Character, Dialogue, JournalTemplate } from './types';

const DIALOGUE_FILES: { dialogues: unknown[] }[] = [ch01, ch02, ch03, ch04, ch05, ch06];

export const DIALOGUES: readonly Dialogue[] = DIALOGUE_FILES.flatMap(
  (f) => f.dialogues as Dialogue[],
);
export const CHAPTERS: readonly Chapter[] = chaptersData.chapters as Chapter[];
export const CHARACTERS: readonly Character[] = charactersData.characters as Character[];
export const JOURNAL: readonly JournalTemplate[] = journalData.entries as JournalTemplate[];

export function dialogueById(id: string): Dialogue | undefined {
  return DIALOGUES.find((d) => d.id === id);
}

export function chapterDef(id: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function characterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export function journalTemplate(id: string): JournalTemplate | undefined {
  return JOURNAL.find((j) => j.id === id);
}
