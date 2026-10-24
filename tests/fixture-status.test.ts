import { describe, it, expect } from "vitest";
import { completedFixtures, isFixtureActuallyOver, xgfCacheUsable } from "../shared/fixture-status";

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

describe("completedFixtures: what the live table is built from", () => {
  const f = (id: number, over: Record<string, unknown>) => ({ id, event: 8, team_h: 1, team_a: 2, team_h_score: 2, team_a_score: 1, finished: false, finished_provisional: false, ...over });
  it("keeps finished and provisionally finished matches with a score, nothing else", () => {
    const list = [
      f(1, { finished: true, finished_provisional: true }),
      f(2, { finished_provisional: true }), // Aston Villa 2-1 Man City: over, FPL has not confirmed bonus yet
      f(3, {}), // not started
      f(4, { finished_provisional: true, team_h_score: null, team_a_score: null }), // no score to count
      f(5, { finished: true, team_a_score: null }),
    ];
    expect(completedFixtures(list).map((x) => x.id)).toEqual([1, 2]);
  });
});

describe("xgfCacheUsable: the per-match stats cache is only reused if it has every gameweek asked for", () => {
  const cache = { timestamp: 1_000, requested: new Set([1, 2, 3]) };
  it("fresh and complete", () => {
    expect(xgfCacheUsable(cache, [1, 3], 1_500, 3_600_000)).toBe(true);
    expect(xgfCacheUsable(cache, [], 1_500, 3_600_000)).toBe(true);
  });
  it("a gameweek whose first match has just ended is fetched straight away", () => {
    expect(xgfCacheUsable(cache, [1, 2, 3, 4], 1_500, 3_600_000)).toBe(false);
  });
  it("too old, or no cache", () => {
    expect(xgfCacheUsable(cache, [1], 1_000 + 3_600_000, 3_600_000)).toBe(false);
    expect(xgfCacheUsable(null, [1], 1_500, 3_600_000)).toBe(false);
  });
});
