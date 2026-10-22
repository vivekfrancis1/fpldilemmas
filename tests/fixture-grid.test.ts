import { describe, it, expect } from "vitest";
import { cellKind, fillFixtureMatrix, gwHasBlank, gwHasDouble } from "../shared/fixture-grid";

const teams = [
  { id: 1, short_name: "ARS" },
  { id: 2, short_name: "AVL" },
  { id: 3, short_name: "BOU" },
  { id: 4, short_name: "BRE" },
];

const fx = (id: number, event: number | null, h: number, a: number, hd = 2, ad = 4, finished = false) => ({
  id, event, team_h: h, team_a: a, team_h_difficulty: hd, team_a_difficulty: ad, finished,
});

const official = (difficulty: number) => (difficulty > 0 ? difficulty : 3);
const run = (fixtures: any[], over: Record<string, unknown> = {}) =>
  fillFixtureMatrix({ teams, fixtures, range: { start: 8, end: 10 }, assignments: {}, difficultyOf: official, ...over } as any);

describe("fillFixtureMatrix", () => {
  it("puts each fixture in both teams' rows with the right opponent, venue and difficulty", () => {
    const m = run([fx(1, 8, 1, 2, 2, 4)]);
    expect(m[1][8]).toEqual([{ opponent: "AVL", difficulty: 2, isHome: true, finished: false }]);
    expect(m[2][8]).toEqual([{ opponent: "ARS", difficulty: 4, isHome: false, finished: false }]);
    expect(m[3][8]).toBeUndefined();
  });

  it("every team has a row, even with no fixtures", () => {
    const m = run([]);
    expect(Object.keys(m).map(Number)).toEqual([1, 2, 3, 4]);
    expect(m[1]).toEqual({});
  });

  it("only includes gameweeks inside the range", () => {
    const m = run([fx(1, 7, 1, 2), fx(2, 8, 1, 2), fx(3, 10, 3, 4), fx(4, 11, 3, 4)]);
    expect(Object.keys(m[1]).map(Number)).toEqual([8]);
    expect(Object.keys(m[3]).map(Number)).toEqual([10]);
  });

  it("a double gameweek holds both matches in kickoff-list order", () => {
    const m = run([fx(1, 9, 1, 2), fx(2, 9, 3, 1)]);
    expect(m[1][9].map((e: any) => e.opponent)).toEqual(["AVL", "BOU"]);
    expect(m[1][9].map((e: any) => e.isHome)).toEqual([true, false]);
    expect(cellKind(m[1][9])).toBe("double");
  });

  it("TBC fixtures (no gameweek) go in the TBC column 0 unless assigned, and carry their fixture id", () => {
    const m = run([fx(5, null, 1, 3)]);
    expect(m[1][0]).toEqual([{ opponent: "BOU", difficulty: 2, isHome: true, finished: false, fixtureId: 5 }]);
    expect(m[3][0][0]).toMatchObject({ opponent: "ARS", isHome: false, fixtureId: 5 });
  });

  it("an assigned TBC fixture lands in its chosen gameweek AFTER that gameweek's regular fixture, making a double", () => {
    const m = run([fx(5, null, 1, 3), fx(1, 9, 1, 2)], { assignments: { 5: 9 } });
    expect(m[1][9].map((e: any) => e.opponent)).toEqual(["AVL", "BOU"]);
    expect(m[1][9][1].fixtureId).toBe(5);
    expect(m[1][0]).toBeUndefined();
  });

  it("uses the supplied difficulty function (FDR modes) with the opponent and venue", () => {
    const calls: unknown[] = [];
    const m = run([fx(1, 8, 1, 2, 2, 4)], { difficultyOf: (d: number, opp: number, home: boolean) => (calls.push([d, opp, home]), 5) });
    expect(calls).toEqual([[2, 2, true], [4, 1, false]]);
    expect(m[1][8][0].difficulty).toBe(5);
  });

  it("ignores fixtures whose team is unknown instead of crashing", () => {
    expect(() => run([fx(1, 8, 1, 99)])).not.toThrow();
    expect(run([fx(1, 8, 1, 99)])[1][8]).toBeUndefined();
  });
});

describe("double / blank gameweek flags", () => {
  // GW8: everyone plays once. GW9: ARS twice, BRE not at all. GW10: nobody (all blank).
  const m = run([fx(1, 8, 1, 2), fx(2, 8, 3, 4), fx(3, 9, 1, 2), fx(4, 9, 3, 1)]);

  it("flags a gameweek as double when any team plays twice", () => {
    expect(gwHasDouble(m, 8)).toBe(false);
    expect(gwHasDouble(m, 9)).toBe(true);
  });

  it("flags a gameweek as blank when any team has no fixture", () => {
    expect(gwHasBlank(m, 8)).toBe(false);
    expect(gwHasBlank(m, 9)).toBe(true); // AVL plays once, BRE... team 4 has none
    expect(gwHasBlank(m, 10)).toBe(true);
  });

  it("a double gameweek can also be a blank one for other teams", () => {
    expect(gwHasDouble(m, 9) && gwHasBlank(m, 9)).toBe(true);
  });

  it("a team whose fixture is still TBC counts as blank in the gameweek it was moved out of", () => {
    const withTbc = run([fx(1, 8, 1, 2), fx(2, null, 3, 4)]);
    expect(gwHasBlank(withTbc, 8)).toBe(true);
    expect(gwHasDouble(withTbc, 8)).toBe(false);
  });

  it("empty matrix: nothing is flagged double, nothing is blank", () => {
    expect(gwHasDouble({}, 8)).toBe(false);
    expect(gwHasBlank({}, 8)).toBe(false);
  });
});

describe("cellKind", () => {
  it("blank for none, single for one, double for two or more", () => {
    expect(cellKind(undefined)).toBe("blank");
    expect(cellKind([])).toBe("blank");
    expect(cellKind([{ opponent: "A", difficulty: 2, isHome: true, finished: false }])).toBe("single");
    const e = { opponent: "A", difficulty: 2, isHome: true, finished: false };
    expect(cellKind([e, e])).toBe("double");
    expect(cellKind([e, e, e])).toBe("double");
  });
});
