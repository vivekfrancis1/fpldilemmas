import { describe, it, expect } from "vitest";
import { isFixtureActuallyOver } from "../shared/fixture-status";

describe("isFixtureActuallyOver: a match counts as played at full time, before FPL confirms bonus points", () => {
  it("finished", () => {
    expect(isFixtureActuallyOver({ finished: true, finished_provisional: true })).toBe(true);
    expect(isFixtureActuallyOver({ finished: true })).toBe(true);
  });
  it("provisionally finished: the match is over, FPL has not set `finished` yet (Aston Villa 2-1 Man City, GW8)", () => {
    expect(isFixtureActuallyOver({ finished: false, finished_provisional: true })).toBe(true);
  });
  it("not started, or still being played", () => {
    expect(isFixtureActuallyOver({ finished: false, finished_provisional: false, started: false })).toBe(false);
    expect(isFixtureActuallyOver({ finished: false, finished_provisional: false, started: true })).toBe(false);
    expect(isFixtureActuallyOver({})).toBe(false);
  });
});
