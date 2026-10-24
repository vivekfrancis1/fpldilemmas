// Two invitational FPL classic leagues of 64 managers, shown under Top Managers next to the All Time Top 100:
//   Elite 64            - the #Elite64 league run by FPL General
//   Analytics Elite 64  - the league of managers picked on FPL Research's analytics-based manager ratings
// FPL gives every league a new id each season (and the members change), so the ids below are updated once a year. The
// managers themselves are always read live from the league's standings, never copied here.
export type EliteGroupId = "elite-64" | "analytics-elite-64";

export interface EliteGroup {
  id: EliteGroupId;
  name: string;
  /** The classic league's id for `season`. */
  leagueId: number;
  season: string;
  description: string;
}

export const ELITE_GROUPS: Record<EliteGroupId, EliteGroup> = {
  "elite-64": {
    id: "elite-64",
    name: "Elite 64",
    leagueId: 38543,
    season: "2026/27",
    description: "The #Elite64 league: 64 of the best FPL managers in the world, invited each season",
  },
  "analytics-elite-64": {
    id: "analytics-elite-64",
    name: "Analytics Elite 64",
    leagueId: 1291919,
    season: "2026/27",
    description: "64 managers picked on analytics-based manager ratings (historical points, expected value and xG)",
  },
};

export const ELITE_GROUP_IDS = Object.keys(ELITE_GROUPS) as EliteGroupId[];

export function isEliteGroupId(value: unknown): value is EliteGroupId {
  return typeof value === "string" && (ELITE_GROUP_IDS as string[]).includes(value);
}

/** One row of FPL's classic-league standings (only the fields used here). */
export interface LeagueStandingRow {
  rank: number;
  entry: number;
  player_name: string;
  entry_name: string;
}

export interface EliteMember {
  /** 1-based, by the league's own order (points, then FPL's tie-break) so the table is numbered 1..n. */
  rank: number;
  name: string;
  managerId: number;
  teamName: string;
}

/** The members of a league from its standings pages: one row per manager (first one wins), numbered 1..n in standings order. */
export function membersFromStandings(pages: LeagueStandingRow[][]): EliteMember[] {
  const seen = new Set<number>();
  const members: EliteMember[] = [];
  for (const row of pages.flat()) {
    if (!row || !Number.isInteger(row.entry) || row.entry <= 0 || seen.has(row.entry)) continue;
    seen.add(row.entry);
    members.push({ rank: members.length + 1, name: row.player_name, managerId: row.entry, teamName: row.entry_name });
  }
  return members;
}
