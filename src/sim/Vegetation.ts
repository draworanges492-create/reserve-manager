// Step 3 of the day tick: grass and browse per zone (spec §6.2).
import { BALANCE } from '../config/balance';
import { SPECIES } from '../core/content';
import type { GameState } from '../core/GameState';
import { seasonOf } from './Seasons';
import type { SimEvent, SimStep } from './types';

type VegConfig = typeof BALANCE.vegetation;

export interface VegetationBreakdown {
  /** Points regained today: regrowRate × season × (100 − V)/100. */
  regrowth: number;
  /** Points eaten today by grazers. */
  grazing: number;
  net: number;
}

export function isDegraded(vegetation: number, cfg: VegConfig = BALANCE.vegetation): boolean {
  return vegetation < cfg.degradedBelow;
}

/** The next day's change for a zone, split into parts so the UI can explain it. */
export function vegetationBreakdown(
  state: GameState,
  zoneId: string,
  cfg: VegConfig = BALANCE.vegetation,
): VegetationBreakdown {
  const zone = state.zones[zoneId];
  if (!zone) return { regrowth: 0, grazing: 0, net: 0 };
  const season = seasonOf(state.clock.day);
  const v = zone.vegetation;
  const regrowth = cfg.regrowRate * cfg.seasonMult[season] * ((cfg.maxLevel - v) / cfg.maxLevel);
  const herd = state.populations[zoneId] ?? {};
  const eaten = SPECIES.filter((s) => s.diet === 'grazer').reduce(
    (sum, s) => sum + (herd[s.id] ?? 0) * s.grazeRate,
    0,
  );
  const grazing = (eaten * cfg.grazingScale) / zone.area;
  return { regrowth, grazing, net: regrowth - grazing };
}

export const runVegetation: SimStep = (state) => {
  const cfg = BALANCE.vegetation;
  const events: SimEvent[] = [];
  const zones: GameState['zones'] = {};
  for (const [id, zone] of Object.entries(state.zones)) {
    const next = Math.min(
      cfg.maxLevel,
      Math.max(0, zone.vegetation + vegetationBreakdown(state, id).net),
    );
    if (isDegraded(next) !== isDegraded(zone.vegetation)) {
      events.push({
        type: 'zoneDegradedChanged',
        payload: { zoneId: id, degraded: isDegraded(next) },
      });
    }
    zones[id] = { ...zone, vegetation: next };
  }
  return { state: { ...state, zones }, events };
};
