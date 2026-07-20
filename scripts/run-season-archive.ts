// Runs the season archival (fixture results + historical player stats) for a given season.
// Must be run while that season is still "current" per FPL's live API/bootstrap-static —
// player-level data (gameweek_player_data, season_player_snapshot) is read from local DB
// cache, but fixture team-name lookups still call the live bootstrap-static/fixtures via
// internalFetch, which requires the app server to be running (PORT env must match it).
//
// Usage: tsx scripts/run-season-archive.ts [season]
import { seasonArchiveService } from "../server/season-archive-service";

const season = process.argv[2] || "2025/26";

(async () => {
  console.log(`=== Archiving fixtures for ${season} ===`);
  const fixtureResult = await seasonArchiveService.archiveFixtures(season);
  console.log(JSON.stringify(fixtureResult, null, 2));

  console.log(`=== Archiving historical player stats for ${season} ===`);
  const statsResult = await seasonArchiveService.archiveToHistoricalPlayerStats(season);
  console.log(JSON.stringify(statsResult, null, 2));

  console.log("=== Archive status ===");
  const status = await seasonArchiveService.getArchiveStatus();
  console.log(JSON.stringify(status, null, 2));

  process.exit(0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
