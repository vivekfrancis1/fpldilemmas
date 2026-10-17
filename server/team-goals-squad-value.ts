// Squad-value adjustment for the model (no-odds) team goals formula.
//
// The base formula (25% own goals, 25% own xG, 25% opponent goals conceded, 25% opponent xG
// conceded) only sees this season's results, so after a few games it can't tell a rich squad on a
// bad run from a poor squad on a good one — bookmakers can. The gap in squad value (sum of each
// team's 14 most expensive FPL players, £m) stands in for that prior. The richer side gets
// `weight x gap` extra goals and the poorer side loses the same amount, so a fixture's total is
// unchanged. The weight fades as results accumulate: c / games, with the games count floored at 3.
//
// Fitted against (a) bookmaker odds for 88 team-fixtures of 2026/27 (GW2-8; average error for teams with 3+
// games 0.267 -> 0.223) and (b) last season's 700 team-fixtures of actual goals (GW4-38; best c was 0.060 in
// GW4-19 and 0.065 in GW20-38; a constant, non-fading weight made the real-goals fit worse). To be refitted
// after a few more gameweeks of odds — see .local/known-issues.md.
export const SQUAD_VALUE_COEFFICIENT = 0.06;
export const SQUAD_VALUE_MIN_GAMES = 3;
export const SQUAD_VALUE_TOP_N = 14;

// `nowCosts` are FPL prices in tenths of a million (e.g. 55 = £5.5m). null when there are no players.
export function squadValue(nowCosts: number[]): number | null {
  if (nowCosts.length === 0) return null;
  const top = [...nowCosts].sort((a, b) => b - a).slice(0, SQUAD_VALUE_TOP_N);
  return top.reduce((sum, c) => sum + c, 0) / 10;
}

// Goals per £m of squad-value gap.
export function squadValueWeight(games: number): number {
  return SQUAD_VALUE_COEFFICIENT / Math.max(games, SQUAD_VALUE_MIN_GAMES);
}

export interface DynamicBaseInputs {
  goalsFor: number; // team goals per game
  xgFor: number | null; // team xG per game, null if unavailable
  oppGoalsAgainst: number; // opponent goals conceded per game
  oppXgAgainst: number | null; // opponent xG conceded per game, null if unavailable
  squadValueTeam: number | null; // £m
  squadValueOpp: number | null; // £m
  games: number; // the smaller of the two teams' games played
}

// Expected goals before the venue multiplier: the original 25/25/25/25 average (falling back to
// 50/50 goals when xG is unavailable) plus the games-faded squad-value gap adjustment.
export function dynamicBaseGoals(i: DynamicBaseInputs): number {
  const attackHalf = i.xgFor !== null ? i.goalsFor * 0.25 + i.xgFor * 0.25 : i.goalsFor * 0.5;
  const defenceHalf = i.oppXgAgainst !== null ? i.oppGoalsAgainst * 0.25 + i.oppXgAgainst * 0.25 : i.oppGoalsAgainst * 0.5;
  const base = attackHalf + defenceHalf;
  if (i.squadValueTeam === null || i.squadValueOpp === null) return base;
  return base + squadValueWeight(i.games) * (i.squadValueTeam - i.squadValueOpp);
}
