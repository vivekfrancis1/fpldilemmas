/**
 * PlayerHistoryBlendService - real 2025/26 player-level data, matched to the current 2026/27
 * squad by name (player element IDs are reassigned every season by the FPL API, so a current
 * player is matched to their 2025/26 row by normalized full name + element_type, not by ID).
 *
 * No current-season projection blends this in anymore (per explicit product decision — see the
 * "new to the league" comments in routes.ts and team-goals-service.ts) — the only remaining
 * consumer is the explicit ?season=2025/26 real-history viewer (buildRealGoalShareForSeason /
 * buildRealAssistShareForSeason in routes.ts), which needs a genuine historical lookup, not a
 * projection input.
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
  yellowCards: number;
  redCards: number;
  goalsScored: number;
  assists: number;
  expectedGoals: number;
  expectedAssists: number;
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
                sps.yellow_cards, sps.red_cards, sps.goals_scored, sps.assists, sps.expected_goals, sps.expected_assists,
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
        yellowCards: r.yellow_cards || 0,
        redCards: r.red_cards || 0,
        goalsScored: r.goals_scored || 0,
        assists: r.assists || 0,
        expectedGoals: parseFloat(r.expected_goals) || 0,
        expectedAssists: parseFloat(r.expected_assists) || 0,
      }));
      lastSeasonPlayersCache = rows;
      return rows;
    } catch (error) {
      console.error("Failed to fetch last-season player stats:", error);
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
// in a single substitute cameo would otherwise extrapolate to 360 DC per 90) — callers treat a
// player under this threshold as having no usable current-season rate yet.
export const MIN_MINUTES_FOR_RATE = 270; // ~3 full matches
export const MIN_STARTS_FOR_RATE = 3;
