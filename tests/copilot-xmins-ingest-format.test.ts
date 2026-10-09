import { describe, it, expect } from "vitest";
import { extractCopilotRows } from "../server/copilot-xmins-ingest";

const base = { source: "x", current_gw: 6, last_updated: "", player_count: 1 };

describe("extractCopilotRows", () => {
  it("reads the current xMins_<gw> format", () => {
    const rows = extractCopilotRows({ ...base, gameweeks: [6, 7], players: [{ id: 199, name: "B", xMins_6: 89.7, xPts_6: 3.44, xMins_7: 59.2, xPts_7: 1.81 }] });
    expect(rows).toEqual([
      { playerId: 199, gameweek: 6, xMins: 89.7, xPts: 3.44 },
      { playerId: 199, gameweek: 7, xMins: 59.2, xPts: 1.81 },
    ]);
  });
  it("still reads the legacy GW<gw>_xMins format", () => {
    const rows = extractCopilotRows({ ...base, gameweeks: [3], players: [{ id: 1, name: "A", GW3_xMins: 5.3, GW3_xPts: 0.3 }] });
    expect(rows).toEqual([{ playerId: 1, gameweek: 3, xMins: 5.3, xPts: 0.3 }]);
  });
  it("skips missing values instead of zeroing them", () => {
    expect(extractCopilotRows({ ...base, gameweeks: [6], players: [{ id: 1, name: "A" }] })).toEqual([]);
  });
});

import { validateCopilotExport } from "../server/copilot-xmins-ingest";

describe("validateCopilotExport", () => {
  const ok = { source: "x", current_gw: 6, gameweeks: [6, 7], last_updated: "2026-09-30", player_count: 1, players: [{ id: 1, name: "A", xMins_6: 90 }] };
  it("accepts a well-formed export", () => {
    expect(validateCopilotExport(ok).players).toHaveLength(1);
  });
  it("rejects non-objects, missing players, and bad gameweeks", () => {
    expect(() => validateCopilotExport(null)).toThrow();
    expect(() => validateCopilotExport({ ...ok, players: undefined })).toThrow(/players/);
    expect(() => validateCopilotExport({ ...ok, gameweeks: [] })).toThrow(/gameweeks/);
    expect(() => validateCopilotExport({ ...ok, gameweeks: [6, "7"] })).toThrow(/gameweeks/);
    expect(() => validateCopilotExport({ ...ok, gameweeks: [0, 7] })).toThrow(/gameweeks/);
  });
  it("rejects players without a numeric id", () => {
    expect(() => validateCopilotExport({ ...ok, players: [{ name: "A", xMins_6: 90 }] })).toThrow(/id/);
  });
  it("rejects an export that yields no usable xMins values", () => {
    expect(() => validateCopilotExport({ ...ok, players: [{ id: 1, name: "A" }] })).toThrow(/no xMins/i);
  });
});

import fs from "fs";
import path from "path";
describe("validateCopilotExport against the real export", () => {
  const file = path.resolve(import.meta.dirname, "..", "Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json");
  it.skipIf(!fs.existsSync(file))("accepts the actual Copilot file (xMins_<gw> format)", () => {
    const data = validateCopilotExport(JSON.parse(fs.readFileSync(file, "utf-8")));
    expect(data.players.length).toBeGreaterThan(300);
    expect(extractCopilotRows(data).length).toBeGreaterThan(1000);
  });
});
