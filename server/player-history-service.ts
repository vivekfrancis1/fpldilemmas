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

export async function prefetchAllPlayerHistories(playerIds: number[]): Promise<void> {
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
      console.log(`✅ Player history cache fresh: ${fresh}/${playerIds.length} players up to date (skipping prefetch)`);
      return;
    }
    console.log(`🔄 Player history cache stale: ${fresh}/${playerIds.length} fresh — running prefetch`);
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
  } finally {
    prefetchRunning = false;
  }
}
