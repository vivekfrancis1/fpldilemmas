// Pure helpers behind the Fixture Analyzer grid (/fixtures): which fixture goes in which team/gameweek cell, and
// which gameweeks to tag DGW (some team plays twice) or BGW (some team has no fixture). Moved out of the page so
// double, blank and TBC gameweeks can be tested with made-up fixtures (none of them exist in the live list at times).

export type FixtureEntry = {
  opponent: string;
  difficulty: number;
  isHome: boolean;
  finished: boolean;
  fixtureId?: number;
  value?: number;
  valueLabel?: string;
  source?: string;
};

export type FixtureMatrix = Record<number, Record<number, FixtureEntry[]>>;

export interface GridFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
}

/**
 * One row per team; each cell is that team's fixtures in the gameweek (two = double, none = blank).
 * Fixtures with no gameweek (TBC, `event` null) sit in column 0 unless `assignments` moves them to a gameweek, and
 * are always added AFTER the regular fixtures so they show as the second match of that gameweek.
 */
export function fillFixtureMatrix(input: {
  teams: Array<{ id: number; short_name: string }>;
  fixtures: GridFixture[];
  range: { start: number; end: number };
  /** TBC fixture id -> gameweek it is assumed to be played in. */
  assignments: Record<number, number>;
  /** Final difficulty for a fixture: (official difficulty, opponent team id, is the row's team at home). */
  difficultyOf: (originalDifficulty: number, opponentId: number, isHome: boolean) => number;
}): FixtureMatrix {
  const { teams, fixtures, range, assignments, difficultyOf } = input;
  const matrix: FixtureMatrix = {};
  teams.forEach((t) => { matrix[t.id] = {}; });
  const byId = new Map(teams.map((t) => [t.id, t]));

  const place = (fixture: GridFixture, gwKey: number, withId: boolean) => {
    const home = byId.get(fixture.team_h);
    const away = byId.get(fixture.team_a);
    if (!home || !away) return;
    (matrix[fixture.team_h][gwKey] ??= []).push({
      opponent: away.short_name,
      difficulty: difficultyOf(fixture.team_h_difficulty, away.id, true),
      isHome: true,
      finished: fixture.finished,
      ...(withId ? { fixtureId: fixture.id } : {}),
    });
    (matrix[fixture.team_a][gwKey] ??= []).push({
      opponent: home.short_name,
      difficulty: difficultyOf(fixture.team_a_difficulty, home.id, false),
      isHome: false,
      finished: fixture.finished,
      ...(withId ? { fixtureId: fixture.id } : {}),
    });
  };

  // Pass 1: regular fixtures in range
  for (const f of fixtures) {
    if (f.event === null || f.event < range.start || f.event > range.end) continue;
    place(f, f.event, false);
  }
  // Pass 2: TBC fixtures, in their assigned gameweek or the TBC column (0)
  for (const f of fixtures) {
    if (f.event !== null) continue;
    place(f, assignments[f.id] ?? 0, true);
  }
  return matrix;
}

/** Does any team play twice in this gameweek? */
export function gwHasDouble(matrix: FixtureMatrix, gw: number): boolean {
  return Object.values(matrix).some((m) => (m?.[gw]?.length ?? 0) > 1);
}

/** Does any team have no fixture in this gameweek? (A fixture moved to TBC leaves its team blank until it is placed.) */
export function gwHasBlank(matrix: FixtureMatrix, gw: number): boolean {
  return Object.values(matrix).some((m) => (m?.[gw]?.length ?? 0) === 0);
}

export function cellKind(entries: FixtureEntry[] | undefined): "blank" | "single" | "double" {
  const n = entries?.length ?? 0;
  return n === 0 ? "blank" : n === 1 ? "single" : "double";
}
