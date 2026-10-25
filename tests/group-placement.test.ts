import { describe, it, expect } from "vitest";
import { placeInGroup, leagueRowsFromStandings, positionsByTotal, type PlacementMember } from "../shared/group-placement";

const m = (managerId: number, totalPoints: number | null, gameweekPoints: number | null = 0): PlacementMember => ({ managerId, totalPoints, gameweekPoints });
const group = [m(1, 500, 60), m(2, 480, 70), m(3, 450, 40), m(4, 450, 55)];

describe("placeInGroup (where one team would sit among a group)", () => {
  it("ranks by total points: 1 + the managers with strictly more", () => {
    const p = placeInGroup(group, m(99, 470, 50));
    expect(p.totalRank).toBe(3); // 500 and 480 are ahead
    expect(p.size).toBe(5); // four managers plus you
    expect(p.isMember).toBe(false);
  });

  it("ranks gameweek points the same way, separately from the total", () => {
    expect(placeInGroup(group, m(99, 470, 50)).gameweekRank).toBe(4); // 60, 70, 55 ahead
  });

  it("shares a place on a tie instead of pushing you down", () => {
    expect(placeInGroup(group, m(99, 450, 40)).totalRank).toBe(3);
    expect(placeInGroup(group, m(99, 500, 70)).totalRank).toBe(1);
  });

  it("is first when ahead of everyone and last when behind everyone", () => {
    expect(placeInGroup(group, m(99, 900, 99))).toMatchObject({ totalRank: 1, gameweekRank: 1 });
    expect(placeInGroup(group, m(99, 10, 1))).toMatchObject({ totalRank: 5, gameweekRank: 5 });
  });

  it("gives the points to the place above and the lead over the place below", () => {
    const p = placeInGroup(group, m(99, 470, 50));
    expect(p.totalPointsToNextPlace).toBe(10); // 480 - 470
    expect(p.totalPointsAheadOfNext).toBe(20); // 470 - 450
    expect(placeInGroup(group, m(99, 900, 99)).totalPointsToNextPlace).toBeNull(); // nobody above
    expect(placeInGroup(group, m(99, 10, 1)).totalPointsAheadOfNext).toBeNull(); // nobody below
  });

  it("a team that is already a member is not counted against itself", () => {
    const p = placeInGroup(group, m(3, 450, 40));
    expect(p.isMember).toBe(true);
    expect(p.size).toBe(4);
    expect(p.totalRank).toBe(3);
    expect(p.gameweekRank).toBe(4);
  });

  it("leaves out members whose points could not be loaded, and says how many", () => {
    const p = placeInGroup([...group, m(5, null, null)], m(99, 470, 50));
    expect(p.size).toBe(5);
    expect(p.missing).toBe(1);
    expect(p.totalRank).toBe(3);
  });

  it("has no rank for a measure you have no points for", () => {
    const p = placeInGroup(group, m(99, null, 50));
    expect(p.totalRank).toBeNull();
    expect(p.gameweekRank).toBe(4);
  });

  it("works for an empty group", () => {
    expect(placeInGroup([], m(99, 10, 1))).toMatchObject({ size: 1, totalRank: 1, gameweekRank: 1 });
  });
});

describe("leagueRowsFromStandings (FPL classic league standings pages -> one row per manager)", () => {
  const row = (entry: number, total: number, event_total: number, rank = entry) => ({ entry, rank, player_name: `P${entry}`, entry_name: `T${entry}`, total, event_total });

  it("maps the fields, one row per manager (first wins), in standings order", () => {
    const rows = leagueRowsFromStandings([[row(1, 100, 10), row(2, 90, 5)], [row(2, 1, 1), row(3, 80, 20)]]);
    expect(rows.map((r) => r.managerId)).toEqual([1, 2, 3]);
    expect(rows[1]).toMatchObject({ rank: 2, name: "P2", teamName: "T2", totalPoints: 90, gameweekPoints: 5 });
  });

  it("skips malformed rows", () => {
    const rows = leagueRowsFromStandings([[row(1, 100, 10), { entry: 0 } as any, null as any, row(4, 70, 7)]]);
    expect(rows.map((r) => r.managerId)).toEqual([1, 4]);
  });
});

describe("positionsByTotal (the Position column: each manager's place by total points)", () => {
  it("numbers managers by total points, highest first, ties sharing a place", () => {
    const pos = positionsByTotal([m(1, 450), m(2, 500), m(3, 450), m(4, 480)]);
    expect([pos.get(2), pos.get(4), pos.get(1), pos.get(3)]).toEqual([1, 2, 3, 3]);
  });

  it("the place after a tie skips the tied places (competition ranking)", () => {
    const pos = positionsByTotal([m(1, 500), m(2, 500), m(3, 400)]);
    expect(pos.get(3)).toBe(3);
  });

  it("gives no position to a manager without points, and does not count them", () => {
    const pos = positionsByTotal([m(1, 500), m(2, null), m(3, 400)]);
    expect(pos.get(2)).toBeNull();
    expect(pos.get(3)).toBe(2);
  });

  it("agrees with placeInGroup for a team added to the group", () => {
    const rows = [...group, m(99, 470)];
    expect(positionsByTotal(rows).get(99)).toBe(placeInGroup(group, m(99, 470)).totalRank);
  });
});
