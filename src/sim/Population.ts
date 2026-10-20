// Step 4 of the day tick: births, starvation and predation per species per zone (spec §6.3).
import { BALANCE } from '../config/balance';
import { SPECIES, type SpeciesDef } from '../core/content';
import type { GameState, PopulationChange } from '../core/GameState';
import type { Rng } from '../core/Rng';
import { zoneHasWater } from './Water';
import type { SimEvent, SimStep } from './types';

/**
 * Turns an expected (fractional) count into a whole number of animals, rounding up with
 * probability equal to the fraction, so small herds still change over time on average.
 */
export function stochasticRound(x: number, rng: Rng): number {
  if (x <= 0) return 0;
  const whole = Math.floor(x);
  return whole + (rng.chance(x - whole) ? 1 : 0);
}

/** Spec §6.3: how many of a species a zone can support right now. */
export function carryingCapacity(state: GameState, zoneId: string, species: SpeciesDef): number {
  const zone = state.zones[zoneId];
  if (!zone) return 0;
  if (species.diet === 'scavenger') {
    // Scavengers live on the dead: the animals expected to starve or be killed here each day
    // (smooth, unlike yesterday's actual count, which is often zero) (DECISIONS D107).
    const herd = state.populations[zoneId] ?? {};
    let carcasses = 0;
    for (const other of SPECIES) {
      const n = herd[other.id];
      if (n === undefined || other.diet === 'scavenger') continue;
      const exp = expectedChange(state, zoneId, other, n);
      carcasses += exp.starved + Object.values(exp.eatenBy).reduce((a, b) => a + b, 0);
    }
    return carcasses * (species.carrionEfficiency ?? 0);
  }
  if (species.diet === 'predator') {
    const herd = state.populations[zoneId] ?? {};
    return species.prey.reduce(
      (sum, preyId) => sum + (herd[preyId] ?? 0) * (species.predationEfficiency ?? 0),
      0,
    );
  }
  const water = zoneHasWater(state, zoneId) ? 1 : BALANCE.population.noWaterFactor;
  return zone.area * species.habitatDensity * (zone.vegetation / 100) * water;
}

/**
 * Prey one predator takes per day. Spec §6.3 gives a flat killsPerDay; it is scaled by
 * prey / (prey + half-saturation) so hunting gets harder as prey thins out instead of
 * wiping a herd out (DECISIONS D51).
 */
export function killsPerPredator(predator: SpeciesDef, preyId: string, preyCount: number): number {
  const rate = predator.killsPerDay?.[preyId] ?? 0;
  const half = predator.huntHalfSaturation ?? 0;
  return preyCount > 0 ? (rate * preyCount) / (preyCount + half) : 0;
}

interface Expected {
  births: number;
  starved: number;
  eatenBy: Record<string, number>;
  capacity: number;
}

/** Expected (fractional) changes for one herd, all from start-of-day numbers. */
function expectedChange(
  state: GameState,
  zoneId: string,
  species: SpeciesDef,
  n: number,
): Expected {
  const herd = state.populations[zoneId] ?? {};
  const capacity = carryingCapacity(state, zoneId, species);
  // Logistic growth; with no capacity at all, decline at the growth rate rather than vanish.
  const crowding = capacity > 0 ? Math.max(-1, 1 - n / capacity) : -1;
  let growth = species.r * n * crowding;
  // Allee effect: too few to breed (spec §6.3).
  if (n < species.minViable && growth > 0) growth = 0;
  const overshoot = BALANCE.population.overshootDeathRate * Math.max(0, n - capacity);

  const eatenBy: Record<string, number> = {};
  for (const predatorId of species.predators) {
    const predators = herd[predatorId] ?? 0;
    const predator = SPECIES.find((s) => s.id === predatorId);
    if (predator && predators > 0)
      eatenBy[predatorId] = predators * killsPerPredator(predator, species.id, n);
  }
  return {
    births: Math.max(0, growth),
    starved: Math.max(0, -growth) + overshoot,
    eatenBy,
    capacity,
  };
}

export const runPopulation: SimStep = (state, rng) => {
  const events: SimEvent[] = [];
  const populations: GameState['populations'] = {};
  const populationLog: GameState['populationLog'] = {};

  // Fixed order (zones by id, species by species.json) keeps RNG use deterministic.
  for (const zoneId of Object.keys(state.populations).sort()) {
    const herd = state.populations[zoneId] ?? {};
    populations[zoneId] = {};
    populationLog[zoneId] = {};
    for (const species of SPECIES) {
      const n = herd[species.id];
      if (n === undefined) continue;
      const exp = expectedChange(state, zoneId, species, n);

      // Round each cause to whole animals; losses can't exceed what's there.
      const births = stochasticRound(exp.births, rng);
      let available = n + births;
      const starved = Math.min(available, stochasticRound(exp.starved, rng));
      available -= starved;
      const eatenBy: Record<string, number> = {};
      for (const [predatorId, expected] of Object.entries(exp.eatenBy)) {
        const taken = Math.min(available, stochasticRound(expected, rng));
        eatenBy[predatorId] = taken;
        available -= taken;
      }

      populations[zoneId][species.id] = available;
      const change: PopulationChange = { births, starved, eatenBy, capacity: exp.capacity };
      populationLog[zoneId][species.id] = change;
      if (n >= species.minViable && available < species.minViable) {
        events.push({
          type: 'populationCritical',
          payload: { zoneId, speciesId: species.id, count: available },
        });
      }
    }
  }
  return { state: { ...state, populations, populationLog }, events };
};
