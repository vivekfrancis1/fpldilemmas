import { describe, it, expect } from "vitest";
import { computeMatchProbabilities } from "../shared/odds-utils";
import { buildStandings, matchProbabilities, newTally, roundToTotal, tallyActual, tallyProjected, type TeamTally } from "../shared/expected-table";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const team = (id: number) => newTally({ id, name: `Team ${id}`, shortName: `T${id}` });

describe("matchProbabilities", () => {
  it("is the independent-Poisson win / draw / away-win split of the two sides' expected goals", () => {
    const p = matchProbabilities(2.1, 0.8);
    const expected = computeMatchProbabilities(2.1, 0.8);
    expect(p.homeWin).toBeCloseTo(expected.homeWinProb, 10);
    expect(p.draw).toBeCloseTo(expected.drawProb, 10);
    expect(p.awayWin).toBeCloseTo(expected.awayWinProb, 10);
  });

  it("sums to 1", () => {
    const p = matchProbabilities(1.7, 1.1);
    expect(p.homeWin + p.draw + p.awayWin).toBeCloseTo(1, 6);
  });
});

describe("roundToTotal — whole numbers that still add up", () => {
  it("gives the leftover game to the biggest fractional part", () => {
    expect(roundToTotal([24.4, 8.3, 5.3], 38)).toEqual([25, 8, 5]);
  });

  it("leaves whole numbers alone", () => {
    expect(roundToTotal([20, 10, 8], 38)).toEqual([20, 10, 8]);
  });

  it("always sums to the total, whatever the fractions", () => {
    for (const values of [[0.5, 0.5, 37], [12.6, 12.6, 12.8], [33.34, 33.33, 33.33], [7.9, 0.05, 0.05]]) {
      const total = Math.round(sum(values));
      const out = roundToTotal(values, total);
      expect(sum(out)).toBe(total);
      out.forEach((v, i) => expect(Math.abs(v - values[i])).toBeLessThan(1));
    }
  });

  it("copes with a total that is a rounding error away from the values' sum", () => {
    expect(sum(roundToTotal([10.9999999, 14.0000001, 13], 38))).toBe(38);
  });
});

describe("tallies", () => {
  it("a played match is one whole result and the real goals", () => {
    const [h, a] = [team(1), team(2)];
    tallyActual(h, a, 3, 1);
    expect([h.expWins, h.expDraws, h.expLosses, h.goalsFor, h.goalsAgainst, h.actualGames]).toEqual([1, 0, 0, 3, 1, 1]);
    expect([a.expWins, a.expDraws, a.expLosses, a.goalsFor, a.goalsAgainst, a.actualGames]).toEqual([0, 0, 1, 1, 3, 1]);
    tallyActual(h, a, 2, 2);
    expect([h.expWins, h.expDraws]).toEqual([1, 1]);
  });

  it("a projected match adds the win / draw / loss chances and the unrounded expected goals", () => {
    const [h, a] = [team(1), team(2)];
    tallyProjected(h, a, 1.4, 0.6);
    const p = matchProbabilities(1.4, 0.6);
    expect(h.expWins).toBeCloseTo(p.homeWin, 10);
    expect(h.expDraws).toBeCloseTo(p.draw, 10);
    expect(h.expLosses).toBeCloseTo(p.awayWin, 10);
    expect(a.expWins).toBeCloseTo(p.awayWin, 10);
    expect(a.expLosses).toBeCloseTo(p.homeWin, 10);
    expect([h.goalsFor, h.goalsAgainst, h.projectedGames]).toEqual([1.4, 0.6, 1]);
    expect([a.goalsFor, a.goalsAgainst, a.projectedGames]).toEqual([0.6, 1.4, 1]);
  });
});

function season(): TeamTally[] {
  // 4 teams, 12 projected matches (home and away between every pair); team 1 strong, team 4 weak
  const t = [1, 2, 3, 4].map(team);
  const strength: Record<number, number> = { 1: 2.2, 2: 1.6, 3: 1.2, 4: 0.7 };
  for (const h of t) for (const a of t) if (h !== a) tallyProjected(h, a, strength[h.id] * 0.9, strength[a.id] * 0.7);
  return t;
}

describe("buildStandings", () => {
  const rows = buildStandings(season());

  it("each row's wins + draws + losses is its games played, and points are 3 × wins + draws", () => {
    for (const r of rows) {
      expect(r.played).toBe(6);
      expect(r.wins + r.draws + r.losses).toBe(r.played);
      expect(r.points).toBe(3 * r.wins + r.draws);
      expect(Number.isInteger(r.wins) && Number.isInteger(r.draws) && Number.isInteger(r.losses)).toBe(true);
    }
  });

  it("goals are whole numbers and the goal difference is goals for minus goals against as shown", () => {
    for (const r of rows) {
      expect(Number.isInteger(r.goalsFor) && Number.isInteger(r.goalsAgainst)).toBe(true);
      expect(r.goalDifference).toBe(r.goalsFor - r.goalsAgainst);
    }
  });

  it("is ordered strongest first and numbered from 1", () => {
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4]);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it("keeps draws in the table — a team is not handed a win or a loss in every match", () => {
    expect(sum(rows.map((r) => r.draws))).toBeGreaterThan(0);
  });

  it("reports the unrounded expected points", () => {
    const strongest = season()[0];
    expect(rows[0].expectedPoints).toBeCloseTo(3 * strongest.expWins + strongest.expDraws, 1);
  });

  it("splits actual and projected games", () => {
    const [h, a] = [team(1), team(2)];
    tallyActual(h, a, 1, 0);
    tallyProjected(a, h, 1, 1);
    const [first] = buildStandings([h, a]);
    expect([first.actualGames, first.projectedGames, first.played]).toEqual([1, 1, 2]);
  });

  it("two teams on the same whole points are separated by their unrounded expected points, then goal difference", () => {
    // a: 10.4 expected wins; b: 10.2 → both round to 10 wins and 30 points
    const a = { ...team(1), expWins: 10.4, expDraws: 0, expLosses: 9.6, goalsFor: 20, goalsAgainst: 20, actualGames: 20 };
    const b = { ...team(2), expWins: 10.2, expDraws: 0, expLosses: 9.8, goalsFor: 25, goalsAgainst: 20, actualGames: 20 };
    const [first, second] = buildStandings([b, a]);
    expect([first.points, second.points]).toEqual([30, 30]);
    expect(first.id).toBe(1);

    const c = { ...team(3), expWins: 10, expDraws: 0, expLosses: 10, goalsFor: 20, goalsAgainst: 20, actualGames: 20 };
    const d = { ...team(4), expWins: 10, expDraws: 0, expLosses: 10, goalsFor: 26, goalsAgainst: 20, actualGames: 20 };
    expect(buildStandings([c, d])[0].id).toBe(4);
  });
});
