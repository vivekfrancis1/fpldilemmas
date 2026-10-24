// The Projected Table is built from expected values: every unfinished match adds each side's chance of a win, a draw and
// a loss (and its expected goals) to its running totals, so a favourite is not handed every win and draws stay in the
// table. Played matches count as whole results with their real goals. Only at the end are the totals rounded to whole
// numbers — wins, draws and losses so they still add up to the games played, points as 3 × wins + draws from those.
import { computeMatchProbabilities } from "./odds-utils";

export interface ResultChances {
  homeWin: number;
  draw: number;
  awayWin: number;
}

/** Win / draw / away-win chances implied by the two sides' expected goals (independent Poisson, as the odds are converted). */
export function matchProbabilities(homeExpectedGoals: number, awayExpectedGoals: number): ResultChances {
  const p = computeMatchProbabilities(homeExpectedGoals, awayExpectedGoals);
  return { homeWin: p.homeWinProb, draw: p.drawProb, awayWin: p.awayWinProb };
}

/** Rounds to whole numbers that sum to `total`: round down, then give the leftover units to the biggest fractional parts. */
export function roundToTotal(values: number[], total: number): number[] {
  const floors = values.map((v) => Math.floor(v + 1e-9));
  let leftover = total - floors.reduce((a, b) => a + b, 0);
  const byRemainder = values
    .map((v, i) => ({ i, remainder: v - floors[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  const out = [...floors];
  for (let k = 0; leftover > 0 && byRemainder.length > 0; k = (k + 1) % byRemainder.length, leftover--) out[byRemainder[k].i]++;
  return out;
}

export interface TeamTally {
  id: number;
  name: string;
  shortName: string;
  actualGames: number;
  projectedGames: number;
  expWins: number;
  expDraws: number;
  expLosses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function newTally(team: { id: number; name: string; shortName: string }): TeamTally {
  return { ...team, actualGames: 0, projectedGames: 0, expWins: 0, expDraws: 0, expLosses: 0, goalsFor: 0, goalsAgainst: 0 };
}

function addGoals(home: TeamTally, away: TeamTally, homeGoals: number, awayGoals: number) {
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;
}

/** A played match: one whole result and the real goals. */
export function tallyActual(home: TeamTally, away: TeamTally, homeGoals: number, awayGoals: number) {
  home.actualGames++;
  away.actualGames++;
  if (homeGoals > awayGoals) { home.expWins++; away.expLosses++; }
  else if (awayGoals > homeGoals) { away.expWins++; home.expLosses++; }
  else { home.expDraws++; away.expDraws++; }
  addGoals(home, away, homeGoals, awayGoals);
}

/** An unfinished match: each side's chance of a win, draw and loss, and its unrounded expected goals. */
export function tallyProjected(home: TeamTally, away: TeamTally, homeExpectedGoals: number, awayExpectedGoals: number) {
  const p = matchProbabilities(homeExpectedGoals, awayExpectedGoals);
  home.projectedGames++;
  away.projectedGames++;
  home.expWins += p.homeWin;
  home.expDraws += p.draw;
  home.expLosses += p.awayWin;
  away.expWins += p.awayWin;
  away.expDraws += p.draw;
  away.expLosses += p.homeWin;
  addGoals(home, away, homeExpectedGoals, awayExpectedGoals);
}

export interface StandingRow {
  id: number;
  name: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** The unrounded expected points, to one decimal: what separates teams level on whole points. */
  expectedPoints: number;
  actualGames: number;
  projectedGames: number;
  position: number;
}

/**
 * The table from the running totals, best first: whole points, then unrounded expected points, goal difference and goals
 * scored, so the order does not wobble on rounding. Each row adds up: W + D + L = played, points = 3W + D, GD = GF − GA.
 */
export function buildStandings(tallies: TeamTally[]): StandingRow[] {
  const rows = tallies.map((t) => {
    const played = t.actualGames + t.projectedGames;
    const [wins, draws, losses] = roundToTotal([t.expWins, t.expDraws, t.expLosses], played);
    const goalsFor = Math.round(t.goalsFor);
    const goalsAgainst = Math.round(t.goalsAgainst);
    return {
      sort: { expectedPoints: 3 * t.expWins + t.expDraws, goalDifference: t.goalsFor - t.goalsAgainst, goalsFor: t.goalsFor },
      row: {
        id: t.id, name: t.name, shortName: t.shortName, played, wins, draws, losses,
        goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst,
        points: 3 * wins + draws,
        expectedPoints: Math.round((3 * t.expWins + t.expDraws) * 10) / 10,
        actualGames: t.actualGames, projectedGames: t.projectedGames,
      },
    };
  });
  rows.sort((a, b) =>
    b.row.points - a.row.points ||
    b.sort.expectedPoints - a.sort.expectedPoints ||
    b.sort.goalDifference - a.sort.goalDifference ||
    b.sort.goalsFor - a.sort.goalsFor ||
    a.row.name.localeCompare(b.row.name));
  return rows.map((r, i) => ({ ...r.row, position: i + 1 }));
}
