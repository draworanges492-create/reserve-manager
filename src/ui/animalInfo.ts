// Text for herd hover labels and the info panel (pure, so it can be tested).
import { SPECIES, speciesDef, zoneDef } from '../core/content';
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
        change: signedCount(log.births - log.starved - eaten),
      }),
    });
    const parts: string[] = [];
    if (log.births) parts.push(t('animal.born', { n: log.births }));
    if (log.starved) parts.push(t('animal.starved', { n: log.starved }));
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

  return {
    title: species.name,
    subtitle: zoneDef(zoneId)?.name ?? zoneId,
    portrait: species.spriteKey,
    lines,
  };
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
