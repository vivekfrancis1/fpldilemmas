/**
 * PlayerHistoryBlendService - shared last-season (2025/26) player-level data for blending
 * per-90 rates into current-season (2026/27) projections (saves, defensive contributions,
 * bonus points), the same way TeamGoalsService blends team-level goals/clean sheets.
 *
 * Player element IDs are reassigned every season by the FPL API, so a current player is
 * matched to their 2025/26 row by (normalized full name, element_type) rather than by ID.
 * Players with no match (promoted-team players, new signings from abroad, academy graduates)
 * are "new to the league" — callers fall back to a league-average-for-position rate for them.
 */

import { pool } from "./db";

const LAST_SEASON = "2025/26";

export interface LastSeasonPlayerRow {
  firstName: string;
  secondName: string;
  elementType: number; // 1=GK 2=DEF 3=MID 4=FWD
  minutes: number;
  starts: number;
  saves: number;
  bonus: number;
  defensiveContribution: number;
}

function normalizeName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]/g, ""); // strip punctuation/spaces
}

export function nameMatchKey(firstName: string, secondName: string, elementType: number): string {
  return `${normalizeName(firstName)}${normalizeName(secondName)}|${elementType}`;
}

let lastSeasonPlayersCache: LastSeasonPlayerRow[] | null = null;
let lastSeasonPlayersInFlight: Promise<LastSeasonPlayerRow[]> | null = null;

async function fetchLastSeasonPlayers(): Promise<LastSeasonPlayerRow[]> {
  if (lastSeasonPlayersCache) return lastSeasonPlayersCache;
  if (lastSeasonPlayersInFlight) return lastSeasonPlayersInFlight;

  lastSeasonPlayersInFlight = (async () => {
    try {
      const result = await pool.query(
        `SELECT sps.first_name, sps.second_name, sps.element_type, sps.minutes, sps.starts, sps.saves, sps.bonus,
                hps.defensive_contribution
         FROM season_player_snapshot sps
         JOIN historical_player_stats hps ON hps.season = sps.season AND hps.player_id = sps.player_id
         WHERE sps.season = $1`,
        [LAST_SEASON]
      );
      const rows: LastSeasonPlayerRow[] = result.rows.map((r: any) => ({
        firstName: r.first_name || "",
        secondName: r.second_name || "",
        elementType: r.element_type,
        minutes: r.minutes || 0,
        starts: r.starts || 0,
        saves: r.saves || 0,
        bonus: r.bonus || 0,
        defensiveContribution: r.defensive_contribution || 0,
      }));
      lastSeasonPlayersCache = rows;
      return rows;
    } catch (error) {
      console.error("Failed to fetch last-season player stats for blending:", error);
      lastSeasonPlayersCache = [];
      return [];
    }
  })();

  try {
    return await lastSeasonPlayersInFlight;
  } finally {
    lastSeasonPlayersInFlight = null;
  }
}

let nameLookupCache: Map<string, LastSeasonPlayerRow> | null = null;

async function getNameLookup(): Promise<Map<string, LastSeasonPlayerRow>> {
  if (nameLookupCache) return nameLookupCache;
  const rows = await fetchLastSeasonPlayers();
  const map = new Map<string, LastSeasonPlayerRow>();
  for (const row of rows) {
    map.set(nameMatchKey(row.firstName, row.secondName, row.elementType), row);
  }
  nameLookupCache = map;
  return map;
}

/** A player's 2025/26 row, matched by (full name, element_type), or undefined if new to the league. */
export async function getLastSeasonPlayerRow(firstName: string, secondName: string, elementType: number): Promise<LastSeasonPlayerRow | undefined> {
  const lookup = await getNameLookup();
  return lookup.get(nameMatchKey(firstName, secondName, elementType));
}

// Below this many minutes, a per-90 extrapolation is dominated by small-sample noise (e.g. 4 DC
// in a single substitute cameo would otherwise extrapolate to 360 DC per 90) — treat as no
// usable rate and let the caller fall back to the league average instead.
export const MIN_MINUTES_FOR_RATE = 270; // ~3 full matches
export const MIN_STARTS_FOR_RATE = 3;

function per90(total: number, minutes: number): number | undefined {
  return minutes >= MIN_MINUTES_FOR_RATE ? (total / minutes) * 90 : undefined;
}

export function lastSeasonSavesPer90(row: LastSeasonPlayerRow): number | undefined {
  return per90(row.saves, row.minutes);
}

export function lastSeasonDCPer90(row: LastSeasonPlayerRow): number | undefined {
  return per90(row.defensiveContribution, row.minutes);
}

export function lastSeasonBonusPerStart(row: LastSeasonPlayerRow): number | undefined {
  return row.starts >= MIN_STARTS_FOR_RATE ? row.bonus / row.starts : undefined;
}

let leagueAveragesCache: {
  gkSavesPer90: number;
  defDCPer90: number;
  midFwdDCPer90: number;
  gkBonusPerStart: number;
  defBonusPerStart: number;
  midBonusPerStart: number;
  fwdBonusPerStart: number;
} | null = null;

/**
 * League-average 2025/26 per-90 (or per-start) rates by position group — the fallback for
 * players with no last-season row at all (promoted-team players, new-to-the-league signings).
 * Position-grouped because DC thresholds/formulas and bonus levels differ meaningfully by
 * position (e.g. defenders earn DC via CBIT only, mids/forwards via CBIRT).
 */
export async function getLeagueAverageRates() {
  if (leagueAveragesCache) return leagueAveragesCache;
  const rows = await fetchLastSeasonPlayers();

  const withMinutes = rows.filter(r => r.minutes > 0);
  const avgPer90 = (filtered: LastSeasonPlayerRow[], statTotal: (r: LastSeasonPlayerRow) => number) => {
    const totalMinutes = filtered.reduce((sum, r) => sum + r.minutes, 0);
    const totalStat = filtered.reduce((sum, r) => sum + statTotal(r), 0);
    return totalMinutes > 0 ? (totalStat / totalMinutes) * 90 : 0;
  };
  const avgPerStart = (filtered: LastSeasonPlayerRow[]) => {
    const totalStarts = filtered.reduce((sum, r) => sum + r.starts, 0);
    const totalBonus = filtered.reduce((sum, r) => sum + r.bonus, 0);
    return totalStarts > 0 ? totalBonus / totalStarts : 0;
  };

  const gks = withMinutes.filter(r => r.elementType === 1);
  const defs = withMinutes.filter(r => r.elementType === 2);
  const midsFwds = withMinutes.filter(r => r.elementType === 3 || r.elementType === 4);
  const mids = withMinutes.filter(r => r.elementType === 3);
  const fwds = withMinutes.filter(r => r.elementType === 4);

  leagueAveragesCache = {
    gkSavesPer90: avgPer90(gks, r => r.saves),
    defDCPer90: avgPer90(defs, r => r.defensiveContribution),
    midFwdDCPer90: avgPer90(midsFwds, r => r.defensiveContribution),
    gkBonusPerStart: avgPerStart(gks),
    defBonusPerStart: avgPerStart(defs),
    midBonusPerStart: avgPerStart(mids),
    fwdBonusPerStart: avgPerStart(fwds),
  };
  return leagueAveragesCache;
}

/**
 * 50/50 blend of this-season and last-season per-90 (or per-start) rates, falling back to
 * whichever side is available, and finally to the league-average-for-position rate if the
 * player has neither — same rule as TeamGoalsService's getTeamAverageGoals.
 */
export function blendRate(thisSeasonRate: number | undefined, lastSeasonRate: number | undefined, leagueAverageRate: number): number {
  if (thisSeasonRate !== undefined && lastSeasonRate !== undefined) {
    return 0.5 * thisSeasonRate + 0.5 * lastSeasonRate;
  }
  if (lastSeasonRate !== undefined) return lastSeasonRate;
  if (thisSeasonRate !== undefined) return thisSeasonRate;
  return leagueAverageRate;
}
