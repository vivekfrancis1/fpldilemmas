// Same purpose as confirm-content-creators-season-standings.ts, for the Top 100
// Managers list (shared/top-managers.ts) instead of the DB-backed content creators.
// Archives each manager's real 2025/26 season standing into manager_season_standings,
// which unlocks the Top Managers page's confirmed-ID safety gate.
//
// Run with: npx tsx scripts/confirm-top-managers-season-standings.ts [--dry-run]

import { db } from "../server/db";
import { managerSeasonStandings } from "@shared/schema";
import { TOP_MANAGERS } from "@shared/top-managers";

const PREVIOUS_SEASON = "2025/26";

async function fetchHistory(managerId: number) {
  const res = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/history/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Checking ${TOP_MANAGERS.length} top managers for ${PREVIOUS_SEASON} history...\n`);

  let confirmed = 0;
  let noHistory = 0;
  let failed = 0;

  for (const manager of TOP_MANAGERS) {
    try {
      const history = await fetchHistory(manager.managerId);
      const past = (history.past || []).find((p: any) => p.season_name === PREVIOUS_SEASON);
      if (!past) {
        console.log(`  - SKIP (no ${PREVIOUS_SEASON} history): ${manager.name} (${manager.managerId})`);
        noHistory++;
        continue;
      }
      console.log(
        `  + ${manager.name} (${manager.managerId}): ${past.total_points} pts, rank ${past.rank}`,
      );
      if (!dryRun) {
        await db
          .insert(managerSeasonStandings)
          .values({
            season: PREVIOUS_SEASON,
            managerId: manager.managerId,
            managerName: manager.name,
            totalPoints: past.total_points,
            rank: past.rank,
            rankPercentage: past.rank_percentage,
          })
          .onConflictDoUpdate({
            target: [managerSeasonStandings.season, managerSeasonStandings.managerId],
            set: {
              managerName: manager.name,
              totalPoints: past.total_points,
              rank: past.rank,
              rankPercentage: past.rank_percentage,
              updatedAt: new Date(),
            },
          });
      }
      confirmed++;
    } catch (err) {
      console.warn(`  ! FAILED: ${manager.name} (${manager.managerId}): ${err}`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `\nDone.${dryRun ? " (dry run)" : ""} confirmed=${confirmed} no-history=${noHistory} failed=${failed}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
