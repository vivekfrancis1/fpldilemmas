import { describe, it, expect } from "vitest";

// Plain HTTP client against the running dev server (see CLAUDE.md): needs `npm run dev` on port 5050 (or TEST_BASE_URL).
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:5050";
const CODES = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"];

describe("GET /api/player-detailed-positions", () => {
  it("lists each player's FPL position and detailed positions, main position separate from the others", async () => {
    const res = await fetch(`${BASE_URL}/api/player-detailed-positions`);
    expect(res.status).toBe(200);
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(300);
    for (const r of rows.slice(0, 50)) {
      expect(typeof r.fplPlayerId).toBe("number");
      expect(["GKP", "DEF", "MID", "FWD"]).toContain(r.fplPosition);
      expect(CODES).toContain(r.mainPosition);
      expect(typeof r.mainPositionLabel).toBe("string");
      expect(Array.isArray(r.otherPositions)).toBe(true);
      expect(r.otherPositions).not.toContain(r.mainPosition);
      expect(typeof r.outOfPosition).toBe("boolean");
    }
  });

  it("one row per player", async () => {
    const rows: Array<{ fplPlayerId: number }> = await (await fetch(`${BASE_URL}/api/player-detailed-positions`)).json();
    expect(new Set(rows.map((r) => r.fplPlayerId)).size).toBe(rows.length);
  });

  it("goalkeepers are goalkeepers", async () => {
    const rows: Array<{ fplPosition: string; mainPosition: string }> = await (await fetch(`${BASE_URL}/api/player-detailed-positions`)).json();
    expect(rows.filter((r) => r.fplPosition === "GKP").every((r) => r.mainPosition === "GK")).toBe(true);
  });
});
