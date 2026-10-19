// Step 2 of the day tick: waterhole levels (spec §6.1).
import { BALANCE, type Season } from '../config/balance';
import type { GameState, WaterholeState } from '../core/GameState';
import type { TileRect } from '../core/WorldLayout';
import { seasonOf } from './Seasons';
import type { SimEvent, SimStep } from './types';

type WaterConfig = typeof BALANCE.water;

export type WaterVisualState = 'clear' | 'muddy' | 'drying' | 'dry';

/** clear > 60, muddy 30–60, drying 10–30, dry < 10 (spec §6.1). */
export function waterVisualState(
  level: number,
  cfg: WaterConfig = BALANCE.water,
): WaterVisualState {
  const t = cfg.stateThresholds;
  if (level > t.clear) return 'clear';
  if (level >= t.muddy) return 'muddy';
  if (level >= t.drying) return 'drying';
  return 'dry';
}

/** Each part of a waterhole's daily change, so the UI can explain it (spec pillar 4). */
export interface WaterBreakdown {
  /** Negative: water lost to evaporation and seepage. */
  evaporation: number;
  seasonMult: number;
  rain: number;
  pump: number;
  net: number;
}

export function waterBreakdown(
  hole: WaterholeState,
  season: Season,
  cfg: WaterConfig = BALANCE.water,
): WaterBreakdown {
  const seasonMult = cfg.seasonDecayMult[season];
  const evaporation = -cfg.decayPerDay * seasonMult;
  const rain = cfg.rainPerDay[season];
  const pump =
    hole.pumpState === 'working' && hole.pumpKind ? cfg.pumpRefillPerDay[hole.pumpKind] : 0;
  return { evaporation, seasonMult, rain, pump, net: evaporation + rain + pump };
}

export function clampLevel(level: number, cfg: WaterConfig = BALANCE.water): number {
  return Math.min(cfg.maxLevel, Math.max(0, level));
}

/** Distance in tiles from a point to the nearest edge of a rectangle (0 if inside). */
function distanceToRect(x: number, y: number, r: TileRect): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/**
 * Spec §6.1: a zone has water if any waterhole within range has level ≥ 30.
 * Waterholes inside a locked zone don't count: that zone is still fenced off
 * (DECISIONS D36), otherwise Waterhole B would water the plains from day one.
 */
export function zoneHasWater(
  state: GameState,
  zoneId: string,
  cfg: WaterConfig = BALANCE.water,
): boolean {
  const zone = state.zones[zoneId];
  if (!zone) return false;
  return Object.values(state.waterholes).some(
    (h) =>
      state.zones[h.zoneId]?.unlocked === true &&
      h.level >= cfg.availableMinLevel &&
      distanceToRect(h.x, h.y, zone.rect) <= cfg.rangeTiles,
  );
}

export const runWater: SimStep = (state) => {
  const season = seasonOf(state.clock.day);
  const events: SimEvent[] = [];
  const waterholes: GameState['waterholes'] = {};
  for (const [id, hole] of Object.entries(state.waterholes)) {
    const level = clampLevel(hole.level + waterBreakdown(hole, season).net);
    const before = waterVisualState(hole.level);
    const after = waterVisualState(level);
    if (before !== after)
      events.push({ type: 'waterholeStateChanged', payload: { id, state: after } });
    waterholes[id] = { ...hole, level };
  }
  return { state: { ...state, waterholes }, events };
};
