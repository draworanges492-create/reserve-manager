// Builds the "why" tooltip for a waterhole (spec §6.1: tooltip explains decay).
import { BALANCE } from '../config/balance';
import { waterholeDef } from '../core/content';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { seasonOf } from '../sim/Seasons';
import { droughtFor, waterBreakdown, waterVisualState } from '../sim/Water';

/** "+3", "−8", "0" (true minus sign for legibility). */
export function signed(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${Math.abs(rounded)}`;
  return '0';
}

export function waterholeTooltip(state: GameState, id: string): string[] {
  const hole = state.waterholes[id];
  if (!hole) return [];
  const season = seasonOf(state.clock.day);
  const drought = droughtFor(state, id);
  const why = waterBreakdown(hole, season, BALANCE.water, drought);
  const level = Math.round(hole.level);
  const lines = [
    t('water.title', {
      name: waterholeDef(id)?.name ?? id,
      state: t(`water.state.${waterVisualState(hole.level)}`),
      level,
    }),
    t('water.evaporation', {
      value: signed(why.evaporation),
      season: t(season === 'dry' ? 'season.dry' : 'season.wet'),
      mult: why.seasonMult,
    }),
  ];
  if (why.rain) lines.push(t('water.rain', { value: signed(why.rain) }));
  if (why.pump) lines.push(t('water.pump', { value: signed(why.pump) }));
  if (drought.active) lines.push(t(drought.deepened ? 'water.droughtDeepened' : 'water.drought'));
  lines.push(t('water.net', { value: signed(why.net) }));

  const dryBelow = BALANCE.water.stateThresholds.drying;
  if (why.net >= 0) lines.push(t('water.fillsIn'));
  else if (hole.level >= dryBelow) {
    // Days until the level falls *below* the "dry" threshold.
    lines.push(t('water.dryIn', { days: Math.floor((hole.level - dryBelow) / -why.net) + 1 }));
  }

  if (!state.zones[hole.zoneId]?.unlocked) lines.push(t('water.hint.locked'));
  else if (hole.level >= BALANCE.water.maxLevel) lines.push(t('water.hint.full'));
  else lines.push(t('water.hint.refill', { amount: BALANCE.water.manualRefillAmount }));
  return lines;
}
