import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5050";

describe("expected-minutes data exposed by the API", () => {
  let minutes: any[];
  let totals: any[];

  beforeAll(async () => {
    const [m, t] = await Promise.all([
      fetch(`${BASE_URL}/api/player-minutes-projections`).then((r) => r.json()),
      fetch(`${BASE_URL}/api/player-total-points?startGameweek=7&endGameweek=12`).then((r) => r.json()),
    ]);
    minutes = m;
    totals = t;
  }, 300000);

  it("minutes projections flag which gameweeks come from Copilot", () => {
    const flagged = minutes.filter((p) => p.xMinsFromCopilotPerGW && Object.values(p.xMinsFromCopilotPerGW).some(Boolean));
    expect(flagged.length).toBeGreaterThan(300);
    for (const p of flagged.slice(0, 50)) {
      for (const [gw, covered] of Object.entries(p.xMinsFromCopilotPerGW)) {
        if (covered) expect(typeof p.xMinsPerGW[gw]).toBe("number");
      }
    }
  });

  it("total points expose expected minutes (0-90 per fixture) only for covered gameweeks inside the projected range", () => {
    const withX = totals.filter((p) => p.xMinsPerGW && Object.keys(p.xMinsPerGW).length > 0);
    expect(withX.length).toBeGreaterThan(300);
    for (const p of withX.slice(0, 100)) {
      for (const [gw, x] of Object.entries(p.xMinsPerGW as Record<string, number>)) {
        expect(p.gameweekProjections[gw]).toBeDefined();
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(180); // double gameweeks can exceed 90
      }
    }
  });

  it("a player expected to play 0 minutes in a covered gameweek projects no more than tiny points there", () => {
    const zeros: Array<{ name: string; pts: number }> = [];
    for (const p of totals) {
      for (const [gw, x] of Object.entries((p.xMinsPerGW || {}) as Record<string, number>)) {
        if (x === 0) zeros.push({ name: p.playerName, pts: p.gameweekProjections[gw] });
      }
    }
    expect(zeros.length).toBeGreaterThan(0);
    for (const z of zeros) expect(z.pts).toBeLessThan(0.5);
  });
});
