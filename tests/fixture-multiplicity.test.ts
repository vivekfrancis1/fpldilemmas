import { describe, it, expect } from "vitest";
import { fixtureCountsByTeamGW, applyFixtureMultiplicity } from "../server/fixture-multiplicity";

const fixtures = [
  { event: 7, team_h: 1, team_a: 2 },
  { event: 7, team_h: 3, team_a: 1 }, // team 1 plays twice in GW7
  { event: 8, team_h: 2, team_a: 3 },
  { event: null, team_h: 1, team_a: 3 }, // TBC fixture: no gameweek yet
];

describe("fixtureCountsByTeamGW", () => {
  it("counts fixtures per team per gameweek, ignoring TBC and out-of-range fixtures", () => {
    const m = fixtureCountsByTeamGW(fixtures, 7, 8);
    expect(m.get("1-7")).toBe(2);
    expect(m.get("2-7")).toBe(1);
    expect(m.get("3-7")).toBe(1);
    expect(m.get("1-8")).toBeUndefined();
    expect(fixtureCountsByTeamGW(fixtures, 8, 8).get("1-7")).toBeUndefined();
  });
});

describe("applyFixtureMultiplicity", () => {
  const base = () => ({ goals: 0.4, minutes: 2, defensiveContributions: 0.3, points: 0 });

  it("leaves a single-fixture gameweek unchanged", () => {
    const b = base();
    applyFixtureMultiplicity(b, 1);
    expect(b.minutes).toBe(2);
    expect(b.defensiveContributions).toBe(0.3);
  });
  it("doubles the per-fixture components (minutes, DC) for a double gameweek and leaves summed ones alone", () => {
    const b = base();
    applyFixtureMultiplicity(b, 2);
    expect(b.minutes).toBe(4);
    expect(b.defensiveContributions).toBeCloseTo(0.6, 9);
    expect(b.goals).toBe(0.4); // goals already sum over fixtures upstream
  });
  it("zeroes every component for a blank gameweek", () => {
    const b = base();
    applyFixtureMultiplicity(b, 0);
    expect(b).toEqual({ goals: 0, minutes: 0, defensiveContributions: 0, points: 0 });
  });
});
