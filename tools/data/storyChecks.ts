// Story content checks (spec §2 validate-data, §9.1: "must catch dangling references").
import type {
  Chapter,
  Character,
  Condition,
  Dialogue,
  Effect,
  JournalTemplate,
} from '../../src/story/types';

export interface StoryContent {
  dialogues: Dialogue[];
  chapters: Chapter[];
  characters: Character[];
  journal: JournalTemplate[];
}

/** Ids from the rest of the game that story content may point at. */
export interface StoryRefs {
  zones: {
    id: string;
    unlockChapter: number;
    rect?: { x: number; y: number; w: number; h: number };
  }[];
  species: string[];
  buildings: { id: string; unlockChapter: number }[];
  staffRoles: { id: string; unlockChapter: number }[];
  waterholes: string[];
  fences: string[];
  /** Events in events.json (none yet). */
  events: string[];
}

const EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry'];
const FIXED_SPEAKERS = ['player', 'narrator'];

export function checkStory(content: StoryContent, refs: StoryRefs): string[] {
  const errors: string[] = [];
  const fail = (where: string, msg: string): void => {
    errors.push(`${where}: ${msg}`);
  };
  const dialogueIds = content.dialogues.map((d) => d.id);
  const characterIds = content.characters.map((c) => c.id);
  const journalIds = content.journal.map((j) => j.id);
  const goalIds = content.chapters.flatMap((c) => c.goals.map((g) => g.id));
  const zoneIds = refs.zones.map((z) => z.id);
  const dup = (ids: string[], what: string): void => {
    for (const id of ids.filter((x, i) => ids.indexOf(x) !== i)) fail(what, `duplicate id "${id}"`);
  };
  dup(dialogueIds, 'dialogue');
  dup(characterIds, 'characters.json');
  dup(journalIds, 'journal.json');
  dup(goalIds, 'chapters.json goals');

  const checkCondition = (where: string, c: Condition): void => {
    switch (c.op) {
      case 'flag':
      case 'money':
      case 'dayAtLeast':
      case 'netPositive':
        return;
      case 'relationship':
        if (!characterIds.includes(c.character)) fail(where, `unknown character "${c.character}"`);
        return;
      case 'fenceRepaired':
        if (!refs.fences.includes(c.segmentId)) fail(where, `unknown fence "${c.segmentId}"`);
        return;
      case 'waterholeLevel':
        if (!refs.waterholes.includes(c.waterholeId))
          fail(where, `unknown waterhole "${c.waterholeId}"`);
        return;
      case 'buildingWorking':
        if (!refs.buildings.some((b) => b.id === c.buildingId))
          fail(where, `unknown building "${c.buildingId}"`);
        return;
      case 'staffCount':
        if (!refs.staffRoles.some((r) => r.id === c.role))
          fail(where, `unknown staff role "${c.role}"`);
        return;
      case 'goalDone':
      case 'goalStreak':
        if (!goalIds.includes(c.goalId)) fail(where, `unknown goal "${c.goalId}"`);
        return;
      case 'zoneOpen':
        if (!zoneIds.includes(c.zoneId)) fail(where, `unknown zone "${c.zoneId}"`);
        return;
      case 'not':
        checkCondition(where, c.condition);
        return;
      default:
        fail(where, `unknown condition op "${(c as { op: string }).op}"`);
    }
  };

  const checkEffect = (where: string, e: Effect): void => {
    switch (e.op) {
      case 'money':
      case 'trust':
      case 'reputation':
      case 'setFlag':
        return;
      case 'population':
        if (!refs.species.includes(e.species)) fail(where, `unknown species "${e.species}"`);
        if (!zoneIds.includes(e.zone)) fail(where, `unknown zone "${e.zone}"`);
        return;
      case 'vegetation':
      case 'unlockZone': {
        const zone = e.op === 'vegetation' ? e.zone : e.zone;
        if (!zoneIds.includes(zone)) fail(where, `unknown zone "${zone}"`);
        return;
      }
      case 'startDialogue':
        if (!dialogueIds.includes(e.id))
          fail(where, `startDialogue points at missing dialogue "${e.id}"`);
        return;
      case 'spawnEvent':
        if (!refs.events.includes(e.id))
          fail(where, `spawnEvent points at missing event "${e.id}"`);
        return;
      case 'relationship':
        if (!characterIds.includes(e.character)) fail(where, `unknown character "${e.character}"`);
        return;
      case 'journal':
        if (!journalIds.includes(e.entry))
          fail(where, `journal points at missing entry "${e.entry}"`);
        return;
      default:
        fail(where, `unknown effect op "${(e as { op: string }).op}"`);
    }
  };

  // Dialogue graphs: every link resolves, nothing is unreachable.
  for (const d of content.dialogues) {
    const where = `dialogue "${d.id}"`;
    const nodes = d.nodes;
    if (!nodes.start) fail(where, 'has no "start" node');
    const links = (id: string): (string | null | undefined)[] => {
      const n = nodes[id];
      if (!n) return [];
      return [
        n.next,
        ...(n.choices ?? []).map((c) => c.next),
        ...(n.branch ?? []).map((b) => b.next),
      ];
    };
    for (const [id, n] of Object.entries(nodes)) {
      const at = `${where} node "${id}"`;
      for (const target of links(id)) {
        if (target !== null && target !== undefined && !nodes[target])
          fail(at, `links to missing node "${target}"`);
      }
      if (n.next === undefined && !n.choices?.length)
        fail(at, 'needs "next" (use null to end) or choices');
      if (!n.text && !n.branch) fail(at, 'has no text');
      if (!FIXED_SPEAKERS.includes(n.speaker) && !characterIds.includes(n.speaker))
        fail(at, `unknown speaker "${n.speaker}"`);
      if (n.portrait && !EXPRESSIONS.includes(n.portrait))
        fail(at, `unknown portrait "${n.portrait}"`);
      for (const e of n.effects ?? []) checkEffect(at, e);
      for (const c of n.choices ?? []) {
        for (const e of c.effects ?? []) checkEffect(at, e);
        for (const cond of c.conditions ?? []) checkCondition(at, cond);
      }
      for (const b of n.branch ?? []) for (const cond of b.conditions) checkCondition(at, cond);
    }
    const reached = new Set<string>(['start']);
    const stack = ['start'];
    while (stack.length) {
      const id = stack.pop() as string;
      for (const target of links(id)) {
        if (target && nodes[target] && !reached.has(target)) {
          reached.add(target);
          stack.push(target);
        }
      }
    }
    for (const id of Object.keys(nodes))
      if (!reached.has(id)) fail(where, `node "${id}" can never be reached`);
  }

  // Chapters.
  const ids = content.chapters.map((c) => c.id);
  ids.forEach((id, i) => {
    if (id !== i + 1)
      fail('chapters.json', `chapters must be numbered 1, 2, 3… in order (found ${id})`);
  });
  for (const ch of content.chapters) {
    const where = `chapter ${ch.id}`;
    for (const d of [
      ch.introDialogue,
      ch.completionDialogue,
      ...ch.scriptedEvents.map((s) => s.dialogue),
      ...ch.clues.map((c) => c.dialogue),
    ]) {
      if (!dialogueIds.includes(d)) fail(where, `points at missing dialogue "${d}"`);
    }
    for (const g of ch.goals)
      for (const c of g.conditions) checkCondition(`${where} goal "${g.id}"`, c);
    for (const s of ch.scriptedEvents)
      for (const c of s.when) checkCondition(`${where} event "${s.id}"`, c);
    // Unlock lists must agree with each item's own unlockChapter.
    const listed = (
      items: { id: string; unlockChapter: number }[],
      names: string[],
      what: string,
    ): void => {
      for (const n of names) {
        const item = items.find((i) => i.id === n);
        if (!item) fail(where, `unlocks unknown ${what} "${n}"`);
        else if (item.unlockChapter !== ch.id)
          fail(where, `unlocks ${what} "${n}", but its unlockChapter is ${item.unlockChapter}`);
      }
    };
    listed(refs.zones, ch.unlocks.zones, 'zone');
    listed(refs.buildings, ch.unlocks.buildings, 'building');
    listed(refs.staffRoles, ch.unlocks.staff, 'staff role');
    for (const clue of ch.clues) {
      const zone = refs.zones.find(
        (z) =>
          z.rect &&
          clue.at.x >= z.rect.x &&
          clue.at.y >= z.rect.y &&
          clue.at.x < z.rect.x + z.rect.w &&
          clue.at.y < z.rect.y + z.rect.h,
      );
      if (!zone) fail(where, `clue "${clue.id}" is outside every zone`);
      else if (zone.unlockChapter > ch.id)
        fail(where, `clue "${clue.id}" sits in "${zone.id}", which isn't open yet`);
      for (const c of clue.visibleWhen) checkCondition(`${where} clue "${clue.id}"`, c);
    }
  }

  for (const j of content.journal) {
    if (!ids.includes(j.chapter))
      fail('journal.json', `"${j.id}" belongs to unknown chapter ${j.chapter}`);
  }
  return errors;
}
