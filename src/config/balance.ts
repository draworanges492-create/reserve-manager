// Typed view of balance.json (spec §0 rule 3: every tunable number lives there).
import balance from './balance.json';

export type Season = 'dry' | 'wet';
export type PumpKind = 'borehole' | 'solar';

export interface TimeOfDayKey {
  /** Fraction of the day, 0–1. */
  at: number;
  color: string;
  alpha: number;
}

export interface Balance {
  time: {
    daysPerSeason: number;
    seasonOrder: Season[];
    /** Most day ticks run in one frame, so a stalled tab can't fast-forward weeks. */
    maxDayTicksPerUpdate: number;
  };
  water: {
    maxLevel: number;
    decayPerDay: number;
    seasonDecayMult: Record<Season, number>;
    rainPerDay: Record<Season, number>;
    pumpRefillPerDay: Record<PumpKind, number>;
    /** Added per click, and per hold interval while the button is held. */
    manualRefillAmount: number;
    refillHoldIntervalMs: number;
    /** A zone has water if a waterhole within this many tiles is at least availableMinLevel. */
    rangeTiles: number;
    availableMinLevel: number;
    /** Lower bounds of the visual states (spec §6.1): clear > 60, muddy 30–60, drying 10–30, dry < 10. */
    stateThresholds: { clear: number; muddy: number; drying: number };
  };
  vegetation: {
    /** Regrowth per day at bare ground, before the season multiplier. */
    regrowRate: number;
    seasonMult: Record<Season, number>;
    /**
     * Converts the spec's grazing sum into vegetation points. With the spec's literal
     * formula, 80 impala eat ~0.001 points a day, so grass could never run down
     * (DECISIONS D50): species `grazeRate` is read as % of one tile eaten per animal per day.
     */
    grazingScale: number;
    /** Below this a zone is "degraded" (brown overlay, warning). */
    degradedBelow: number;
    maxLevel: number;
  };
  population: {
    /** Extra daily die-off per animal above carrying capacity (spec §6.3 d). */
    overshootDeathRate: number;
    /** Carrying-capacity multiplier when a zone has no water in range. */
    noWaterFactor: number;
  };
  economy: {
    startMoney: number;
    /** Base income until tourism exists (DECISIONS D58). */
    dailyGrant: number;
    /** Spec §6.7: upkeep per day = cost × upkeepRate / upkeepPeriodDays. */
    upkeepRate: number;
    upkeepPeriodDays: number;
    /** Share of the cost returned when construction is cancelled (spec §7.2: 50%). */
    cancelRefund: number;
    /** How many days of net income to remember (Ch 2 goal: positive 5 days running). */
    netHistoryDays: number;
    /** Extra daily income while a story flag is set (D112). */
    storyGrants: { flag: string; perDay: number }[];
  };
  fences: {
    /** Spec §7.1: patching a fence segment by hand costs 20 and takes time. */
    repairCost: number;
    repairDays: number;
    /** Broken segments each fence crew mends per day, for free. */
    crewRepairsPerDay: number;
  };
  scores: {
    /** Spec §6.8 Ecosystem Health weights. */
    weights: { vegetation: number; biodiversity: number; water: number };
    trustStart: number;
    reputationStart: number;
    /** Share of the gap to its target that Reputation closes each day (slow-moving). */
    reputationDriftPerDay: number;
    /** Spec §6.8 "jobs created" (DECISIONS D70). */
    trustPerHire: number;
    trustPerDismissal: number;
    /** Recent score changes kept for tooltips. */
    historyLength: number;
  };
  staff: {
    /** Coverage one ranger adds to a zone (spec §6.5). */
    patrolStrength: number;
    maxCoverage: number;
    startMorale: number;
    /** Morale drifts toward this while staff are paid. */
    moraleTarget: number;
    moraleDriftPerDay: number;
    unpaidMoralePenalty: number;
    /** Staff leave after this many unpaid days in a row (spec §6.7). */
    quitAfterUnpaidDays: number;
  };
  story: { startChapter: number };
  /** Spec §6.4 herd management (Chapter 3 onwards). */
  herds: {
    unlockChapter: number;
    /** Animals each "Cull" / "Relocate" button press takes off the herd's target. */
    stepSize: number;
    cullPerTeamPerDay: number;
    relocatePerVetPerDay: number;
    relocateCostPerAnimal: number;
    contraceptionCostPerDay: number;
    /** Births are multiplied by this while a contraception plan runs. */
    contraceptionBirthFactor: number;
    /** Score changes per animal culled, scaled by the species' charisma. */
    cullTrustPerAnimal: number;
    cullReputationPerAnimal: number;
    relocateTrustPerAnimal: number;
    relocateReputationPerAnimal: number;
  };
  /** Spec §6.6 tourism (Chapter 4+, D116). */
  tourism: {
    ticketPrice: number;
    /** Extra per visitor once at least one tower is up (sightings sell). */
    towerBonusPerVisitor: number;
    seasonMult: Record<Season, number>;
    /** Added to attraction while a leopard is in the reserve and has been seen. */
    rareBonus: number;
    /** Victor's cut of ticket money if the player took his lodge deal. */
    victorShare: number;
    historyDays: number;
  };
  /** Elephants raiding village crops (Chapter 3 onwards, D111). */
  cropRaids: {
    baseChance: number;
    /** Hungrier elephants raid more: chance × this when the plains grass is below `hungryBelow`. */
    hungryMult: number;
    hungryBelow: number;
    /** While the plains–east border fence stands and the border zone is still closed. */
    fenceMult: number;
    cooldownDays: number;
    /** Chance a raid knocks the plains–east border fence down. */
    breakFenceChance: number;
    trustLoss: number;
    compensationCost: number;
    compensatedTrustLoss: number;
  };
  render: {
    maxAnimalSpritesPerZone: number;
    seasonTint: Record<Season, string>;
    seasonTintFadeMs: number;
    timeOfDay: TimeOfDayKey[];
    /** Cosmetic animal movement (never affects the sim). Speeds in game px per second at 1×. */
    animals: {
      walkSpeed: { min: number; max: number };
      /** How fast a herd's centre drifts across its zone. */
      herdDriftSpeed: number;
      /** Members graze within this many tiles of the herd centre. */
      herdRadiusTiles: number;
      grazePauseMs: { min: number; max: number };
      /** Pause before the herd picks a new spot to drift to. */
      herdRestMs: { min: number; max: number };
      walkFrameMs: number;
      /** A press that moves less than this is a click, not a drag. */
      clickMaxMovePx: number;
    };
  };
}

export const BALANCE = balance as Balance;
