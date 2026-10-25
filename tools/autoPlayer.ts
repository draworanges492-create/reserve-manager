// An automated player for the whole story (spec §13): used by the playthrough test and by
// `npm run balance:report`. Drives the real GameSession like an attentive player, picking
// dialogue choices by a strategy.
import { GameSession } from '../src/core/GameSession';
import type { GameState } from '../src/core/GameState';
import { speciesPresent } from '../src/story/conditions';
import { fencesBlocking } from '../src/story/StoryManager';
import { visibleClues } from '../src/story/storyCommands';

export type Strategy = (offered: number[], step: number) => number | undefined;
export const strategies = {
  first: (o) => o[0],
  last: (o) => o.at(-1),
  alternate: (o, step) => o[step % o.length],
} satisfies Record<string, Strategy>;
const DAY_MS = 120_000;
const MAX_DAYS = 600;
/** The chapter whose completion ends the run. */
const LAST = 6;

export interface PlayOptions {
  /** Days at the start when the player only talks and otherwise ignores the reserve. */
  carelessDays?: number;
  maxDays?: number;
  /** Called after each day with the session's state. */
  onDay?: (state: GameState) => void;
}

/** Plays from a new game until the last chapter is complete (or `maxDays` pass). */
export function play(start: GameState, strategy: Strategy, opts: PlayOptions = {}): GameState {
  const session = new GameSession(start);
  session.beginStory();
  let step = 0;
  const maxDays = opts.maxDays ?? MAX_DAYS;
  for (let day = 0; day < maxDays && !session.state.flags[`chapter_${LAST}_complete`]; day++) {
    // Finish every queued conversation, picking choices by strategy.
    for (let guard = 0; guard < 500 && session.dialogueView; guard++) {
      const offered = session.dialogueView.choices.map((c) => c.index);
      session.advanceDialogue(strategy(offered, step++));
    }
    if (day < (opts.carelessDays ?? 0)) {
      session.update(DAY_MS);
      opts.onDay?.(session.state);
      continue;
    }
    // An attentive player: mend the gate, keep Waterhole A full, then build, hire, investigate.
    if (session.state.fences.hq_gate?.status === 'broken') {
      session.dispatch({ type: 'repairFence', segmentId: 'hq_gate' });
    }
    while ((session.state.waterholes.waterhole_a?.level ?? 100) < 60) {
      if (!session.dispatch({ type: 'refillWaterhole', id: 'waterhole_a' }).ok) break;
    }
    if (session.state.chapter.current >= 2) {
      for (const clue of visibleClues(session.state))
        session.dispatch({ type: 'examineClue', clueId: clue.id });
      session.dispatch({ type: 'build', slotId: 'pump_a', buildingId: 'borehole_pump' });
      if (!session.state.staff.length) {
        session.dispatch({ type: 'hire', role: 'ranger' });
        const ranger = session.state.staff[0];
        if (ranger) session.dispatch({ type: 'assignStaff', staffId: ranger.id, zoneId: 'plains' });
      }
      if (session.state.resources.money > 300) {
        for (const id of fencesBlocking(session.state, 'river'))
          session.dispatch({ type: 'repairFence', segmentId: id });
      }
    }
    if (session.state.chapter.current >= 3) playChapter3(session);
    if (session.state.chapter.current >= 4) playChapter4(session);
    if (session.state.chapter.current >= 5) playChapter5(session);
    if (session.state.chapter.current >= 6) playChapter6(session);
    // A day passes (if a conversation is waiting it starts instead; the loop above plays it).
    session.update(DAY_MS);
    opts.onDay?.(session.state);
  }
  return session.state;
}

/** Chapter 3: staff for the chosen plan, push the impala target down, mend and guard the border. */
function playChapter3(session: GameSession): void {
  const st = () => session.state;
  if (st().flags.ch3_plan_chosen) {
    const method = st().flags.plan_cull
      ? 'cull'
      : st().flags.plan_relocate
        ? 'relocate'
        : 'contraception';
    const role = method === 'cull' ? 'culling_team' : 'vet';
    if (!st().flags.herd_plan_done && !st().staff.some((s) => s.role === role))
      session.dispatch({ type: 'hire', role });
    const plan = st().herdPlans['plains:impala'];
    if (!st().flags.herd_plan_done && (!plan || plan.target > 70))
      session.dispatch({ type: 'setHerdPlan', zoneId: 'plains', speciesId: 'impala', method });
    // Plan done: the culling team isn't needed any more (a vet stays for Chapter 4).
    const team = st().staff.find((s) => s.role === 'culling_team');
    if (st().flags.herd_plan_done && team)
      session.dispatch({ type: 'dismissStaff', staffId: team.id });
  }
  if (st().flags.ch3_border_chosen) {
    if (st().fences.east_border_w0?.status === 'broken')
      session.dispatch({ type: 'repairFence', segmentId: 'east_border_w0' });
    if (st().flags.border_beehive)
      session.dispatch({ type: 'build', slotId: 'beehive_east', buildingId: 'beehive_fence' });
  }
}

/** Chapter 4: a tower, a vet, bring in giraffe and wildebeest, open the outcrop, spot the leopard. */
function playChapter4(session: GameSession): void {
  const st = () => session.state;
  session.dispatch({ type: 'build', slotId: 'tower_plains', buildingId: 'observation_tower' });
  if (!st().staff.some((s) => s.role === 'vet')) session.dispatch({ type: 'hire', role: 'vet' });
  for (const speciesId of ['wildebeest', 'giraffe'])
    session.dispatch({ type: 'reintroduce', speciesId });
  if (st().resources.money > 100)
    for (const id of fencesBlocking(st(), 'outcrop'))
      session.dispatch({ type: 'repairFence', segmentId: id });
  // An attentive player watching the plains at dusk spots the leopards.
  if ((st().populations.plains?.leopard ?? 0) > 0)
    session.dispatch({ type: 'recordSighting', speciesId: 'leopard' });
}

/** Chapter 5: deepen the boreholes, keep water up, rangers and cameras, open the north. */
function playChapter5(session: GameSession): void {
  const st = () => session.state;
  for (const [id, hole] of Object.entries(st().waterholes)) {
    if (hole.pumpState === 'working') session.dispatch({ type: 'deepenBorehole', waterholeId: id });
    if (st().flags.drought && hole.level < 25 && st().zones[hole.zoneId]?.unlocked)
      session.dispatch({ type: 'truckWater', waterholeId: id });
  }
  for (const slotId of ['camera_north', 'camera_east'])
    session.dispatch({ type: 'build', slotId, buildingId: 'camera_post' });
  const patrolled = ['plains', 'north', 'woodland'].filter((z) => st().zones[z]?.unlocked);
  for (const zoneId of patrolled) {
    if (st().staff.some((s) => s.role === 'ranger' && s.zoneId === zoneId)) continue;
    session.dispatch({ type: 'hire', role: 'ranger' });
    const fresh = st().staff.find((s) => s.role === 'ranger' && s.zoneId === null);
    if (fresh) session.dispatch({ type: 'assignStaff', staffId: fresh.id, zoneId });
  }
  if (st().resources.money > 200)
    for (const id of fencesBlocking(st(), 'north'))
      session.dispatch({ type: 'repairFence', segmentId: id });
}

/** Chapter 6: open every zone, bring back any missing species, guard every zone. */
function playChapter6(session: GameSession): void {
  const st = () => session.state;
  if (st().resources.money > 100)
    for (const zoneId of Object.keys(st().zones))
      for (const id of fencesBlocking(st(), zoneId))
        session.dispatch({ type: 'repairFence', segmentId: id });
  for (const speciesId of [
    'rhino',
    'leopard',
    'lion',
    'elephant',
    'giraffe',
    'wildebeest',
    'hyena',
    'vulture',
    'zebra',
    'impala',
  ])
    session.dispatch({ type: 'reintroduce', speciesId });
  for (const zoneId of ['plains', 'north', 'woodland', 'outcrop', 'east_border', 'river']) {
    if (!st().zones[zoneId]?.unlocked) continue;
    const want = zoneId === 'north' ? 2 : 1;
    // Save up for missing species first, and only hire with a cushion in the bank.
    const missing = Object.values(st().populations).length > 0 && speciesPresent(st()) < 10;
    while (
      !missing &&
      st().resources.money > 1000 &&
      st().staff.filter((m) => m.role === 'ranger' && m.zoneId === zoneId).length < want
    ) {
      if (!session.dispatch({ type: 'hire', role: 'ranger' }).ok) break;
      const fresh = st().staff.find((m) => m.role === 'ranger' && m.zoneId === null);
      if (!fresh) break;
      session.dispatch({ type: 'assignStaff', staffId: fresh.id, zoneId });
    }
  }
}
