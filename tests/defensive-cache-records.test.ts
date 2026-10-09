import { describe, it, expect } from "vitest";
import { buildDefensiveRecords } from "../server/defensive-cache-records";

describe("buildDefensiveRecords", () => {
  it("reads the current { gw6: { dc, points } } format", () => {
    const recs = buildDefensiveRecords([
      { playerId: 4, gameweekProjections: { gw6: { dc: 8.1, points: 0.61 }, gw7: { dc: 8.3, points: 0.63 } } },
    ], "2026/27");
    expect(recs).toEqual([
      { playerId: 4, gameweek: 6, season: "2026/27", defensiveContribution: 8.1, points: 0.61 },
      { playerId: 4, gameweek: 7, season: "2026/27", defensiveContribution: 8.3, points: 0.63 },
    ]);
  });

  it("still reads the legacy numeric { '6': 8.1 } format", () => {
    const recs = buildDefensiveRecords([{ playerId: 4, gameweekProjections: { "6": 8.1 } }], "2026/27");
    expect(recs).toEqual([{ playerId: 4, gameweek: 6, season: "2026/27", defensiveContribution: 8.1, points: 0 }]);
  });

  it("skips zero-DC gameweeks and gameweeks outside 1-38", () => {
    const recs = buildDefensiveRecords([
      { playerId: 6, gameweekProjections: { gw6: { dc: 0, points: 0 }, gw39: { dc: 5, points: 0.1 } } },
    ], "2026/27");
    expect(recs).toEqual([]);
  });
});
