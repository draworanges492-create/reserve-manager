// Tooltip text for the top bar (pure, so it can be tested).
import { BALANCE } from '../config/balance';
import { DAY_LENGTH_SECONDS } from '../config/game';
import type { GameState, ScoreId } from '../core/GameState';
import { t } from '../core/text';
import { ecosystemBreakdown, reputationTarget } from '../sim/Scores';
import { calendarOf } from '../sim/Seasons';

export function dateText(state: GameState, compact: boolean): string {
  const cal = calendarOf(state.clock.day);
  const dry = cal.season === 'dry';
  return compact
    ? t('hud.dateCompact', {
        year: cal.year,
        season: t(dry ? 'season.dryShort' : 'season.wetShort'),
        day: cal.dayOfSeason,
        days: cal.daysPerSeason,
      })
    : t('hud.date', {
        year: cal.year,
        season: t(dry ? 'season.dry' : 'season.wet'),
        day: cal.dayOfSeason,
        days: cal.daysPerSeason,
      });
}

export function dateTooltip(state: GameState): string[] {
  const { season } = calendarOf(state.clock.day);
  const lines = [
    t('hud.tip.season', {
      season: t(season === 'dry' ? 'season.dry' : 'season.wet'),
      evap: BALANCE.water.seasonDecayMult[season],
      grass: BALANCE.vegetation.seasonMult[season],
    }),
  ];
  const rain = BALANCE.water.rainPerDay[season];
  if (rain) lines.push(t('hud.tip.rain', { n: rain }));
  const { clock } = state;
  lines.push(
    clock.paused
      ? t('hud.tip.nextDayPaused')
      : t('hud.tip.nextDay', {
          s: Math.ceil(((1 - clock.dayProgress) * DAY_LENGTH_SECONDS) / clock.speed),
          speed: clock.speed,
        }),
  );
  return lines;
}

const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`.replace('-', '−'));

function recent(state: GameState, score: ScoreId): string[] {
  return state.scoreHistory
    .filter((c) => c.score === score)
    .slice(-3)
    .map((c) =>
      t('score.recent', {
        delta: signed(Math.round(c.delta)),
        reason: t(c.reason as never),
        day: c.day,
      }),
    );
}

export function scoreTooltip(state: GameState, score: ScoreId): string[] {
  const value = Math.round(state.scores[score]);
  if (score === 'ecosystem') {
    const b = ecosystemBreakdown(state);
    const w = BALANCE.scores.weights;
    return [
      t('score.ecosystem', { n: value }),
      t('score.ecosystem.grass', {
        veg: Math.round(b.vegetation),
        n: Math.round(b.vegetation * w.vegetation),
      }),
      t('score.ecosystem.species', {
        a: b.viableSpecies,
        b: b.totalSpecies,
        n: Math.round((b.viableSpecies / Math.max(1, b.totalSpecies)) * 100 * w.biodiversity),
      }),
      t('score.ecosystem.water', {
        a: b.wateredZones,
        b: b.openZones,
        n: Math.round((b.wateredZones / Math.max(1, b.openZones)) * 100 * w.water),
      }),
    ];
  }
  if (score === 'trust')
    return [t('score.trust', { n: value }), t('score.trust.about'), ...recent(state, 'trust')];
  const target = Math.round(reputationTarget(state, state.scores.ecosystem));
  return [
    t('score.reputation', { n: value }),
    t('score.reputation.about', { target }),
    ...recent(state, 'reputation'),
  ];
}
