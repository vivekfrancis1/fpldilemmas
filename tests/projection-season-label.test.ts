import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Projection tables are written and read under the current season (CURRENT_SEASON), never a
// hardcoded literal — a stale literal silently mislabels rows (and, if reader and writer
// disagree, serves stale data). Archive/venue/snapshot endpoints legitimately take an explicit
// season, so only lines that touch a projection table are checked.
const PROJECTION_TABLE_REF = /(playerGoalsProjections|playerAssistProjections|playerMinutesProjections|playerDefensiveProjections|teamCleanSheetProjections|teamProjections|player_projections|player_defensive_projections|player_minutes_projections)/;
const FILES = ["server/routes.ts", "server/projection-cache-worker.ts", "server/projection-service.ts"];

describe("projection season labels (whole-file)", () => {
  for (const file of ["server/projection-cache-worker.ts", "server/projection-service.ts"]) {
    it(`${file} never hardcodes the 2025/26 season`, () => {
      const src = fs.readFileSync(path.resolve(import.meta.dirname, "..", file), "utf-8");
      expect(/['"]2025\/26['"]/.test(src)).toBe(false);
    });
  }
});

describe("projection season labels", () => {
  for (const file of FILES) {
    it(`${file} has no hardcoded '2025/26' on projection-table reads/writes`, () => {
      const lines = fs.readFileSync(path.resolve(import.meta.dirname, "..", file), "utf-8").split("\n");
      const offenders: string[] = [];
      lines.forEach((line, i) => {
        if (!/['"]2025\/26['"]/.test(line)) return;
        const context = lines.slice(Math.max(0, i - 4), i + 3).join("\n");
        if (PROJECTION_TABLE_REF.test(context)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
      expect(offenders, offenders.join("\n")).toEqual([]);
    });
  }
});

// These tables' primary key is (player/team id, gameweek) WITHOUT season, so a season-filtered
// delete leaves rows from another season behind and the next insert collides with them (which is
// how the goals/assists caches silently stopped updating after July). The cachers must clear
// the whole table.
describe("projection cachers clear whole tables (season is not part of the primary key)", () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, "..", "server/projection-cache-worker.ts"), "utf-8");
  for (const table of ["playerGoalsProjections", "playerAssistProjections", "teamCleanSheetProjections", "playerMinutesProjections", "playerDefensiveProjections"]) {
    it(`${table} delete is not filtered by season`, () => {
      expect(src.includes(`await db.delete(${table});`)).toBe(true);
      expect(new RegExp(`db\\.delete\\(${table}\\)\\s*\\.where`).test(src)).toBe(false);
    });
  }
});
