// Where one team would sit among a group of managers (All time Top 100, Elite 64, content creators, any classic league),
// by season total points and by gameweek points. Ranking is "1 + the managers with strictly more points", so a tie
// shares a place. Managers whose points could not be loaded are left out and counted in `missing`.

export interface PlacementMember {
  managerId: number;
  totalPoints: number | null;
  gameweekPoints: number | null;
}

export interface Placement {
  /** Managers ranked, including you. */
  size: number;
  /** You were already one of the group (you are not counted twice). */
  isMember: boolean;
  /** Members left out because their points were not available. */
  missing: number;
  totalRank: number | null;
  gameweekRank: number | null;
  /** Points needed to draw level with the nearest manager above you; null when nobody is above. */
  totalPointsToNextPlace: number | null;
  /** Your lead over the nearest manager below you; null when nobody is below. */
  totalPointsAheadOfNext: number | null;
}

export function placeInGroup(members: PlacementMember[], you: PlacementMember): Placement {
  const others = members.filter((x) => x.managerId !== you.managerId);
  const isMember = others.length !== members.length;
  const ranked = (pick: (x: PlacementMember) => number | null) => others.map(pick).filter((v): v is number => v !== null);
  const totals = ranked((x) => x.totalPoints);
  const gameweeks = ranked((x) => x.gameweekPoints);

  const rankOf = (mine: number | null, pool: number[]) => (mine === null ? null : 1 + pool.filter((v) => v > mine).length);
  const above = you.totalPoints === null ? [] : totals.filter((v) => v > you.totalPoints!);
  const below = you.totalPoints === null ? [] : totals.filter((v) => v < you.totalPoints!);

  return {
    size: others.filter((x) => x.totalPoints !== null || x.gameweekPoints !== null).length + 1,
    isMember,
    missing: others.filter((x) => x.totalPoints === null && x.gameweekPoints === null).length,
    totalRank: rankOf(you.totalPoints, totals),
    gameweekRank: rankOf(you.gameweekPoints, gameweeks),
    totalPointsToNextPlace: above.length ? Math.min(...above) - you.totalPoints! : null,
    totalPointsAheadOfNext: below.length ? you.totalPoints! - Math.max(...below) : null,
  };
}

/** One row of FPL's classic-league standings (only the fields used here). */
export interface StandingsRow {
  rank: number;
  entry: number;
  player_name: string;
  entry_name: string;
  total: number;
  event_total: number;
}

export interface LeagueRow {
  rank: number;
  managerId: number;
  name: string;
  teamName: string;
  totalPoints: number;
  gameweekPoints: number;
}

/** The managers of a league from its standings pages: one row per manager (first wins), in standings order. */
export function leagueRowsFromStandings(pages: StandingsRow[][]): LeagueRow[] {
  const seen = new Set<number>();
  const rows: LeagueRow[] = [];
  for (const r of pages.flat()) {
    if (!r || !Number.isInteger(r.entry) || r.entry <= 0 || seen.has(r.entry)) continue;
    seen.add(r.entry);
    rows.push({
      rank: r.rank,
      managerId: r.entry,
      name: r.player_name,
      teamName: r.entry_name,
      totalPoints: Number(r.total) || 0,
      gameweekPoints: Number(r.event_total) || 0,
    });
  }
  return rows;
}

/** Each manager's place by total points among `rows` (the Position column): 1 + the managers with strictly more, so a tie shares a place; null when they have no points. */
export function positionsByTotal(rows: PlacementMember[]): Map<number, number | null> {
  const totals = rows.map((r) => r.totalPoints).filter((v): v is number => v !== null);
  return new Map(rows.map((r) => [r.managerId, r.totalPoints === null ? null : 1 + totals.filter((v) => v > r.totalPoints!).length]));
}
