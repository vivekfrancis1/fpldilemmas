// One-off sync: corrects Manager IDs for existing Top Content Creators (broken by FPL's
// 2026-07-23 entry-ID renumbering) and adds the rest of the verified 2026/27 Top 100 list
// from Manual Uploads/Content Creators/content_creators_team_ids.csv.
//
// Run with: npx tsx scripts/sync-content-creators-2026-27.ts [--dry-run]

import fs from "fs";
import path from "path";
import { storage } from "../server/storage";

const CSV_PATH = path.join(
  process.cwd(),
  "Manual Uploads/Content Creators/content_creators_team_ids.csv",
);

interface CsvRow {
  league_rank: string;
  entry_id: string;
  manager: string;
  team_name: string;
  overall_rank: string;
  season_points: string;
  gw_points: string;
}

function parseCsv(text: string): CsvRow[] {
  const [headerLine, ...lines] = text.trim().split("\n");
  const headers = headerLine.split(",");
  return lines.map((line) => {
    // Simple CSV split good enough here — no quoted commas in this file.
    const cells = line.split(",");
    const row: any = {};
    headers.forEach((h, i) => (row[h] = cells[i]));
    return row as CsvRow;
  });
}

// Existing DB creator id -> corrected 2026/27 entry_id, verified against the live FPL API
// and cross-checked against the CSV (manager/team-name match), see chat for the audit trail.
const CORRECTIONS: Record<number, number> = {
  50: 70, // Abdul Rehman (FPL Salah)
  28: 298, // FPL Focal
  29: 3054, // FPL Harry
  32: 120, // FPL Mate
  53: 117406, // FPL Physio
  42: 3315, // FPL Pras
  30: 199, // FPL Raptor
  39: 70063, // Holly Shand
  38: 2913, // Lee Bonfield
  52: 4470, // Martin Baker
  37: 2977, // Sam Bonfield
};

// entry_ids already correct in the DB (matched, no update needed) — skipped, not inserted again.
const ALREADY_CORRECT_ENTRY_IDS = new Set([53517, 5133, 850, 6816, 41, 2177]);

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csvText);

  const existing = await storage.getContentCreators();
  const existingById = new Map(existing.map((c) => [c.id, c]));

  console.log(`Loaded ${rows.length} CSV rows, ${existing.length} existing DB creators.\n`);

  // 1) Corrections
  console.log("=== Corrections ===");
  for (const [idStr, correctEntryId] of Object.entries(CORRECTIONS)) {
    const id = Number(idStr);
    const current = existingById.get(id);
    if (!current) {
      console.warn(`  SKIP: DB creator #${id} not found`);
      continue;
    }
    const row = rows.find((r) => Number(r.entry_id) === correctEntryId);
    if (!row) {
      console.warn(`  SKIP: no CSV row for entry_id ${correctEntryId}`);
      continue;
    }
    console.log(
      `  #${id} '${current.name}': managerId ${current.managerId} -> ${correctEntryId}, managerName '${current.managerName}' -> '${row.team_name}'`,
    );
    if (!dryRun) {
      await storage.updateContentCreator(id, {
        managerId: correctEntryId,
        managerName: row.team_name,
      });
    }
  }

  // 2) Inserts — every CSV row whose entry_id isn't already an existing creator's managerId
  // (post-correction) and isn't one of the already-correct ones.
  const handledEntryIds = new Set<number>([
    ...Object.values(CORRECTIONS),
    ...ALREADY_CORRECT_ENTRY_IDS,
  ]);
  const toInsert = rows.filter((r) => !handledEntryIds.has(Number(r.entry_id)));

  console.log(`\n=== Inserts (${toInsert.length}) ===`);
  for (const row of toInsert) {
    console.log(`  + entry_id=${row.entry_id} manager='${row.manager}' team='${row.team_name}'`);
    if (!dryRun) {
      await storage.addContentCreator({
        name: row.team_name,
        managerId: Number(row.entry_id),
        managerName: row.manager,
        playerName: row.manager,
        description: null,
        twitterHandle: null,
        youtubeUrl: null,
        followers: null,
        isActive: true,
      } as any);
    }
  }

  console.log(
    `\nDone.${dryRun ? " (dry run — nothing written)" : ""} ${Object.keys(CORRECTIONS).length} corrected, ${toInsert.length} inserted.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
