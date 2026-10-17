import { describe, it, expect } from "vitest";
import {
  strengthWeight,
  expectedGoalsFromStrength,
  teamStrengthRating,
  STRENGTH_MAX_WEIGHT,
} from "../server/team-goals-strength";

const L = 1.5; // league-average goals per team per game

describe("strengthWeight", () => {
  it("is 0 with no games and grows with games played, never exceeding the max", () => {
    expect(strengthWeight(0)).toBe(0);
    expect(strengthWeight(2)).toBeLessThan(strengthWeight(6));
    expect(strengthWeight(6)).toBeLessThan(strengthWeight(30));
    expect(strengthWeight(1000)).toBeLessThanOrEqual(STRENGTH_MAX_WEIGHT);
  });
  it("the max weight is 0.5: each side takes half of the goal-difference gap", () => {
    expect(STRENGTH_MAX_WEIGHT).toBe(0.5);
  });
});

describe("expectedGoalsFromStrength", () => {
  const base = { leagueAvg: L, venueMultiplier: 1, games: 6 };
  it("gives two equal teams the same number, equal to the league average at neutral venue when games=0", () => {
    const a = expectedGoalsFromStrength({ ...base, rating: 0.4, oppRating: 0.4 });
    const b = expectedGoalsFromStrength({ ...base, rating: 0.4, oppRating: 0.4 });
    expect(a).toBeCloseTo(L, 9);
    expect(a).toBe(b);
    expect(expectedGoalsFromStrength({ ...base, games: 0, rating: 1.2, oppRating: -0.5 })).toBeCloseTo(L, 9);
  });
  it("raises the favourite and lowers the underdog relative to the league average", () => {
    const fav = expectedGoalsFromStrength({ ...base, rating: 1.0, oppRating: -0.5 });
    const dog = expectedGoalsFromStrength({ ...base, rating: -0.5, oppRating: 1.0 });
    expect(fav).toBeGreaterThan(L);
    expect(dog).toBeLessThan(L);
  });
  it("preserves the league mean: the two sides of a fixture average out to the league average", () => {
    const fav = expectedGoalsFromStrength({ ...base, rating: 1.0, oppRating: -0.5 });
    const dog = expectedGoalsFromStrength({ ...base, rating: -0.5, oppRating: 1.0 });
    expect((fav + dog) / 2).toBeCloseTo(L, 9);
  });
  it("lets the opponent's attack and the team's own defence matter (both are inside a rating)", () => {
    const weakOpp = expectedGoalsFromStrength({ ...base, rating: 0.3, oppRating: -0.6 });
    const strongOpp = expectedGoalsFromStrength({ ...base, rating: 0.3, oppRating: 0.9 });
    expect(weakOpp).toBeGreaterThan(strongOpp);
  });
  it("moves the number less with fewer games played", () => {
    const early = expectedGoalsFromStrength({ ...base, games: 2, rating: 1.0, oppRating: -0.5 });
    const later = expectedGoalsFromStrength({ ...base, games: 6, rating: 1.0, oppRating: -0.5 });
    expect(Math.abs(early - L)).toBeLessThan(Math.abs(later - L));
  });
  it("applies the venue multiplier and never goes below 0", () => {
    const home = expectedGoalsFromStrength({ ...base, venueMultiplier: 1.15, rating: 0, oppRating: 0 });
    expect(home).toBeCloseTo(L * 1.15, 9);
    expect(expectedGoalsFromStrength({ ...base, games: 38, leagueAvg: 0.2, rating: -5, oppRating: 5 })).toBe(0);
  });
});

describe("teamStrengthRating", () => {
  it("uses xG for minus xG against per game when available", () => {
    expect(teamStrengthRating({ played: 4, goalsFor: 10, goalsAgainst: 2, expectedGoalsFor: 6, expectedGoalsAgainst: 4 })).toBeCloseTo(0.5, 9);
  });
  it("falls back to goal difference per game when xG is missing", () => {
    expect(teamStrengthRating({ played: 4, goalsFor: 10, goalsAgainst: 2 })).toBeCloseTo(2, 9);
  });
  it("returns null with no games played", () => {
    expect(teamStrengthRating({ played: 0, goalsFor: 0, goalsAgainst: 0 })).toBeNull();
  });
});
