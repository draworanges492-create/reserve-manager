// Text for herd hover labels and the info panel (pure, so it can be tested).
import { BALANCE } from '../config/balance';
import type { Command } from '../core/Commands';
import { SPECIES, speciesDef, staffRole, zoneDef } from '../core/content';
import type { HerdMethod } from '../core/GameState';
import { dailyRemoval, planKey, planStaff } from '../sim/HerdPlans';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { seasonOf } from '../sim/Seasons';
import { isDegraded, vegetationBreakdown } from '../sim/Vegetation';
import { rangerCoverage } from '../sim/Poaching';
import { fencesBlocking } from '../story/StoryManager';
import { zoneHasWater } from '../sim/Water';

/** One line of panel text; `warn` lines are drawn in the warning colour. */
export interface PanelLine {
  text: string;
  warn?: boolean;
}

export interface PanelContent {
  title: string;
  subtitle: string;
  subtitleWarn?: boolean;
  /** Texture key for the portrait (first frame), if any. */
  portrait?: string;
  lines: PanelLine[];
  /** Buttons along the bottom (e.g. "Cancel construction"). */
  actions?: { label: string; onClick: () => void }[];
}

/** Over capacity by more than this share counts as "more than the land can feed". */
const OVER_CAPACITY_MARGIN = 1.05;

export function populationOf(state: GameState, zoneId: string, speciesId: string): number {
  return Math.round(state.populations[zoneId]?.[speciesId] ?? 0);
}

function signedCount(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0';
}

/** "80 impala", "1 lion" — counts in running text. */
function countOf(n: number, speciesId: string): string {
  const s = speciesDef(speciesId);
  if (!s) return `${n}`;
  return `${n} ${n === 1 ? s.name.toLowerCase() : s.plural}`;
}

export function animalHoverLines(state: GameState, zoneId: string, speciesId: string): string[] {
  const species = speciesDef(speciesId);
  if (!species) return [];
  return [
    t('animal.hover', {
      name: species.name,
      count: populationOf(state, zoneId, speciesId),
      zone: zoneDef(zoneId)?.name ?? zoneId,
    }),
    t('animal.hoverHint'),
  ];
}

export function animalPanelContent(
  state: GameState,
  zoneId: string,
  speciesId: string,
  /** When given, the panel offers herd-plan buttons (Chapter 3+). */
  dispatch?: (command: Command) => unknown,
): PanelContent | null {
  const species = speciesDef(speciesId);
  if (!species) return null;
  const count = populationOf(state, zoneId, speciesId);
  const log = state.populationLog[zoneId]?.[speciesId];
  const lines: PanelLine[] = [];

  // Spec §6.3: always show *why* the number changed.
  if (log) {
    const eaten = Object.values(log.eatenBy).reduce((a, b) => a + b, 0);
    lines.push({
      text: t('animal.population', {
        count,
        change: signedCount(log.births - log.starved - eaten - (log.removed ?? 0)),
      }),
    });
    const parts: string[] = [];
    if (log.births) parts.push(t('animal.born', { n: log.births }));
    if (log.starved) parts.push(t('animal.starved', { n: log.starved }));
    if (log.removed) parts.push(t('animal.removed', { n: log.removed }));
    for (const [predatorId, n] of Object.entries(log.eatenBy)) {
      if (n)
        parts.push(
          t('animal.eaten', { n, predators: speciesDef(predatorId)?.plural ?? predatorId }),
        );
    }
    lines.push({
      text: parts.length
        ? t('animal.yesterday', { parts: parts.join(' · ') })
        : t('animal.noChange'),
    });
  } else {
    lines.push({ text: t('animal.populationNew', { count }) });
  }

  const capacity = Math.round(log?.capacity ?? 0);
  if (log) {
    if (species.diet === 'predator') {
      lines.push({ text: t('animal.capacity.predator', { k: capacity }) });
    } else if (species.diet === 'scavenger') {
      lines.push({ text: t('animal.capacity.scavenger', { k: capacity }) });
    } else {
      const water = zoneHasWater(state, zoneId) ? t('animal.water.near') : t('animal.water.none');
      const veg = Math.round(state.zones[zoneId]?.vegetation ?? 0);
      lines.push({ text: t('animal.capacity.herbivore', { k: capacity, veg, water }) });
    }
    if (count > capacity * OVER_CAPACITY_MARGIN)
      lines.push({ text: t('animal.overCapacity'), warn: true });
  }

  lines.push({ text: t('animal.diet', { diet: t(`diet.${species.diet}`) }) });
  if (count < species.minViable) {
    lines.push({ text: t('animal.status.critical', { min: species.minViable }), warn: true });
  } else if (
    log &&
    log.births > log.starved + Object.values(log.eatenBy).reduce((a, b) => a + b, 0)
  ) {
    lines.push({ text: t('animal.status.growing') });
  } else if (log && count > 0 && count > capacity * OVER_CAPACITY_MARGIN) {
    lines.push({ text: t('animal.status.declining') });
  } else {
    lines.push({ text: t('animal.status.stable') });
  }

  const herd = herdPlanSection(state, zoneId, speciesId, dispatch);
  return {
    title: species.name,
    subtitle: zoneDef(zoneId)?.name ?? zoneId,
    portrait: species.spriteKey,
    lines: [...lines, ...herd.lines],
    ...(herd.actions.length ? { actions: herd.actions } : {}),
  };
}

/** Spec §6.4: the herd's management plan, and buttons to change it (Chapter 3+). */
function herdPlanSection(
  state: GameState,
  zoneId: string,
  speciesId: string,
  dispatch?: (command: Command) => unknown,
): { lines: PanelLine[]; actions: NonNullable<PanelContent['actions']> } {
  if (state.chapter.current < BALANCE.herds.unlockChapter) return { lines: [], actions: [] };
  const plan = state.herdPlans[planKey(zoneId, speciesId)];
  const lines: PanelLine[] = [];
  if (plan) {
    const staff = planStaff(state, plan);
    lines.push({ text: t(`herd.plan.${plan.method}`, { target: plan.target }) });
    if (!staff.has)
      lines.push({
        text: t('herd.needsStaff', { role: staffRole(staff.role)?.name ?? staff.role }),
        warn: true,
      });
    else if (plan.method !== 'contraception') {
      const n = populationOf(state, zoneId, speciesId);
      lines.push({ text: t('herd.pace', { n: dailyRemoval(state, plan, n) }) });
    }
  } else {
    lines.push({ text: t('herd.noPlan') });
  }
  if (!dispatch) return { lines, actions: [] };
  const set = (method: HerdMethod) => () =>
    dispatch({ type: 'setHerdPlan', zoneId, speciesId, method });
  const step = BALANCE.herds.stepSize;
  const actions: NonNullable<PanelContent['actions']> = [
    { label: t('herd.cull', { n: step }), onClick: set('cull') },
    { label: t('herd.relocate', { n: step }), onClick: set('relocate') },
    { label: t('herd.contraception'), onClick: set('contraception') },
  ];
  if (plan)
    actions.push({
      label: t('herd.stop'),
      onClick: () => dispatch({ type: 'cancelHerdPlan', zoneId, speciesId }),
    });
  return { lines, actions };
}

export function zonePanelContent(state: GameState, zoneId: string): PanelContent | null {
  const def = zoneDef(zoneId);
  const zone = state.zones[zoneId];
  if (!def || !zone) return null;
  const veg = Math.round(zone.vegetation);
  const degraded = isDegraded(zone.vegetation);
  const lines: PanelLine[] = [];
  if (!zone.unlocked) {
    const blocking = fencesBlocking(state, zoneId).length;
    lines.push({
      text:
        def.unlockChapter <= state.chapter.current && blocking
          ? t('zone.fencesToOpen', { n: blocking })
          : t('zone.lockedLine', { chapter: def.unlockChapter }),
      warn: true,
    });
  }

  const why = vegetationBreakdown(state, zoneId);
  const season = seasonOf(state.clock.day);
  lines.push({
    text: t('zone.grass', {
      regrowth: why.regrowth.toFixed(1),
      grazing: why.grazing.toFixed(1),
      season: t(season === 'dry' ? 'season.dry' : 'season.wet'),
    }),
  });
  lines.push({ text: zoneHasWater(state, zoneId) ? t('zone.water.yes') : t('zone.water.no') });
  if (zone.unlocked)
    lines.push({
      text: t('zone.coverage', { pct: Math.round(rangerCoverage(state, zoneId) * 100) }),
    });

  const herd = state.populations[zoneId] ?? {};
  const animals = SPECIES.filter((s) => (herd[s.id] ?? 0) > 0).map((s) =>
    countOf(Math.round(herd[s.id] ?? 0), s.id),
  );
  lines.push({
    text: animals.length ? t('zone.animals', { list: animals.join(' · ') }) : t('zone.noAnimals'),
  });
  if (degraded) lines.push({ text: t('zone.degradedWarning'), warn: true });

  return {
    title: def.name,
    subtitle: t('zone.subtitle', {
      veg,
      state: t(degraded ? 'zone.state.degraded' : 'zone.state.healthy'),
    }),
    subtitleWarn: degraded,
    lines,
  };
}
