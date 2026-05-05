import { pool } from "./db";
import { internalFetch } from "./config";
import { FPLScoringCacheService } from "./fpl-scoring-cache-service";

const CURRENT_SEASON = "2025/26";

export interface BackfillResult {
  season: string;
  playersProcessed: number;
  fixturesInserted: number;
  fixturesUpdated: number;
  errors: string[];
  durationMs: number;
}

export interface SnapshotResult {
  season: string;
  playersSnapshotted: number;
  errors: string[];
  durationMs: number;
}

export class SeasonArchiveService {
  /**
   * Backfill gameweek_player_data from player_history_cache for the current season.
   * Reads the already-cached per-player JSON history and upserts every fixture row,
   * including the extended fields (xG, xA, ICT, value, selected, transfers, scores)
   * that were not stored when the GW was first cached.
   */
  async backfillFixtureHistory(season: string = CURRENT_SEASON): Promise<BackfillResult> {
    const start = Date.now();
    const result: BackfillResult = { season, playersProcessed: 0, fixturesInserted: 0, fixturesUpdated: 0, errors: [], durationMs: 0 };

    try {
      const rows = await pool.query(`SELECT player_id, history_json FROM player_history_cache`);
      console.log(`[SeasonArchive] Backfilling from ${rows.rows.length} cached player histories…`);

      // Collect all fixture rows into a flat array for batch upsert
      type FixtureRow = [
        number, number, string,  // player_id, gameweek, season
        number, number, number, number, number, number, number, number, number, number,
        number, number, number, number, number,
        boolean, number | null, number | null, Date | null,
        number, number, number, number,
        number, number, number, number,
        number, number, number, number,
        number | null, number | null
      ];

      const allRows: FixtureRow[] = [];

      for (const row of rows.rows) {
        const playerId: number = row.player_id;
        const history: any[] = Array.isArray(row.history_json) ? row.history_json : [];

        for (const h of history) {
          allRows.push([
            playerId, h.round, season,
            h.minutes ?? 0,
            h.goals_scored ?? 0,
            h.assists ?? 0,
            h.clean_sheets ?? 0,
            h.goals_conceded ?? 0,
            h.own_goals ?? 0,
            h.penalties_saved ?? 0,
            h.penalties_missed ?? 0,
            h.yellow_cards ?? 0,
            h.red_cards ?? 0,
            h.saves ?? 0,
            h.bonus ?? 0,
            h.bps ?? 0,
            h.total_points ?? 0,
            h.starts ?? 0,
            h.was_home ?? false,
            h.opponent_team ?? null,
            h.fixture ?? null,
            h.kickoff_time ? new Date(h.kickoff_time) : null,
            parseFloat(h.expected_goals ?? '0') || 0,
            parseFloat(h.expected_assists ?? '0') || 0,
            parseFloat(h.expected_goal_involvements ?? '0') || 0,
            parseFloat(h.expected_goals_conceded ?? '0') || 0,
            parseFloat(h.influence ?? '0') || 0,
            parseFloat(h.creativity ?? '0') || 0,
            parseFloat(h.threat ?? '0') || 0,
            parseFloat(h.ict_index ?? '0') || 0,
            h.value ?? 0,
            h.selected ?? 0,
            h.transfers_in ?? 0,
            h.transfers_out ?? 0,
            h.team_h_score ?? null,
            h.team_a_score ?? null,
          ]);
        }
        result.playersProcessed++;
      }

      console.log(`[SeasonArchive] Collected ${allRows.length} fixture rows across ${result.playersProcessed} players — deduplicating DGWs then upserting in batches…`);

      // Deduplicate by (player_id, gameweek, season): for DGW players the history
      // has two rows per round; sum the additive stats, keep the last for scalars.
      const dedupMap = new Map<string, FixtureRow>();
      for (const r of allRows) {
        const key = `${r[0]}_${r[1]}_${r[2]}`;
        if (!dedupMap.has(key)) {
          dedupMap.set(key, [...r] as unknown as FixtureRow);
        } else {
          const ex = dedupMap.get(key)!;
          // Additive stats: indices 3-17 (minutes through starts)
          for (let ci = 3; ci <= 17; ci++) (ex as any)[ci] = ((ex as any)[ci] as number) + ((r as any)[ci] as number);
          // xG/xA/xGI/xGC (22-25), ICT (26-29), value/selected/transfers (30-33): sum
          for (let ci = 22; ci <= 33; ci++) (ex as any)[ci] = ((ex as any)[ci] as number) + ((r as any)[ci] as number);
          // team_h_score/team_a_score (34,35): keep whichever is non-null
          if (r[34] != null) ex[34] = r[34];
          if (r[35] != null) ex[35] = r[35];
        }
      }
      const deduped = Array.from(dedupMap.values());
      console.log(`[SeasonArchive] After dedup: ${deduped.length} rows (${allRows.length - deduped.length} DGW duplicates merged)`);

      // Batch upsert in chunks of 200 rows to stay well under parameter limits
      const CHUNK = 200;
      const COLS = 36; // columns per row

      for (let i = 0; i < deduped.length; i += CHUNK) {
        const chunk = deduped.slice(i, i + CHUNK);
        const params: any[] = [];
        const valuePlaceholders = chunk.map((_, ri) => {
          const base = ri * COLS;
          return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18},$${base+19},$${base+20},$${base+21},$${base+22},$${base+23},$${base+24},$${base+25},$${base+26},$${base+27},$${base+28},$${base+29},$${base+30},$${base+31},$${base+32},$${base+33},$${base+34},$${base+35},$${base+36})`;
        }).join(',');
        for (const r of chunk) params.push(...r);

        try {
          const res = await pool.query(`
            INSERT INTO gameweek_player_data (
              player_id, gameweek, season,
              minutes, goals_scored, assists, clean_sheets, goals_conceded,
              own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards,
              saves, bonus, bps, total_points, starts,
              was_home, opponent_team, fixture_id, kickoff_time,
              expected_goals, expected_assists, expected_goal_involvements, expected_goals_conceded,
              influence, creativity, threat, ict_index,
              value, selected, transfers_in, transfers_out,
              team_h_score, team_a_score
            ) VALUES ${valuePlaceholders}
            ON CONFLICT (player_id, gameweek, season) DO UPDATE SET
              minutes=EXCLUDED.minutes, goals_scored=EXCLUDED.goals_scored,
              assists=EXCLUDED.assists, clean_sheets=EXCLUDED.clean_sheets,
              goals_conceded=EXCLUDED.goals_conceded, own_goals=EXCLUDED.own_goals,
              penalties_saved=EXCLUDED.penalties_saved, penalties_missed=EXCLUDED.penalties_missed,
              yellow_cards=EXCLUDED.yellow_cards, red_cards=EXCLUDED.red_cards,
              saves=EXCLUDED.saves, bonus=EXCLUDED.bonus, bps=EXCLUDED.bps,
              total_points=EXCLUDED.total_points, starts=EXCLUDED.starts,
              was_home=EXCLUDED.was_home, opponent_team=EXCLUDED.opponent_team,
              fixture_id=EXCLUDED.fixture_id, kickoff_time=EXCLUDED.kickoff_time,
              expected_goals=EXCLUDED.expected_goals, expected_assists=EXCLUDED.expected_assists,
              expected_goal_involvements=EXCLUDED.expected_goal_involvements,
              expected_goals_conceded=EXCLUDED.expected_goals_conceded,
              influence=EXCLUDED.influence, creativity=EXCLUDED.creativity,
              threat=EXCLUDED.threat, ict_index=EXCLUDED.ict_index,
              value=EXCLUDED.value, selected=EXCLUDED.selected,
              transfers_in=EXCLUDED.transfers_in, transfers_out=EXCLUDED.transfers_out,
              team_h_score=EXCLUDED.team_h_score, team_a_score=EXCLUDED.team_a_score,
              updated_at=NOW()
          `, params);
          // pg doesn't distinguish inserts vs updates in ON CONFLICT, count all as updated
          result.fixturesUpdated += res.rowCount ?? 0;
        } catch (e) {
          result.errors.push(`Chunk ${i}–${i + chunk.length}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      result.fixturesInserted = result.fixturesUpdated; // total rows upserted

      // Invalidate GW-range caches so stale data isn't served after backfill
      if (result.fixturesUpdated > 0) {
        FPLScoringCacheService.notifyDataUpdated();
      }
    } catch (e) {
      result.errors.push(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    }

    result.durationMs = Date.now() - start;
    console.log(`[SeasonArchive] Backfill done: ${result.playersProcessed} players, ${result.fixturesUpdated} rows upserted, ${result.errors.length} errors in ${result.durationMs}ms`);
    return result;
  }

  /**
   * Snapshot all player data from bootstrap-static into season_player_snapshot.
   * Call this at/near the end of the season to preserve the full FPL element data
   * before next season resets element IDs and stats.
   */
  async snapshotSeasonPlayers(season: string = CURRENT_SEASON): Promise<SnapshotResult> {
    const start = Date.now();
    const result: SnapshotResult = { season, playersSnapshotted: 0, errors: [], durationMs: 0 };

    try {
      const bsRes = await internalFetch("api/bootstrap-static");
      if (!bsRes.ok) throw new Error(`bootstrap-static returned ${bsRes.status}`);
      const bootstrap = await bsRes.json();
      const players: any[] = bootstrap.elements ?? [];

      console.log(`[SeasonArchive] Snapshotting ${players.length} players for season ${season}…`);

      for (const p of players) {
        try {
          await pool.query(`
            INSERT INTO season_player_snapshot (
              season, player_id, element_code, web_name, first_name, second_name,
              team_id, element_type,
              total_points, minutes, goals_scored, assists, clean_sheets, goals_conceded,
              own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards,
              saves, bonus, bps,
              influence, creativity, threat, ict_index,
              expected_goals, expected_assists, expected_goal_involvements, expected_goals_conceded,
              starts, now_cost, start_cost, selected_by_percent,
              transfers_in_event, transfers_out_event,
              form, points_per_game, value_form, value_season,
              snapshot_date
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
              $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
              $37,$38,$39,$40, NOW()
            )
            ON CONFLICT (season, player_id) DO UPDATE SET
              element_code=EXCLUDED.element_code, web_name=EXCLUDED.web_name,
              first_name=EXCLUDED.first_name, second_name=EXCLUDED.second_name,
              team_id=EXCLUDED.team_id, element_type=EXCLUDED.element_type,
              total_points=EXCLUDED.total_points, minutes=EXCLUDED.minutes,
              goals_scored=EXCLUDED.goals_scored, assists=EXCLUDED.assists,
              clean_sheets=EXCLUDED.clean_sheets, goals_conceded=EXCLUDED.goals_conceded,
              own_goals=EXCLUDED.own_goals, penalties_saved=EXCLUDED.penalties_saved,
              penalties_missed=EXCLUDED.penalties_missed, yellow_cards=EXCLUDED.yellow_cards,
              red_cards=EXCLUDED.red_cards, saves=EXCLUDED.saves,
              bonus=EXCLUDED.bonus, bps=EXCLUDED.bps,
              influence=EXCLUDED.influence, creativity=EXCLUDED.creativity,
              threat=EXCLUDED.threat, ict_index=EXCLUDED.ict_index,
              expected_goals=EXCLUDED.expected_goals, expected_assists=EXCLUDED.expected_assists,
              expected_goal_involvements=EXCLUDED.expected_goal_involvements,
              expected_goals_conceded=EXCLUDED.expected_goals_conceded,
              starts=EXCLUDED.starts, now_cost=EXCLUDED.now_cost,
              selected_by_percent=EXCLUDED.selected_by_percent,
              transfers_in_event=EXCLUDED.transfers_in_event,
              transfers_out_event=EXCLUDED.transfers_out_event,
              form=EXCLUDED.form, points_per_game=EXCLUDED.points_per_game,
              value_form=EXCLUDED.value_form, value_season=EXCLUDED.value_season,
              snapshot_date=NOW()
          `, [
            season,
            p.id,
            p.code ?? null,
            p.web_name ?? null,
            p.first_name ?? null,
            p.second_name ?? null,
            p.team ?? null,
            p.element_type ?? null,
            p.total_points ?? 0,
            p.minutes ?? 0,
            p.goals_scored ?? 0,
            p.assists ?? 0,
            p.clean_sheets ?? 0,
            p.goals_conceded ?? 0,
            p.own_goals ?? 0,
            p.penalties_saved ?? 0,
            p.penalties_missed ?? 0,
            p.yellow_cards ?? 0,
            p.red_cards ?? 0,
            p.saves ?? 0,
            p.bonus ?? 0,
            p.bps ?? 0,
            parseFloat(p.influence ?? '0') || 0,
            parseFloat(p.creativity ?? '0') || 0,
            parseFloat(p.threat ?? '0') || 0,
            parseFloat(p.ict_index ?? '0') || 0,
            parseFloat(p.expected_goals ?? '0') || null,
            parseFloat(p.expected_assists ?? '0') || null,
            parseFloat(p.expected_goal_involvements ?? '0') || null,
            parseFloat(p.expected_goals_conceded ?? '0') || null,
            p.starts ?? 0,
            p.now_cost ?? 0,
            p.start_cost ?? 0,
            parseFloat(p.selected_by_percent ?? '0') || null,
            p.transfers_in_event ?? 0,
            p.transfers_out_event ?? 0,
            parseFloat(p.form ?? '0') || null,
            parseFloat(p.points_per_game ?? '0') || null,
            parseFloat(p.value_form ?? '0') || null,
            parseFloat(p.value_season ?? '0') || null,
          ]);
          result.playersSnapshotted++;
        } catch (e) {
          result.errors.push(`Player ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      result.errors.push(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    }

    result.durationMs = Date.now() - start;
    console.log(`[SeasonArchive] Snapshot done: ${result.playersSnapshotted} players for ${season}, ${result.errors.length} errors in ${result.durationMs}ms`);
    return result;
  }

  /**
   * Return row counts for monitoring.
   */
  async getArchiveStatus(): Promise<{
    fixtureRows: number;
    fixtureRowsBySeason: Record<string, number>;
    snapshotRows: number;
    snapshotRowsBySeason: Record<string, number>;
  }> {
    const [fixtureTotal, fixtureBySeason, snapshotTotal, snapshotBySeason] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM gameweek_player_data`),
      pool.query(`SELECT season, COUNT(*) as cnt FROM gameweek_player_data GROUP BY season ORDER BY season`),
      pool.query(`SELECT COUNT(*) FROM season_player_snapshot`).catch(() => ({ rows: [{ count: '0' }] })),
      pool.query(`SELECT season, COUNT(*) as cnt FROM season_player_snapshot GROUP BY season ORDER BY season`).catch(() => ({ rows: [] })),
    ]);

    return {
      fixtureRows: parseInt(fixtureTotal.rows[0].count),
      fixtureRowsBySeason: Object.fromEntries(fixtureBySeason.rows.map((r: any) => [r.season, parseInt(r.cnt)])),
      snapshotRows: parseInt(snapshotTotal.rows[0].count),
      snapshotRowsBySeason: Object.fromEntries(snapshotBySeason.rows.map((r: any) => [r.season, parseInt(r.cnt)])),
    };
  }
}

export const seasonArchiveService = new SeasonArchiveService();
