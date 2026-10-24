import { describe, it, expect } from "vitest";
import { ELITE_GROUPS, ELITE_GROUP_IDS, isEliteGroupId, membersFromStandings, type LeagueStandingRow } from "../shared/elite-groups";

const row = (rank: number, entry: number, name = `M${entry}`): LeagueStandingRow => ({ rank, entry, player_name: name, entry_name: `Team ${entry}` });

describe("elite groups", () => {
  it("has the two leagues, each with a league id and the season it is for", () => {
    expect(ELITE_GROUP_IDS).toEqual(["elite-64", "analytics-elite-64"]);
    expect(ELITE_GROUPS["elite-64"]).toMatchObject({ name: "Elite 64", leagueId: 38543, season: "2026/27" });
    expect(ELITE_GROUPS["analytics-elite-64"]).toMatchObject({ name: "Analytics Elite 64", leagueId: 1291919, season: "2026/27" });
  });
  it("recognises only those group ids", () => {
    expect(isEliteGroupId("elite-64")).toBe(true);
    expect(isEliteGroupId("analytics-elite-64")).toBe(true);
    expect(isEliteGroupId("top-100")).toBe(false);
    expect(isEliteGroupId(undefined)).toBe(false);
  });
});

describe("membersFromStandings", () => {
  it("joins the standings pages in order and numbers the managers 1..n", () => {
    const m = membersFromStandings([[row(1, 500), row(2, 400)], [row(51, 300)]]);
    expect(m.map((x) => [x.rank, x.managerId, x.name])).toEqual([[1, 500, "M500"], [2, 400, "M400"], [3, 300, "M300"]]);
  });
  it("numbers tied managers one after the other, not with the league's shared rank", () => {
    const m = membersFromStandings([[row(1, 1), row(1, 2), row(3, 3)]]);
    expect(m.map((x) => x.rank)).toEqual([1, 2, 3]);
  });
  it("keeps a manager once even if two pages both list them", () => {
    const m = membersFromStandings([[row(1, 7)], [row(1, 7), row(2, 8)]]);
    expect(m.map((x) => x.managerId)).toEqual([7, 8]);
  });
  it("skips rows without a real entry id", () => {
    const m = membersFromStandings([[row(1, 0), row(2, -3), row(3, 9), { ...row(4, 1.5) }]]);
    expect(m.map((x) => x.managerId)).toEqual([9]);
  });
  it("keeps the team name, and is empty for no pages", () => {
    expect(membersFromStandings([[row(1, 5)]])[0].teamName).toBe("Team 5");
    expect(membersFromStandings([])).toEqual([]);
  });
});
