// Read-only lookups into src/data content files.
import buildingsData from '../data/buildings.json';
import speciesData from '../data/species.json';
import staffData from '../data/staff.json';
import waterholesData from '../data/waterholes.json';
import zonesData from '../data/zones.json';

export interface WaterholeDef {
  id: string;
  name: string;
  startLevel: number;
  type: string;
}

export function waterholeDef(id: string): WaterholeDef | undefined {
  return waterholesData.waterholes.find((w) => w.id === id);
}

export type Diet = 'grazer' | 'browser' | 'predator' | 'scavenger';

export interface SpeciesDef {
  id: string;
  name: string;
  /** For sentences: "taken by lions", "−3 impala". */
  plural: string;
  diet: Diet;
  /** Daily growth rate. */
  r: number;
  /** Animals per tile at full vegetation. */
  habitatDensity: number;
  grazeRate: number;
  /** Below this many in a zone the group can't breed (Allee effect) and is "critical". */
  minViable: number;
  sightingValue: number;
  poachingValue: number;
  /** Scales the public-image cost of culling. */
  charisma: number;
  predators: string[];
  prey: string[];
  startPopulation: Record<string, number>;
  targetN: number;
  spriteKey: string;
  /** Predators only: prey killed per predator per day when prey is plentiful. */
  killsPerDay?: Record<string, number>;
  /** Predators only: prey count at which hunting succeeds at half its top rate. */
  huntHalfSaturation?: number;
  /** Predators only: predators supported per prey animal (spec §6.3 K_predator). */
  predationEfficiency?: number;
  /** Scavengers only: animals supported per carcass left in the zone each day (D107). */
  carrionEfficiency?: number;
  /** Must stay `verified: false` until the user checks them against a source (spec §0 rule 8). */
  facts: { text: string; verified: boolean }[];
}

export const SPECIES: readonly SpeciesDef[] = speciesData.species as SpeciesDef[];

export function speciesDef(id: string): SpeciesDef | undefined {
  return SPECIES.find((s) => s.id === id);
}

export interface ZoneDef {
  id: string;
  name: string;
  unlockChapter: number;
  /** Vegetation 0–100 at the start of a new game. */
  startVegetation: number;
}

export const ZONE_DEFS: readonly ZoneDef[] = zonesData.zones;

export function zoneDef(id: string): ZoneDef | undefined {
  return ZONE_DEFS.find((z) => z.id === id);
}

export interface BuildingEffect {
  op: 'installPump' | 'patrolBoost';
  pumpKind?: 'borehole' | 'solar';
  value?: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  slotType: string;
  cost: number;
  buildDays: number;
  unlockChapter: number;
  /** Only buildable on a slot that already has this (finished) building. */
  upgradeOf?: string;
  description: string;
  effects: BuildingEffect[];
}

export const BUILDINGS: readonly BuildingDef[] = buildingsData.buildings as BuildingDef[];

export function buildingDef(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

export interface StaffRoleDef {
  id: string;
  name: string;
  wage: number;
  unlockChapter: number;
  /** Rangers patrol their zone and count toward ranger coverage. */
  patrols: boolean;
  spriteKey: string;
  description: string;
}

export const STAFF_ROLES: readonly StaffRoleDef[] = staffData.roles;

export function staffRole(id: string): StaffRoleDef | undefined {
  return STAFF_ROLES.find((r) => r.id === id);
}
