import { db } from "./db";
import { playerHistoryCache } from "../shared/schema";
import { eq, sql, count } from "drizzle-orm";

const FPL_ELEMENT_SUMMARY_URL = "https://fantasy.premierleague.com/api/element-summary";
const PREFETCH_BATCH_SIZE = 10;
const PREFETCH_BATCH_DELAY_MS = 100;
const CACHE_MAX_AGE_HOURS = 24; // Refresh if older than 24 hours

let prefetchRunning = false;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function computeRecentMetrics(historyArr: any[], n = 8): {
  recentP60: number;
  recentP_any: number;
  recentBonusPerGame: number;
  recentGoals: number;
  recentAssists: number;
  poolSize: number;
} {
  // Only consider completed fixtures (exclude unplayed GWs where score is null)
  const playedEntries = historyArr.filter(g => g.team_h_score !== null);
  // Take last n completed games (0-min entries = benched/not selected = valid non-selection data)
  const recent = playedEntries.slice(-n);
  // Fall back to all played entries if fewer than 4 recent completed games exist
  const pool = recent.length >= 4 ? recent : playedEntries;

  const recentP60 = pool.length > 0 ? pool.filter(g => g.minutes >= 60).length / pool.length : 0.5;
  const recentP_any = pool.length > 0 ? pool.filter(g => g.minutes > 0).length / pool.length : 0.5;
  const recentBonusPerGame = pool.length > 0
    ? pool.reduce((s, g) => s + (g.bonus || 0), 0) / pool.length
    : 0;
  const recentGoals = pool.reduce((s, g) => s + (g.goals_scored || 0), 0);
  const recentAssists = pool.reduce((s, g) => s + (g.assists || 0), 0);
  return { recentP60, recentP_any, recentBonusPerGame, recentGoals, recentAssists, poolSize: pool.length };
}

export async function getBulkPlayerHistories(playerIds: number[]): Promise<Map<number, any[]>> {
  const result = new Map<number, any[]>();
  if (playerIds.length === 0) return result;

  try {
    const rows = await db
      .select({ playerId: playerHistoryCache.playerId, historyJson: playerHistoryCache.historyJson })
      .from(playerHistoryCache)
      .where(sql`${playerHistoryCache.playerId} = ANY(ARRAY[${sql.raw(playerIds.join(","))}]::integer[])`);
    for (const row of rows) {
      result.set(row.playerId, row.historyJson as any[]);
    }
  } catch (e) {
    // DB unavailable — return empty, callers fall back to live fetch
  }
  return result;
}

export async function prefetchAllPlayerHistories(playerIds: number[], finishedGW?: number, onRefreshComplete?: () => void): Promise<void> {
  if (prefetchRunning) {
    console.log("⏭️ Player history prefetch already in progress, skipping");
    return;
  }

  // Check if we already have fresh data for all players
  try {
    const cutoff = new Date(Date.now() - CACHE_MAX_AGE_HOURS * 60 * 60 * 1000);
    const freshCount = await db
      .select({ total: count() })
      .from(playerHistoryCache)
      .where(sql`${playerHistoryCache.updatedAt} > ${cutoff}`);
    
    const fresh = freshCount[0]?.total ?? 0;
    if (fresh >= playerIds.length * 0.95) {
      // Timestamps look fresh — but also verify GW coverage if finishedGW is provided.
      // The cache can be "fresh" in time but missing the latest GW (e.g. updated before GW finished).
      if (finishedGW && finishedGW > 0) {
        const sampleHistories = await getBulkPlayerHistories(playerIds.slice(0, 5));
        let maxRoundInDb = 0;
        for (const hist of sampleHistories.values()) {
          const m = Math.max(...hist.map((h: any) => h.round || 0), 0);
          if (m > maxRoundInDb) maxRoundInDb = m;
        }
        if (maxRoundInDb < finishedGW) {
          console.log(`🔄 Player history GW stale: DB max round=${maxRoundInDb}, finished GW=${finishedGW} — forcing refresh`);
          // Fall through to full re-fetch below
        } else {
          console.log(`✅ Player history cache fresh: ${fresh}/${playerIds.length} players up to date through GW${maxRoundInDb} (skipping prefetch)`);
          return;
        }
      } else {
        console.log(`✅ Player history cache fresh: ${fresh}/${playerIds.length} players up to date (skipping prefetch)`);
        return;
      }
    } else {
      console.log(`🔄 Player history cache stale: ${fresh}/${playerIds.length} fresh — running prefetch`);
    }
  } catch (e) {
    console.log("⚠️ Could not check cache freshness, proceeding with prefetch");
  }

  prefetchRunning = true;
  const startTime = Date.now();
  console.log(`📚 Starting player history prefetch for ${playerIds.length} players...`);

  let saved = 0;
  let failed = 0;

  try {
    for (let i = 0; i < playerIds.length; i += PREFETCH_BATCH_SIZE) {
      const batch = playerIds.slice(i, i + PREFETCH_BATCH_SIZE);

      await Promise.all(
        batch.map(async (playerId) => {
          try {
            const res = await fetch(`${FPL_ELEMENT_SUMMARY_URL}/${playerId}/`);
            if (!res.ok) { failed++; return; }
            const data = await res.json();
            const history = data.history || [];

            await db
              .insert(playerHistoryCache)
              .values({ playerId, historyJson: history })
              .onConflictDoUpdate({
                target: playerHistoryCache.playerId,
                set: { historyJson: history, updatedAt: new Date() },
              });
            saved++;
          } catch {
            failed++;
          }
        })
      );

      if (i + PREFETCH_BATCH_SIZE < playerIds.length) {
        await sleep(PREFETCH_BATCH_DELAY_MS);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Player history prefetch complete: ${saved} saved, ${failed} failed in ${elapsed}s`);
    // Notify caller that a full refresh ran — caller should re-run scoring cache to pick up fresh histories
    if (saved > 0 && onRefreshComplete) {
      console.log("🔄 Player history refreshed — triggering scoring cache re-run with fresh data...");
      try { onRefreshComplete(); } catch (e) { console.warn("⚠️ onRefreshComplete error:", e); }
    }
  } finally {
    prefetchRunning = false;
  }
}
