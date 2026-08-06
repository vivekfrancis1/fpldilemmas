// One-time correction: FPL's live bootstrap-static is still holding over 2025/26's final
// season-cumulative totals (2026/27 hasn't kicked off yet). Our own historical_player_stats
// rows for 2025/26 are SUMmed from gameweek_player_data, which has a couple of incomplete
// gameweeks (partial scrape gap) — this reconciles the SUM-derived columns against FPL's
// authoritative holdover values while that window is still open. Must be run before 2026/27
// GW1 goes live; requires the app server running (bootstrap-static is fetched via internalFetch).
//
// Usage: tsx scripts/reconcile-2025-26-holdover.ts
import { seasonArchiveService } from "../server/season-archive-service";

(async () => {
  console.log("=== Reconciling 2025/26 historical_player_stats from live holdover ===");
  const result = await seasonArchiveService.reconcileFromLiveHoldover("2025/26");
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.aborted || result.errors.length > 0 ? 1 : 0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
