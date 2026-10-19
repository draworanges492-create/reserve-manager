// Spec §13 balance runner: plays N in-game years headless and prints daily curves as CSV.
//   npm run sim:balance -- --years 3 --player reasonable --seed 7 > curves.csv
// `--player none` leaves the reserve alone; `reasonable` hand-refills Waterhole A to ≥ 40
// each day (what an attentive Chapter 1 player does). A summary goes to stderr.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BALANCE } from '../src/config/balance';
import { SPECIES } from '../src/core/content';
import { applyCommand } from '../src/core/Commands';
import { createGameState, type GameState } from '../src/core/GameState';
import type { TiledMap } from '../src/core/TiledFormat';
import { readWorldLayout } from '../src/core/WorldLayout';
import { seasonOf } from '../src/sim/Seasons';
import { runDayTick } from '../src/sim/tick';

export interface BalanceOptions {
  years: number;
  player: 'none' | 'reasonable';
  seed: number;
}

export interface DayRow {
  day: number;
  season: string;
  waterA: number;
  vegetation: Record<string, number>;
  populations: Record<string, number>;
}

const MAP = join(import.meta.dirname, '..', 'public', 'assets', 'maps', 'reserve.tmj');
const REFILL_TARGET = 40;

function playerTurn(state: GameState, player: BalanceOptions['player']): GameState {
  if (player === 'none') return state;
  let current = state;
  while ((current.waterholes.waterhole_a?.level ?? 100) < REFILL_TARGET) {
    const r = applyCommand(current, { type: 'refillWaterhole', id: 'waterhole_a' });
    if (!r.ok) break;
    current = r.state;
  }
  return current;
}

export function runBalance({ years, player, seed }: BalanceOptions): DayRow[] {
  const world = readWorldLayout(JSON.parse(readFileSync(MAP, 'utf8')) as TiledMap);
  let state = createGameState({ seed, world });
  const days = years * BALANCE.time.daysPerSeason * BALANCE.time.seasonOrder.length;
  const rows: DayRow[] = [];
  for (let d = 0; d < days; d++) {
    state = runDayTick(playerTurn(state, player)).state;
    const totals: Record<string, number> = {};
    for (const herd of Object.values(state.populations))
      for (const [id, n] of Object.entries(herd)) totals[id] = (totals[id] ?? 0) + n;
    rows.push({
      day: state.clock.day,
      season: seasonOf(state.clock.day),
      waterA: Math.round(state.waterholes.waterhole_a?.level ?? 0),
      vegetation: Object.fromEntries(
        Object.entries(state.zones).map(([id, z]) => [id, Math.round(z.vegetation * 10) / 10]),
      ),
      populations: totals,
    });
  }
  return rows;
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

if (process.argv[1]?.endsWith('sim-balance.ts')) {
  const options: BalanceOptions = {
    years: Number(arg('years', '1')),
    player: arg('player', 'none') === 'reasonable' ? 'reasonable' : 'none',
    seed: Number(arg('seed', '1')),
  };
  const rows = runBalance(options);
  const speciesIds = SPECIES.map((s) => s.id);
  console.log(['day', 'season', 'waterA', 'veg_plains', ...speciesIds].join(','));
  for (const r of rows) {
    console.log(
      [
        r.day,
        r.season,
        r.waterA,
        r.vegetation.plains,
        ...speciesIds.map((id) => r.populations[id] ?? 0),
      ].join(','),
    );
  }
  const summary = speciesIds.map((id) => {
    const values = rows.map((r) => r.populations[id] ?? 0);
    return `${id}: start ${values[0]} min ${Math.min(...values)} max ${Math.max(...values)} end ${values.at(-1)}`;
  });
  const veg = rows.map((r) => r.vegetation.plains ?? 0);
  console.error(
    `${options.years}y, player=${options.player}, seed=${options.seed}\n  ${summary.join('\n  ')}\n  plains grass: min ${Math.min(...veg)} max ${Math.max(...veg)} end ${veg.at(-1)}`,
  );
}
