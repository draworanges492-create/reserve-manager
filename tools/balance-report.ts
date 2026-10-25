// Full-game balance report (Phase 14c): plays the whole story with the automated player
// under several choice strategies and seeds, and prints one row per chapter.
//   npm run balance:report
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGameState, type GameState } from '../src/core/GameState';
import type { TiledMap } from '../src/core/TiledFormat';
import { readWorldLayout } from '../src/core/WorldLayout';
import { speciesPresent } from '../src/story/conditions';
import { play, strategies } from './autoPlayer';

const MAP = join(import.meta.dirname, '..', 'public', 'assets', 'maps', 'reserve.tmj');
const world = readWorldLayout(JSON.parse(readFileSync(MAP, 'utf8')) as TiledMap);

interface ChapterRow {
  chapter: number;
  days: number;
  moneyMin: number;
  moneyEnd: number;
  netPerDay: number;
  trustMin: number;
  trustEnd: number;
  ecoEnd: number;
  repEnd: number;
  species: number;
  staff: number;
}

function run(
  label: string,
  seed: number,
  strategy: keyof typeof strategies,
  carelessDays = 0,
): void {
  const rows: ChapterRow[] = [];
  let current: ChapterRow | null = null;
  let startMoney = 0;
  const onDay = (s: GameState): void => {
    if (!current || current.chapter !== s.chapter.current) {
      current = {
        chapter: s.chapter.current,
        days: 0,
        moneyMin: Infinity,
        moneyEnd: 0,
        netPerDay: 0,
        trustMin: Infinity,
        trustEnd: 0,
        ecoEnd: 0,
        repEnd: 0,
        species: 0,
        staff: 0,
      };
      startMoney = s.resources.money;
      rows.push(current);
    }
    const r: ChapterRow = current;
    r.days++;
    r.moneyMin = Math.min(r.moneyMin, Math.round(s.resources.money));
    r.moneyEnd = Math.round(s.resources.money);
    r.netPerDay = Math.round((s.resources.money - startMoney) / r.days);
    r.trustMin = Math.min(r.trustMin, Math.round(s.scores.trust));
    r.trustEnd = Math.round(s.scores.trust);
    r.ecoEnd = Math.round(s.scores.ecosystem);
    r.repEnd = Math.round(s.scores.reputation);
    r.species = speciesPresent(s);
    r.staff = s.staff.length;
  };
  const start = { ...createGameState({ seed, world }), playerName: 'Sam' };
  const end = play(start, strategies[strategy], { onDay, carelessDays, maxDays: 800 });
  const ending = Object.keys(end.flags).find((f) => f.startsWith('ending_')) ?? 'unfinished';
  console.log(`\n### ${label} (seed ${seed}, ${strategy}): ${end.clock.day} days, ${ending}\n`);
  console.log(
    '| Ch | Days | Money min | Money end | Net/day | Trust min | Trust end | Eco | Rep | Species | Staff |',
  );
  console.log(
    '| -- | ---- | --------- | --------- | ------- | --------- | --------- | --- | --- | ------- | ----- |',
  );
  for (const r of rows)
    console.log(
      `| ${r.chapter} | ${r.days} | ${r.moneyMin} | ${r.moneyEnd} | ${r.netPerDay} | ${r.trustMin} | ${r.trustEnd} | ${r.ecoEnd} | ${r.repEnd} | ${r.species} | ${r.staff} |`,
    );
}

for (const strategy of Object.keys(strategies) as (keyof typeof strategies)[])
  run('Attentive', 7, strategy);
for (const seed of [3, 11]) run('Attentive', seed, 'first');
run('Careless for 60 days, then attentive', 7, 'first', 60);
