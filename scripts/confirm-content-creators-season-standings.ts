// The Content Creators page hides live stats for any managerId not "confirmed" —
// confirmed means a real archived 2025/26 row exists in manager_season_standings,
// a safety gate against FPL's 2026-07-23 entry-ID renumbering silently showing a
// stranger's data under a creator's name. This archives that row for every current
// content creator whose FPL entry actually has 2025/26 history, unlocking them.
//
// Run with: npx tsx scripts/confirm-content-creators-season-standings.ts [--dry-run]

import { db } from "../server/db";
import { managerSeasonStandings, fplContentCreators } from "@shared/schema";

const PREVIOUS_SEASON = "2025/26";

async function fetchHistory(managerId: number) {
  const res = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/history/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const creators = await db.select().from(fplContentCreators);
  console.log(`Checking ${creators.length} content creators for ${PREVIOUS_SEASON} history...\n`);

  let confirmed = 0;
  let noHistory = 0;
  let failed = 0;

  for (const creator of creators) {
    try {
      const history = await fetchHistory(creator.managerId);
      const past = (history.past || []).find((p: any) => p.season_name === PREVIOUS_SEASON);
      if (!past) {
        console.log(`  - SKIP (no ${PREVIOUS_SEASON} history): ${creator.name} (${creator.managerId})`);
        noHistory++;
        continue;
      }
      console.log(
        `  + ${creator.name} (${creator.managerId}): ${past.total_points} pts, rank ${past.rank}`,
      );
      if (!dryRun) {
        await db
          .insert(managerSeasonStandings)
          .values({
            season: PREVIOUS_SEASON,
            managerId: creator.managerId,
            managerName: creator.managerName,
            totalPoints: past.total_points,
            rank: past.rank,
            rankPercentage: past.rank_percentage,
          })
          .onConflictDoUpdate({
            target: [managerSeasonStandings.season, managerSeasonStandings.managerId],
            set: {
              managerName: creator.managerName,
              totalPoints: past.total_points,
              rank: past.rank,
              rankPercentage: past.rank_percentage,
              updatedAt: new Date(),
            },
          });
      }
      confirmed++;
    } catch (err) {
      console.warn(`  ! FAILED: ${creator.name} (${creator.managerId}): ${err}`);
      failed++;
    }
    // Be polite to the FPL API.
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
