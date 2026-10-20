// Spec Phase 7 / Phase 10 acceptance: a new player can play from the start to the end of
// the last written chapter with no dead ends. Drives the real GameSession like an attentive player, trying
// different dialogue choices on each run.
import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/core/GameSession';
import type { GameState } from '../../src/core/GameState';
import { fencesBlocking } from '../../src/story/StoryManager';
import { visibleClues } from '../../src/story/storyCommands';
import { newGame } from '../helpers/newGame';

type Strategy = (offered: number[], step: number) => number | undefined;
const strategies: Record<string, Strategy> = {
  first: (o) => o[0],
  last: (o) => o.at(-1),
  alternate: (o, step) => o[step % o.length],
};
const DAY_MS = 120_000;
const MAX_DAYS = 400;
/** The chapter whose completion ends the run. */
const LAST = 5;

function play(strategy: Strategy): GameState {
  const session = new GameSession({ ...newGame(7), playerName: 'Sam' });
  session.beginStory();
  let step = 0;
  for (let day = 0; day < MAX_DAYS && !session.state.flags[`chapter_${LAST}_complete`]; day++) {
    // Finish every queued conversation, picking choices by strategy.
    for (let guard = 0; guard < 500 && session.dialogueView; guard++) {
      const offered = session.dialogueView.choices.map((c) => c.index);
      session.advanceDialogue(strategy(offered, step++));
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
    // A day passes (if a conversation is waiting it starts instead; the loop above plays it).
    session.update(DAY_MS);
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

function summary(state: GameState): string {
  return JSON.stringify({
    chapter: state.chapter.current,
    day: state.clock.day,
    flags: Object.keys(state.flags).filter((k) => state.flags[k]),
    plains: state.populations.plains,
    veg: state.zones.plains?.vegetation,
    trust: state.scores.trust,
    plans: state.herdPlans,
    visitors: state.tourism.visitorsHistory.reduce((a, b) => a + b, 0),
    species: Object.keys(state.populations.plains ?? {}).length,
    rep: state.scores.reputation,
    counters: state.counters,
    staff: state.staff.map((m) => `${m.role}@${m.zoneId ?? '-'}`),
    goalsDone: state.story.goalsDone,
    streaks: state.story.goalStreaks,
    pending: state.story.pendingDialogues,
    money: state.resources.money,
  });
}

describe('playthrough: start to end of the last written chapter (Phase 7/10 acceptance)', () => {
  for (const [name, strategy] of Object.entries(strategies)) {
    it(`completes with "${name}" dialogue choices`, () => {
      const state = play(strategy);
      expect(state.flags.chapter_1_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_2_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_3_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_4_complete, summary(state)).toBe(true);
      expect(state.flags.chapter_5_complete, summary(state)).toBe(true);
      expect(state.flags.hale_resolved).toBe(true);
      expect(state.flags.ch2_mystery_solved).toBe(true);
      // Nothing left waiting: every scene that was queued got played.
      expect(state.story.pendingDialogues).toEqual([]);
      // The story left a trail in the journal. (Opening the river is optional in
      // Chapter 2; StoryManager.test covers it.)
      expect(state.journal.map((j) => j.entryId)).toEqual(
        expect.arrayContaining([
          'chapter_1_start',
          'gate_mended',
          'first_drink',
          'mystery',
          'pump_running',
          'chapter_2_end',
          'ch3_wanjiru',
          'ch3_plan',
          'ch3_border',
          'chapter_3_end',
          'ch4_victor',
          'ch4_kito',
          'ch4_rhino',
          'chapter_4_end',
          'ch5_kito',
          'ch5_hale',
          'chapter_5_end',
        ]),
      );
    });
  }
});
