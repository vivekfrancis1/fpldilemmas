/**
 * Fetches EPL odds from The Odds API, de-vigs/aggregates them via shared/odds-utils.ts, and
 * persists consensus probabilities in fixture_odds (latest snapshot per fixture — read by
 * team-goals-service.ts's 'odds' calculationMode) and fixture_odds_snapshots (append-only
 * history, one row per refresh per fixture — powers the odds-over-time chart). The usage quota
 * cost is 1 credit per region per market PER CALL regardless of how many fixtures come back
 * (this call uses regions=uk, markets=h2h+totals, so 2 credits per refresh) — refreshFixtureOdds
 * is triggered on a schedule by odds-refresh-scheduler.ts.
 */

import { pool } from "./db";
import { aggregateEventOdds, solveExpectedGoalsFromOdds, type OddsApiEvent } from "@shared/odds-utils";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const SPORT_KEY = "soccer_epl";

export interface StoredFixtureOdds {
  id: number;
  season: string;
  oddsApiEventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmakerCount: number;
  homeWinProb: number | null;
  drawProb: number | null;
  awayWinProb: number | null;
  over25Prob: number | null;
  under25Prob: number | null;
  fetchedAt: string;
  updatedAt: string;
}

async function fetchOddsFromApi(): Promise<OddsApiEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not set");
  }
  const url = `${ODDS_API_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${apiKey}&regions=uk&markets=h2h,totals&oddsFormat=decimal`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`The Odds API request failed: ${response.status} ${response.statusText} ${body}`);
  }
  return response.json();
}

/**
 * Fetches current EPL odds and upserts them into fixture_odds, keyed by the upstream event id
 * so re-running this updates existing rows (odds move as kickoff approaches) instead of
 * duplicating them. Also appends one row per fixture to fixture_odds_snapshots (never upserted)
 * so the history of how each fixture's odds moved is preserved for charting.
 */
export async function refreshFixtureOdds(season: string): Promise<{ fetched: number; stored: number }> {
  const events = await fetchOddsFromApi();
  let stored = 0;

  for (const event of events) {
    const aggregated = aggregateEventOdds(event);
    await pool.query(
      `INSERT INTO fixture_odds
         (season, odds_api_event_id, home_team, away_team, commence_time, bookmaker_count,
          home_win_prob, draw_prob, away_win_prob, over_2_5_prob, under_2_5_prob, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       ON CONFLICT (odds_api_event_id) DO UPDATE SET
         home_team = EXCLUDED.home_team,
         away_team = EXCLUDED.away_team,
         commence_time = EXCLUDED.commence_time,
         bookmaker_count = EXCLUDED.bookmaker_count,
         home_win_prob = EXCLUDED.home_win_prob,
         draw_prob = EXCLUDED.draw_prob,
         away_win_prob = EXCLUDED.away_win_prob,
         over_2_5_prob = EXCLUDED.over_2_5_prob,
         under_2_5_prob = EXCLUDED.under_2_5_prob,
         updated_at = now()`,
      [
        season,
        event.id,
        event.home_team,
        event.away_team,
        event.commence_time,
        aggregated.bookmakerCount,
        aggregated.homeWinProb,
        aggregated.drawProb,
        aggregated.awayWinProb,
        aggregated.over25Prob,
        aggregated.under25Prob,
      ]
    );

    await pool.query(
      `INSERT INTO fixture_odds_snapshots
         (season, odds_api_event_id, home_team, away_team, commence_time, bookmaker_count,
          home_win_prob, draw_prob, away_win_prob, over_2_5_prob, under_2_5_prob)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        season,
        event.id,
        event.home_team,
        event.away_team,
        event.commence_time,
        aggregated.bookmakerCount,
        aggregated.homeWinProb,
        aggregated.drawProb,
        aggregated.awayWinProb,
        aggregated.over25Prob,
        aggregated.under25Prob,
      ]
    );

    stored++;
  }

  return { fetched: events.length, stored };
}

export interface FixtureOddsSnapshotPoint {
  snapshotAt: string;
  bookmakerCount: number;
  homeWinProb: number | null;
  drawProb: number | null;
  awayWinProb: number | null;
  over25Prob: number | null;
  expectedHomeGoals: number | null;
  expectedAwayGoals: number | null;
}

export interface FixtureOddsHistory {
  oddsApiEventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  snapshots: FixtureOddsSnapshotPoint[];
}

/**
 * Time series of how one fixture's consensus odds (and the expected goals derived from them)
 * moved across every refresh since it first appeared on the market, oldest first.
 */
export async function getFixtureOddsHistory(season: string, oddsApiEventId: string): Promise<FixtureOddsHistory | null> {
  const result = await pool.query(
    `SELECT odds_api_event_id, home_team, away_team, commence_time, bookmaker_count,
            home_win_prob, draw_prob, away_win_prob, over_2_5_prob, snapshot_at
     FROM fixture_odds_snapshots
     WHERE season = $1 AND odds_api_event_id = $2
     ORDER BY snapshot_at ASC`,
    [season, oddsApiEventId]
  );

  if (result.rows.length === 0) return null;

  const first = result.rows[0];
  const snapshots: FixtureOddsSnapshotPoint[] = result.rows.map((row: any) => {
    const homeWinProb = row.home_win_prob !== null ? parseFloat(row.home_win_prob) : null;
    const drawProb = row.draw_prob !== null ? parseFloat(row.draw_prob) : null;
    const awayWinProb = row.away_win_prob !== null ? parseFloat(row.away_win_prob) : null;
    const over25Prob = row.over_2_5_prob !== null ? parseFloat(row.over_2_5_prob) : null;

    const solved = homeWinProb !== null && drawProb !== null && awayWinProb !== null && over25Prob !== null
      ? solveExpectedGoalsFromOdds(homeWinProb, drawProb, awayWinProb, over25Prob)
      : null;

    return {
      snapshotAt: row.snapshot_at,
      bookmakerCount: row.bookmaker_count,
      homeWinProb,
      drawProb,
      awayWinProb,
      over25Prob,
      expectedHomeGoals: solved?.lambdaHome ?? null,
      expectedAwayGoals: solved?.lambdaAway ?? null,
    };
  });

  return {
    oddsApiEventId,
    homeTeam: first.home_team,
    awayTeam: first.away_team,
    commenceTime: first.commence_time,
    snapshots,
  };
}

export interface FixtureOddsHistorySummary {
  oddsApiEventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  snapshotCount: number;
}

/**
 * Lightweight index of every fixture that has at least one snapshot this season, for populating
 * a fixture picker without pulling each fixture's full time series.
 */
export async function listFixturesWithOddsHistory(season: string): Promise<FixtureOddsHistorySummary[]> {
  const result = await pool.query(
    `SELECT odds_api_event_id,
            MAX(home_team) AS home_team,
            MAX(away_team) AS away_team,
            MAX(commence_time) AS commence_time,
            COUNT(*) AS snapshot_count
     FROM fixture_odds_snapshots
     WHERE season = $1
     GROUP BY odds_api_event_id
     ORDER BY MAX(commence_time) ASC`,
    [season]
  );
  return result.rows.map((row: any) => ({
    oddsApiEventId: row.odds_api_event_id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    commenceTime: row.commence_time,
    snapshotCount: parseInt(row.snapshot_count, 10),
  }));
}

export async function getFixtureOdds(season: string): Promise<StoredFixtureOdds[]> {
  const result = await pool.query(
    `SELECT id, season, odds_api_event_id, home_team, away_team, commence_time, bookmaker_count,
            home_win_prob, draw_prob, away_win_prob, over_2_5_prob, under_2_5_prob, fetched_at, updated_at
     FROM fixture_odds
     WHERE season = $1
     ORDER BY commence_time ASC`,
    [season]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    season: row.season,
    oddsApiEventId: row.odds_api_event_id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    commenceTime: row.commence_time,
    bookmakerCount: row.bookmaker_count,
    homeWinProb: row.home_win_prob !== null ? parseFloat(row.home_win_prob) : null,
    drawProb: row.draw_prob !== null ? parseFloat(row.draw_prob) : null,
    awayWinProb: row.away_win_prob !== null ? parseFloat(row.away_win_prob) : null,
    over25Prob: row.over_2_5_prob !== null ? parseFloat(row.over_2_5_prob) : null,
    under25Prob: row.under_2_5_prob !== null ? parseFloat(row.under_2_5_prob) : null,
    fetchedAt: row.fetched_at,
    updatedAt: row.updated_at,
  }));
}
