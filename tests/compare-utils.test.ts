import { describe, it, expect } from "vitest";
import {
  parseCompareIds,
  COMPARE_STATS,
  bestValueIndexes,
  findHistoricalByCode,
  projectionWindow,
  fixturesForGameweeks,
  MAX_COMPARE_PLAYERS,
  compareUrl,
} from "../shared/compare-utils";

describe("parseCompareIds (shareable /compare?p=1,2,3 URLs)", () => {
  it("parses a comma list of ids in order", () => {
    expect(parseCompareIds("411,12,300")).toEqual([411, 12, 300]);
  });

  it("removes duplicates, keeping the first occurrence", () => {
    expect(parseCompareIds("5,7,5,7,9")).toEqual([5, 7, 9]);
  });

  it(`keeps at most ${MAX_COMPARE_PLAYERS} players`, () => {
    expect(parseCompareIds("1,2,3,4,5,6,7")).toEqual([1, 2, 3, 4, 5]);
  });

  it("drops junk: empty, non-numeric, zero, negative, decimals", () => {
    expect(parseCompareIds("abc,,0,-4,2.5,8, 9 ")).toEqual([8, 9]);
  });

  it("returns an empty list for missing input", () => {
    expect(parseCompareIds(undefined)).toEqual([]);
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds("")).toEqual([]);
  });
});

describe("bestValueIndexes (highlight best stat per row)", () => {
  it("highlights the highest value when higher is better", () => {
    expect(bestValueIndexes([10, 30, 20], "higher")).toEqual([1]);
  });

  it("highlights the lowest value when lower is better", () => {
    expect(bestValueIndexes([10, 30, 20], "lower")).toEqual([0]);
  });

  it("highlights every player who shares the best value", () => {
    expect(bestValueIndexes([30, 10, 30], "higher")).toEqual([0, 2]);
  });

  it("highlights nothing when all values are equal", () => {
    expect(bestValueIndexes([4, 4, 4], "higher")).toEqual([]);
  });

  it("ignores missing values and needs at least two real values", () => {
    expect(bestValueIndexes([null, 5, 9], "higher")).toEqual([2]);
    expect(bestValueIndexes([null, 5, null], "higher")).toEqual([]);
    expect(bestValueIndexes([null, null], "higher")).toEqual([]);
  });

  it("treats zero as a real value, not as missing", () => {
    expect(bestValueIndexes([0, 3], "lower")).toEqual([0]);
  });
});

describe("COMPARE_STATS directions", () => {
  const dir = (key: string) => COMPARE_STATS.find((s) => s.key === key)?.better;
  it("lower is better for goals conceded, cards, own goals and missed penalties", () => {
    for (const k of ["goals_conceded", "yellow_cards", "red_cards", "own_goals", "penalties_missed"]) {
      expect(dir(k)).toBe("lower");
    }
  });
  it("higher is better for points, goals, assists, clean sheets and bonus", () => {
    for (const k of ["total_points", "goals_scored", "assists", "clean_sheets", "bonus"]) {
      expect(dir(k)).toBe("higher");
    }
  });
});

describe("findHistoricalByCode (past seasons matched by FPL player code, never by name)", () => {
  const rows = [
    { element_code: 111, first_name: "Alex", second_name: "Smith", total_points: 100 },
    { element_code: 222, first_name: "Alex", second_name: "Smith", total_points: 40 }, // a different, same-name player
  ];

  it("matches the exact player when two players share a name", () => {
    expect(findHistoricalByCode(rows, 222)?.total_points).toBe(40);
    expect(findHistoricalByCode(rows, 111)?.total_points).toBe(100);
  });

  it("returns null (no data) when the code is not in that season, even if the name matches", () => {
    expect(findHistoricalByCode(rows, 999)).toBeNull();
  });

  it("returns null for a missing or empty code or dataset", () => {
    expect(findHistoricalByCode(rows, undefined)).toBeNull();
    expect(findHistoricalByCode(undefined, 111)).toBeNull();
    expect(findHistoricalByCode([], 111)).toBeNull();
  });

  it("also reads the camelCase elementCode field", () => {
    expect(findHistoricalByCode([{ elementCode: 333, total_points: 7 }], 333)?.total_points).toBe(7);
  });
});

describe("projectionWindow (xPts for the next gameweeks, read from the cached projection)", () => {
  const proj = { "8": 5.13, "9": 5.96, "10": 6.47, "11": 7.59, "12": 5.35, "13": 7.06 };

  it("takes the first N gameweeks present in the projection and sums them", () => {
    const w = projectionWindow(proj, 5);
    expect(w.gameweeks).toEqual([8, 9, 10, 11, 12]);
    expect(w.perGameweek).toEqual([5.13, 5.96, 6.47, 7.59, 5.35]);
    expect(w.total).toBe(30.5);
  });

  it("uses the same gameweeks for every player when given an explicit list", () => {
    const w = projectionWindow({ "8": 2, "10": 4 }, [8, 9, 10]);
    expect(w.perGameweek).toEqual([2, null, 4]);
    expect(w.total).toBe(6);
  });

  it("shows a missing gameweek as null, not as 0 xPts", () => {
    expect(projectionWindow({ "9": 3 }, [8, 9]).perGameweek).toEqual([null, 3]);
  });

  it("returns a null total when the player has no projection in the window", () => {
    expect(projectionWindow({}, [8, 9]).total).toBeNull();
    expect(projectionWindow(undefined, [8]).total).toBeNull();
  });
});

describe("fixturesForGameweeks (upcoming fixtures for a team)", () => {
  const fx = (id: number, event: number | null, h: number, a: number, hd: number, ad: number, finished = false) => ({
    id, event, team_h: h, team_a: a, team_h_difficulty: hd, team_a_difficulty: ad, finished,
  });
  const fixtures = [
    fx(1, 8, 1, 2, 2, 4),
    fx(2, 9, 3, 1, 3, 5),
    fx(3, 10, 1, 4, 2, 3),
    fx(4, 10, 5, 1, 4, 2), // double gameweek for team 1 in GW10
    fx(5, 12, 1, 6, 2, 3),
    fx(6, null, 1, 7, 2, 3), // unscheduled
    fx(7, 7, 1, 8, 2, 3, true), // already finished
  ];

  it("returns this team's fixtures with opponent, venue and the team's own difficulty", () => {
    const out = fixturesForGameweeks(1, fixtures, [8, 9]);
    expect(out).toEqual([
      { gameweek: 8, fixtures: [{ opponentId: 2, isHome: true, difficulty: 2 }] },
      { gameweek: 9, fixtures: [{ opponentId: 3, isHome: false, difficulty: 5 }] },
    ]);
  });

  it("lists both fixtures in a double gameweek", () => {
    const gw10 = fixturesForGameweeks(1, fixtures, [10])[0];
    expect(gw10.fixtures).toHaveLength(2);
    expect(gw10.fixtures.map((f) => f.opponentId).sort()).toEqual([4, 5]);
  });

  it("gives an empty list for a blank gameweek (no fixture), not a fake one", () => {
    expect(fixturesForGameweeks(1, fixtures, [11])).toEqual([{ gameweek: 11, fixtures: [] }]);
  });

  it("ignores finished and unscheduled fixtures", () => {
    expect(fixturesForGameweeks(1, fixtures, [7])[0].fixtures).toEqual([]);
  });
});

describe("compareUrl (links into the Compare page)", () => {
  it("builds /compare?p=<ids> in the given order", () => {
    expect(compareUrl([411, 12])).toBe("/compare?p=411,12");
    expect(compareUrl([5])).toBe("/compare?p=5");
  });

  it("round-trips through parseCompareIds, which also removes duplicates and caps at the maximum", () => {
    const url = compareUrl([1, 2, 2, 3, 4, 5, 6, 7]);
    expect(parseCompareIds(new URLSearchParams(url.split("?")[1]).get("p"))).toEqual([1, 2, 3, 4, 5]);
  });

  it("with nothing valid it links to the bare page", () => {
    expect(compareUrl([])).toBe("/compare");
    expect(compareUrl([0, -3, NaN])).toBe("/compare");
  });
});
