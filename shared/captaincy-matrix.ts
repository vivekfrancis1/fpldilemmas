// Captaincy Matrix: each team's best captain options for one gameweek, ranked by our own expected
// points (the same cached projections the Points page shows). Nothing is recomputed here — xPts are
// taken exactly as the projection gives them (a double gameweek's value is already the whole-gameweek
// figure) and the only arithmetic is the captain's 2x multiplier.

export interface MatrixElement {
  id: number;
  team: number;
  web_name: string;
  element_type: number;
  selected_by_percent: string | number;
}

export interface MatrixTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface MatrixFixture {
  event: number | null;
  finished?: boolean;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

export interface MatrixProjection {
  playerId: number;
  gameweekProjections?: Record<string, number>;
  status?: string;
  chanceOfPlayingNextRound?: number | null;
  news?: string;
}

export interface CaptainCandidate {
  playerId: number;
  name: string;
  position: string;
  xPts: number;
  /** 2 x xPts, rounded to 2 dp. */
  captainPoints: number;
  /** Official overall ownership %, not effective ownership. */
  ownership: number | null;
  status: string;
  chanceOfPlayingNextRound: number | null;
  news: string;
}

export interface MatrixTeamRow {
  /** true when the team has no fixture this gameweek but has an unscheduled (TBC) one, so it is not a confirmed blank. */
  fixtureTbc: boolean;
  teamId: number;
  teamName: string;
  shortName: string;
  fixtures: Array<{ opponentId: number; opponentShort: string; isHome: boolean; difficulty: number }>;
  candidates: CaptainCandidate[];
}

import { teamsWithUnscheduledFixtures } from "./compare-utils";

export const MATRIX_POSITIONS = ["GKP", "DEF", "MID", "FWD"] as const;

export const POSITION_SHORT: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildCaptaincyMatrix(input: {
  gameweek: number;
  elements: MatrixElement[];
  teams: MatrixTeam[];
  fixtures: MatrixFixture[];
  projections: MatrixProjection[];
  topN?: number;
  /** Only these positions are eligible (GKP/DEF/MID/FWD). Empty or omitted = all. Applied before topN. */
  positions?: string[];
}): { gameweek: number; teams: MatrixTeamRow[] } {
  const { gameweek, elements, teams, fixtures, projections, topN = 3, positions = [] } = input;
  const projectionById = new Map(projections.map((p) => [p.playerId, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const tbcTeams = teamsWithUnscheduledFixtures(fixtures as any);

  const rows: MatrixTeamRow[] = teams.map((team) => {
    const teamFixtures = fixtures
      .filter((f) => f.event === gameweek && (f.team_h === team.id || f.team_a === team.id))
      .map((f) => {
        const isHome = f.team_h === team.id;
        const opponentId = isHome ? f.team_a : f.team_h;
        return {
          opponentId,
          opponentShort: teamById.get(opponentId)?.short_name ?? "?",
          isHome,
          difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
        };
      });

    // A confirmed blank (no fixture and nothing unscheduled) has no captain options, never "0 xPts" candidates. A team whose
    // fixture is still TBC keeps its candidates: the projections decide, we don't claim a blank we can't confirm.
    const fixtureTbc = teamFixtures.length === 0 && tbcTeams.has(team.id);
    const candidates: CaptainCandidate[] =
      teamFixtures.length === 0 && !fixtureTbc
        ? []
        : elements
            .filter((e) => e.team === team.id && (positions.length === 0 || positions.includes(POSITION_SHORT[e.element_type])))
            .flatMap((e) => {
              const p = projectionById.get(e.id);
              const xPts = p?.gameweekProjections?.[String(gameweek)];
              if (typeof xPts !== "number") return [];
              const ownership = parseFloat(String(e.selected_by_percent));
              return [
                {
                  playerId: e.id,
                  name: e.web_name,
                  position: POSITION_SHORT[e.element_type] ?? "",
                  xPts,
                  captainPoints: round2(xPts * 2),
                  ownership: Number.isFinite(ownership) ? ownership : null,
                  status: p?.status ?? "a",
                  chanceOfPlayingNextRound: p?.chanceOfPlayingNextRound ?? null,
                  news: p?.news ?? "",
                },
              ];
            })
            .sort((a, b) => b.xPts - a.xPts || a.playerId - b.playerId)
            .slice(0, topN);

    return { fixtureTbc, teamId: team.id, teamName: team.name, shortName: team.short_name, fixtures: teamFixtures, candidates };
  });

  rows.sort((a, b) => {
    const aBlank = a.candidates.length === 0;
    const bBlank = b.candidates.length === 0;
    if (aBlank !== bBlank) return aBlank ? 1 : -1;
    const diff = (b.candidates[0]?.xPts ?? 0) - (a.candidates[0]?.xPts ?? 0);
    return diff || a.teamId - b.teamId;
  });

  return { gameweek, teams: rows };
}
