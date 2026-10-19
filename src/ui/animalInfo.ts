// Text for the animal hover label and info panel (pure, so it can be tested).
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { speciesDef, zoneDef } from '../core/content';
import { zoneHasWater } from '../sim/Water';

export function populationOf(state: GameState, zoneId: string, speciesId: string): number {
  return Math.round(state.populations[zoneId]?.[speciesId] ?? 0);
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

export interface AnimalPanelText {
  title: string;
  subtitle: string;
  lines: string[];
  critical: boolean;
}

export function animalPanelText(
  state: GameState,
  zoneId: string,
  speciesId: string,
): AnimalPanelText | null {
  const species = speciesDef(speciesId);
  if (!species) return null;
  const count = populationOf(state, zoneId, speciesId);
  const critical = count < species.minViable;
  return {
    title: species.name,
    subtitle: zoneDef(zoneId)?.name ?? zoneId,
    critical,
    lines: [
      t('animal.population', { count }),
      t('animal.diet', { diet: t(`diet.${species.diet}`) }),
      critical ? t('animal.status.critical', { min: species.minViable }) : t('animal.status.ok'),
      zoneHasWater(state, zoneId) ? t('animal.water.yes') : t('animal.water.no'),
    ],
  };
}
