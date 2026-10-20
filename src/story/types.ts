// Shapes of the story content in src/data (spec §9). Shared by the engine, the scenes and
// validate-data, so a typo in JSON is caught before it reaches a player.

/** Conditions (spec §9.1: flag, relationship ≥ x, money ≥ y — plus world checks for goals). */
export type Condition =
  | { op: 'flag'; flag: string; value?: boolean }
  | { op: 'relationship'; character: string; min: number }
  | { op: 'money'; min: number }
  | { op: 'fenceRepaired'; segmentId: string }
  | { op: 'waterholeLevel'; waterholeId: string; min: number }
  | { op: 'buildingWorking'; buildingId: string }
  | { op: 'staffCount'; role: string; min: number }
  | { op: 'goalDone'; goalId: string }
  | { op: 'dayAtLeast'; day: number }
  | { op: 'zoneOpen'; zoneId: string }
  /** A timed goal has held at least `min` days in a row so far. */
  | { op: 'goalStreak'; goalId: string; min: number }
  /** Yesterday's money in exceeded money out. */
  | { op: 'netPositive' }
  /** Phase 10+: land, scores, tallies and pacing. */
  | { op: 'vegetationAtLeast'; zone: string; min: number }
  | { op: 'scoreAtLeast'; score: 'ecosystem' | 'trust' | 'reputation'; min: number }
  | { op: 'counterAtLeast'; counter: string; min: number }
  /** Whole days since the current chapter began. */
  | { op: 'daysInChapter'; min: number }
  /** Species with at least one animal anywhere in the reserve. */
  | { op: 'speciesPresent'; min: number }
  /** Animals of one species across all zones. */
  | { op: 'populationAtLeast'; species: string; min: number }
  | { op: 'not'; condition: Condition };

/**
 * The one effect vocabulary (spec §6.9) used by dialogue choices, events and goals:
 * money, trust, reputation, population, vegetation, setFlag, startDialogue, unlockZone,
 * spawnEvent — plus relationship and journal (DECISIONS D80).
 */
export type Effect =
  | { op: 'money'; value: number }
  | { op: 'trust'; value: number }
  | { op: 'reputation'; value: number }
  | { op: 'population'; species: string; zone: string; value: number }
  | { op: 'vegetation'; zone: string; value: number }
  | { op: 'setFlag'; flag: string; value?: boolean }
  | { op: 'startDialogue'; id: string }
  | { op: 'unlockZone'; zone: string }
  | { op: 'spawnEvent'; id: string }
  | { op: 'relationship'; character: string; value: number }
  | { op: 'journal'; entry: string }
  /** Phase 10+: add to a story tally; knock a fence down (e.g. elephants break through). */
  | { op: 'counter'; counter: string; value: number }
  | { op: 'breakFence'; segmentId: string };

export type Expression = 'neutral' | 'happy' | 'worried' | 'angry';

export interface DialogueChoice {
  text: string;
  next: string | null;
  effects?: Effect[];
  /** Only offered when all hold. */
  conditions?: Condition[];
}

export interface DialogueNode {
  /** Character id, "player" or "narrator". */
  speaker: string;
  portrait?: Expression;
  text: string;
  /** Applied when the node is shown. */
  effects?: Effect[];
  /** First branch whose conditions hold decides where to go; otherwise `next`. */
  branch?: { conditions: Condition[]; next: string | null }[];
  next?: string | null;
  choices?: DialogueChoice[];
  /** Presentation hint: pan the camera here (tiles) while this line shows. */
  focus?: { x: number; y: number };
}

export interface Dialogue {
  id: string;
  nodes: Record<string, DialogueNode>;
}

export interface Character {
  id: string;
  name: string;
  /** Spritesheet with 4 frames: neutral, happy, worried, angry. */
  portraitKey: string;
  role: string;
}

export interface Goal {
  id: string;
  /** Shown in the tracker; `{n}` and `{days}` fill in streak progress. */
  text: string;
  conditions: Condition[];
  /** If set, the conditions must hold this many day ticks in a row. */
  days?: number;
  /** Tracker shows how many of these flags are set, e.g. clues found ({found}/{total}). */
  counter?: { flags: string[] };
}

export interface ScriptedEvent {
  id: string;
  /** Fires once, the first time all hold (checked after every action and day). */
  when: Condition[];
  dialogue: string;
}

export interface Clue {
  id: string;
  /** Tile position of the clickable marker. */
  at: { x: number; y: number };
  dialogue: string;
  /** Set when examined; goals and dialogue check it. */
  flag: string;
  /** Marker shows only while these hold. */
  visibleWhen: Condition[];
}

export interface Chapter {
  id: number;
  title: string;
  introDialogue: string;
  goals: Goal[];
  /** Zones, buildings and staff that open in this chapter (also in each item's unlockChapter). */
  unlocks: { zones: string[]; buildings: string[]; staff: string[] };
  scriptedEvents: ScriptedEvent[];
  clues: Clue[];
  completionDialogue: string;
}

export interface JournalTemplate {
  id: string;
  chapter: number;
  title: string;
  /** May use {player}. */
  text: string;
}
