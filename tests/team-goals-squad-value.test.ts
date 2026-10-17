import { describe, it, expect } from "vitest";
import {
  squadValue,
  squadValueWeight,
  dynamicBaseGoals,
  SQUAD_VALUE_COEFFICIENT,
  SQUAD_VALUE_MIN_GAMES,
  SQUAD_VALUE_TOP_N,
} from "../server/team-goals-squad-value";

describe("squadValue", () => {
  it("sums the top 14 player prices (in tenths of a million) and returns £m", () => {
    const prices = [150, 130, 100, 90, 80, 70, 60, 60, 55, 55, 50, 50, 45, 45, 40, 40, 40];
    // top 14: 150+130+100+90+80+70+60+60+55+55+50+50+45+45 = 1040 -> 104.0
    expect(squadValue(prices)).toBeCloseTo(104.0, 9);
  });
  it("does not depend on the order of the list", () => {
    const prices = [45, 150, 60, 130, 100, 90, 80, 70, 60, 55, 55, 50, 50, 45, 40, 40, 40];
    expect(squadValue(prices)).toBeCloseTo(104.0, 9);
  });
  it("sums everyone when a squad has fewer than 14 players, and is null for no players", () => {
    expect(squadValue([50, 50, 50])).toBeCloseTo(15, 9);
    expect(squadValue([])).toBeNull();
  });
  it("uses the fitted constants", () => {
    expect(SQUAD_VALUE_TOP_N).toBe(14);
    expect(SQUAD_VALUE_COEFFICIENT).toBe(0.06);
    expect(SQUAD_VALUE_MIN_GAMES).toBe(3);
  });
});

describe("squadValueWeight (goals per £m of squad-value gap)", () => {
  it("is 0.06 / games, so it is 0.01 at 6 games and 0.003 at 20", () => {
    expect(squadValueWeight(6)).toBeCloseTo(0.01, 9);
    expect(squadValueWeight(20)).toBeCloseTo(0.003, 9);
  });
  it("is capped at 0.06 / 3 = 0.02 for 3 or fewer games so a tiny sample can't over-weight it", () => {
    expect(squadValueWeight(3)).toBeCloseTo(0.02, 9);
    expect(squadValueWeight(1)).toBeCloseTo(0.02, 9);
    expect(squadValueWeight(0)).toBeCloseTo(0.02, 9);
  });
  it("shrinks as games are played", () => {
    expect(squadValueWeight(4)).toBeGreaterThan(squadValueWeight(8));
    expect(squadValueWeight(8)).toBeGreaterThan(squadValueWeight(30));
  });
});

describe("dynamicBaseGoals (before the venue multiplier)", () => {
  const stats = { goalsFor: 1.5, xgFor: 1.4, oppGoalsAgainst: 1.0, oppXgAgainst: 1.2 };

  it("is exactly the original 25/25/25/25 average when the two squads are equal", () => {
    // 0.25 x (1.5 + 1.4 + 1.0 + 1.2) = 1.275
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: 90, squadValueOpp: 90, games: 6 })).toBeCloseTo(1.275, 9);
  });
  it("is the original average when a squad value is missing (no adjustment can be made)", () => {
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: null, squadValueOpp: 90, games: 6 })).toBeCloseTo(1.275, 9);
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: 90, squadValueOpp: null, games: 6 })).toBeCloseTo(1.275, 9);
  });
  it("hand check: a £29m gap at 6 games adds 29 x 0.01 = 0.29 goals to the richer side", () => {
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: 102, squadValueOpp: 73, games: 6 })).toBeCloseTo(1.275 + 0.29, 9);
  });
  it("hand check: the poorer side loses the same 0.29", () => {
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: 73, squadValueOpp: 102, games: 6 })).toBeCloseTo(1.275 - 0.29, 9);
  });
  it("leaves a fixture's total goals unchanged: the two sides' adjustments cancel exactly", () => {
    const a = dynamicBaseGoals({ ...stats, squadValueTeam: 102, squadValueOpp: 73, games: 8 });
    const b = dynamicBaseGoals({ ...stats, squadValueTeam: 73, squadValueOpp: 102, games: 8 });
    expect(a + b).toBeCloseTo(2 * 1.275, 9);
  });
  it("fades with games played: the same gap moves the number less after 20 games than after 6", () => {
    const at6 = dynamicBaseGoals({ ...stats, squadValueTeam: 100, squadValueOpp: 80, games: 6 }) - 1.275;
    const at20 = dynamicBaseGoals({ ...stats, squadValueTeam: 100, squadValueOpp: 80, games: 20 }) - 1.275;
    expect(at6).toBeCloseTo(0.2, 9);
    expect(at20).toBeCloseTo(0.06, 9);
  });
  it("raises a richer side and lowers a poorer one relative to the equal-squads number", () => {
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: 95, squadValueOpp: 75, games: 6 })).toBeGreaterThan(1.275);
    expect(dynamicBaseGoals({ ...stats, squadValueTeam: 75, squadValueOpp: 95, games: 6 })).toBeLessThan(1.275);
  });
  it("keeps the old fallback when xG is missing: goals take the whole half", () => {
    // attack 0.5 x 2.0 + defence 0.5 x 1.0 = 1.5
    expect(dynamicBaseGoals({ goalsFor: 2.0, xgFor: null, oppGoalsAgainst: 1.0, oppXgAgainst: null, squadValueTeam: 80, squadValueOpp: 80, games: 6 })).toBeCloseTo(1.5, 9);
  });
});
