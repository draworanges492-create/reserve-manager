// Poaching (spec §6.5). Phase 5 added ranger coverage; Phase 12 the poaching ring.
import { BALANCE } from '../config/balance';
import { buildingDef, speciesDef, staffRole } from '../core/content';
import type { GameState } from '../core/GameState';
import type { Rng } from '../core/Rng';
import type { SimEvent, SimStep } from './types';

/** Strongest finished patrol boost in the zone (a ranger post doubles patrols). */
function patrolBoost(state: GameState, zoneId: string): number {
  let boost = 1;
  for (const slot of Object.values(state.slots)) {
    if (slot.zoneId !== zoneId || !slot.building || slot.building.daysLeft > 0) continue;
    for (const e of buildingDef(slot.building.buildingId)?.effects ?? []) {
      if (e.op === 'patrolBoost') boost = Math.max(boost, e.value ?? 1);
    }
  }
  return boost;
}

export function rangersIn(state: GameState, zoneId: string): number {
  return state.staff.filter((s) => s.zoneId === zoneId && staffRole(s.role)?.patrols).length;
}

/** Spec §6.5: min(0.9, rangers × patrolStrength), with a ranger post doubling patrols. */
export function rangerCoverage(state: GameState, zoneId: string): number {
  const { patrolStrength, maxCoverage } = BALANCE.staff;
  return Math.min(
    maxCoverage,
    rangersIn(state, zoneId) * patrolStrength * patrolBoost(state, zoneId),
  );
}

/** Camera network bonus to the chance of catching a poacher (Chapter 5, D122). */
export function cameraBonus(state: GameState): number {
  let bonus = 0;
  for (const slot of Object.values(state.slots)) {
    if (!slot.building || slot.building.daysLeft > 0) continue;
    for (const e of buildingDef(slot.building.buildingId)?.effects ?? [])
      if (e.op === 'cameraWatch') bonus += e.value ?? 0;
  }
  return bonus;
}

/** Today's poaching pressure multiplier from the ring and how the Hale story ended. */
export function ringMultiplier(state: GameState): number {
  if (!state.flags.poaching_ring) return 0;
  const cfg = BALANCE.poaching;
  if (state.flags.hale_exposed) return cfg.exposedMult;
  if (state.flags.hale_lockdown) return cfg.lockdownMult;
  if (state.flags.hale_deal) return cfg.dealMult;
  return 1;
}

/** Spec §6.5: chance of an incident in a zone today. */
export function incidentChance(state: GameState, zoneId: string): number {
  const cfg = BALANCE.poaching;
  if (!state.zones[zoneId]?.unlocked) return 0;
  const pressure = cfg.pressure[zoneId] ?? 0;
  return (
    (pressure / 100) * cfg.baseChance * ringMultiplier(state) * (1 - rangerCoverage(state, zoneId))
  );
}

/** The most valuable target in a zone (highest poachingValue with animals present). */
function targetIn(state: GameState, zoneId: string): string | null {
  const herd = state.populations[zoneId] ?? {};
  let best: { id: string; value: number } | null = null;
  for (const [id, n] of Object.entries(herd)) {
    const value = speciesDef(id)?.poachingValue ?? 0;
    if (n > 0 && id !== 'vulture' && (!best || value > best.value)) best = { id, value };
  }
  return best?.id ?? null;
}

function setCount(state: GameState, zoneId: string, speciesId: string, n: number): GameState {
  const herd = state.populations[zoneId] ?? {};
  return { ...state, populations: { ...state.populations, [zoneId]: { ...herd, [speciesId]: n } } };
}

function bump(state: GameState, key: string, by = 1): GameState {
  return { ...state, counters: { ...state.counters, [key]: (state.counters[key] ?? 0) + by } };
}

/**
 * Step 6 of the day tick (spec §6.5, D122): the poaching ring strikes, rangers and cameras
 * catch some poachers (evidence), poisoned carcasses kill vultures, and without enough
 * vultures to clean up, carcass disease can spread among grazers.
 */
export const runPoaching: SimStep = (input, rng) => {
  const cfg = BALANCE.poaching;
  const events: SimEvent[] = [];
  let state = input;
  const cameras = cameraBonus(state) > 0;
  let poachedToday = 0;
  for (const zoneId of Object.keys(state.zones).sort()) {
    const chance = incidentChance(state, zoneId);
    if (chance <= 0 || !rng.chance(chance)) continue;
    const catchChance = Math.min(
      cfg.maxCatchChance,
      rangerCoverage(state, zoneId) + cameraBonus(state),
    );
    if (rng.chance(catchChance)) {
      state = bump(bump(state, 'poachersCaught'), 'evidence', cameras ? 2 : 1);
      state = { ...state, flags: { ...state.flags, poacher_caught: true } };
      events.push({ type: 'poacherCaught', payload: { zoneId } });
      continue;
    }
    const speciesId = targetIn(state, zoneId);
    if (!speciesId) continue;
    const n = state.populations[zoneId]?.[speciesId] ?? 0;
    const killed = Math.min(n, rng.int(1, 2));
    state = setCount(state, zoneId, speciesId, n - killed);
    state = bump(state, 'poached', killed);
    if (cameras) state = bump(state, 'evidence'); // the cameras caught the truck
    state = { ...state, flags: { ...state.flags, poaching_happened: true } };
    poachedToday += killed;
    // Poachers poison the carcass so circling vultures can't give the kill away.
    let vultures = 0;
    const roost = Object.entries(state.populations).find(([, h]) => (h.vulture ?? 0) > 0)?.[0];
    if (roost && rng.chance(cfg.poisonChance)) {
      const there = state.populations[roost]?.vulture ?? 0;
      vultures = Math.min(there, rng.int(cfg.poisonKills.min, cfg.poisonKills.max));
      state = bump(
        setCount(state, roost, 'vulture', there - vultures),
        'vulturesPoisoned',
        vultures,
      );
      state = { ...state, flags: { ...state.flags, vultures_poisoned: true } };
    }
    events.push({
      type: 'poachingIncident',
      payload: { zoneId, speciesId, count: killed, vultures },
    });
  }
  return diseaseCheck(state, rng, poachedToday, events);
};

/** Carcasses rot where too few vultures are left to clean them up (Chapter 5+). */
function diseaseCheck(input: GameState, rng: Rng, poachedToday: number, events: SimEvent[]) {
  const cfg = BALANCE.disease;
  let state = input;
  if (state.chapter.current < 5) return { state, events };
  const vultures = Object.values(state.populations).reduce((n, h) => n + (h.vulture ?? 0), 0);
  const deadYesterday = Object.values(state.populationLog).reduce(
    (n, zone) => n + Object.values(zone).reduce((m, c) => m + c.starved, 0),
    0,
  );
  if (vultures >= cfg.vulturesNeeded || poachedToday + deadYesterday < 2) return { state, events };
  if (!rng.chance(cfg.chance)) return { state, events };
  // The zone with the most grazers suffers.
  const grazers = (h: Record<string, number>) =>
    Object.entries(h).reduce((n, [id, c]) => n + (speciesDef(id)?.diet === 'grazer' ? c : 0), 0);
  const zoneId = Object.entries(state.populations).sort(
    (a, b) => grazers(b[1]) - grazers(a[1]),
  )[0]?.[0];
  if (!zoneId) return { state, events };
  const herd = { ...state.populations[zoneId] };
  for (const [id, n] of Object.entries(herd))
    if (speciesDef(id)?.diet === 'grazer' && n > 0)
      herd[id] = n - Math.max(1, Math.round(n * cfg.loss));
  state = { ...state, populations: { ...state.populations, [zoneId]: herd } };
  events.push({ type: 'diseaseOutbreak', payload: { zoneId } });
  return { state, events };
}
