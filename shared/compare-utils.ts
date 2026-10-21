// Pure helpers for the Compare page (/compare). No calculations of our own live here: totals come from
// the FPL data, expected points from the cached projection endpoint, and these helpers only select,
// match and highlight.

export const MAX_COMPARE_PLAYERS = 5;

export type BetterDirection = "higher" | "lower";

export interface CompareStat {
  key: string;
  label: string;
  /** null = a neutral stat (price, ownership, transfers) that is never highlighted. */
  better: BetterDirection | null;
}

export const COMPARE_STATS: CompareStat[] = [
  { key: "total_points", label: "Total Points", better: "higher" },
  { key: "minutes", label: "Minutes", better: "higher" },
  { key: "goals_scored", label: "Goals", better: "higher" },
  { key: "assists", label: "Assists", better: "higher" },
  { key: "clean_sheets", label: "Clean Sheets", better: "higher" },
  { key: "goals_conceded", label: "Goals Conceded", better: "lower" },
  { key: "own_goals", label: "Own Goals", better: "lower" },
  { key: "penalties_saved", label: "Penalties Saved", better: "higher" },
  { key: "penalties_missed", label: "Penalties Missed", better: "lower" },
  { key: "yellow_cards", label: "Yellow Cards", better: "lower" },
  { key: "red_cards", label: "Red Cards", better: "lower" },
  { key: "saves", label: "Saves", better: "higher" },
  { key: "bonus", label: "Bonus Points", better: "higher" },
  { key: "bps", label: "BPS", better: "higher" },
  { key: "influence", label: "Influence", better: "higher" },
  { key: "creativity", label: "Creativity", better: "higher" },
  { key: "threat", label: "Threat", better: "higher" },
  { key: "ict_index", label: "ICT Index", better: "higher" },
  { key: "now_cost", label: "Current Price", better: null },
  { key: "selected_by_percent", label: "Selected %", better: null },
  { key: "transfers_in_event", label: "Transfers In", better: null },
  { key: "transfers_out_event", label: "Transfers Out", better: null },
];

/** "411,12,300" -> [411, 12, 300]. Dedupes, drops junk, keeps at most MAX_COMPARE_PLAYERS. */
export function parseCompareIds(param: string | null | undefined): number[] {
  if (!param) return [];
  const ids: number[] = [];
  for (const raw of param.split(",")) {
    const text = raw.trim();
    if (!/^\d+$/.test(text)) continue;
    const id = Number(text);
    if (id <= 0 || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length === MAX_COMPARE_PLAYERS) break;
  }
  return ids;
}

/**
 * Indexes of the best value(s) in a row. Missing values are ignored; fewer than two real values, or all
 * real values equal, highlights nothing. Players sharing the best value are all highlighted.
 */
export function bestValueIndexes(values: Array<number | null | undefined>, better: BetterDirection): number[] {
  const real = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => typeof x.v === "number" && Number.isFinite(x.v));
  if (real.length < 2) return [];
  const nums = real.map((x) => x.v);
  const best = better === "higher" ? Math.max(...nums) : Math.min(...nums);
  if (nums.every((n) => n === best)) return [];
  return real.filter((x) => x.v === best).map((x) => x.i);
}

/**
 * Finds a player's row in a past season by FPL player code (element_code). Names are never used: two
 * different players can share a name, and a renamed player keeps the same code.
 */
export function findHistoricalByCode<T extends { element_code?: number | null; elementCode?: number | null }>(
  rows: T[] | undefined | null,
  code: number | undefined | null,
): T | null {
  if (!rows || !code) return null;
  return rows.find((r) => (r.element_code ?? r.elementCode) === code) ?? null;
}

export interface ProjectionWindow {
  gameweeks: number[];
  /** xPts per gameweek, null where the projection has no value for that gameweek (never 0). */
  perGameweek: Array<number | null>;
  /** Sum of the non-null values, rounded to 2 dp; null when there are none. */
  total: number | null;
}

/**
 * xPts for a set of gameweeks from a player's cached `gameweekProjections`. Pass a number to take the
 * first N gameweeks present in this projection, or an explicit list so every player uses the same weeks.
 */
export function projectionWindow(
  gameweekProjections: Record<string, number> | undefined | null,
  gameweeks: number | number[],
): ProjectionWindow {
  const proj = gameweekProjections ?? {};
  const gws = Array.isArray(gameweeks)
    ? gameweeks
    : Object.keys(proj).map(Number).filter(Number.isFinite).sort((a, b) => a - b).slice(0, gameweeks);
  const perGameweek = gws.map((gw) => {
    const v = proj[String(gw)];
    return typeof v === "number" ? v : null;
  });
  const real = perGameweek.filter((v): v is number => v !== null);
  const total = real.length ? Math.round(real.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  return { gameweeks: gws, perGameweek, total };
}

export interface CompareFixtureInput {
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished?: boolean;
}

export interface TeamFixture {
  opponentId: number;
  isHome: boolean;
  /** The official FPL difficulty for this team in this fixture. */
  difficulty: number;
}

/** A team's unfinished, scheduled fixtures for each requested gameweek (empty = blank, 2+ = double). */
export function fixturesForGameweeks(
  teamId: number,
  fixtures: CompareFixtureInput[],
  gameweeks: number[],
): Array<{ gameweek: number; fixtures: TeamFixture[] }> {
  return gameweeks.map((gameweek) => ({
    gameweek,
    fixtures: fixtures
      .filter((f) => f.event === gameweek && !f.finished && (f.team_h === teamId || f.team_a === teamId))
      .map((f) =>
        f.team_h === teamId
          ? { opponentId: f.team_a, isHome: true, difficulty: f.team_h_difficulty }
          : { opponentId: f.team_h, isHome: false, difficulty: f.team_a_difficulty },
      ),
  }));
}

/** Link into the Compare page for these players: /compare?p=id,id. Invalid ids are dropped; duplicates removed; capped at MAX_COMPARE_PLAYERS. */
export function compareUrl(ids: number[]): string {
  const clean = parseCompareIds(ids.filter((n) => Number.isInteger(n) && n > 0).join(","));
  return clean.length ? `/compare?p=${clean.join(",")}` : "/compare";
}
