import { describe, it, expect } from "vitest";
import { playerWeight, allocateTeamTotal } from "../server/minutes-allocation";

describe("playerWeight", () => {
  it("is the per-90 rate times the fraction of a match expected to be played", () => {
    expect(playerWeight(0.6, 90)).toBeCloseTo(0.6, 9);
    expect(playerWeight(0.6, 45)).toBeCloseTo(0.3, 9);
    expect(playerWeight(0.6, 0)).toBe(0);
  });
});

describe("allocateTeamTotal", () => {
  it("splits the team total in proportion to weights and conserves it exactly", () => {
    const out = allocateTeamTotal(2, new Map([[1, 0.6], [2, 0.3], [3, 0.1]]))!;
    expect(out.get(1)).toBeCloseTo(1.2, 9);
    expect(out.get(2)).toBeCloseTo(0.6, 9);
    expect(out.get(3)).toBeCloseTo(0.2, 9);
    expect([...out.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(2, 9);
  });

  it("redistributes automatically when a teammate is expected to play 0 minutes (Brobbey out, Isidor in)", () => {
    const healthy = allocateTeamTotal(1.3, new Map([[10, playerWeight(0.66, 88)], [11, playerWeight(0.5, 22)]]))!;
    const brobbeyOut = allocateTeamTotal(1.3, new Map([[10, playerWeight(0.66, 0)], [11, playerWeight(0.5, 77)]]))!;
    expect(brobbeyOut.get(10)).toBe(0);
    expect(brobbeyOut.get(11)!).toBeGreaterThan(healthy.get(11)!);
    // the stand-in can never exceed the team's whole projection
    expect(brobbeyOut.get(11)!).toBeCloseTo(1.3, 9);
  });

  it("returns null when no one has a positive weight, so callers can fall back", () => {
    expect(allocateTeamTotal(1.3, new Map([[1, 0], [2, 0]]))).toBeNull();
    expect(allocateTeamTotal(1.3, new Map())).toBeNull();
  });

  it("ignores negative or non-finite weights", () => {
    const out = allocateTeamTotal(1, new Map([[1, 1], [2, -5], [3, NaN]]))!;
    expect(out.get(1)).toBeCloseTo(1, 9);
    expect(out.get(2)).toBe(0);
    expect(out.get(3)).toBe(0);
  });
});
