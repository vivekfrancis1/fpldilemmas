import { describe, it, expect } from "vitest";
import { describeCopilotFreshness } from "../server/copilot-freshness";

const now = new Date("2026-10-16T12:00:00Z");

describe("describeCopilotFreshness", () => {
  it("is fresh when the export is up to 4 days old", () => {
    const r = describeCopilotFreshness({ sourceLastUpdated: "2026-10-14T12:00:00Z", loadedAt: "2026-10-15T09:00:00Z", gameweeks: [7, 8, 9, 10, 11, 12] }, now, 6);
    expect(r.level).toBe("fresh");
    expect(r.ageDays).toBeCloseTo(2, 5);
  });
  it("is aging between 4 and 7 days (Copilot is expected to update twice a week)", () => {
    expect(describeCopilotFreshness({ sourceLastUpdated: "2026-10-10T12:00:00Z", loadedAt: "2026-10-11T00:00:00Z", gameweeks: [7] }, now, 6).level).toBe("aging");
  });
  it("is stale beyond 7 days", () => {
    const r = describeCopilotFreshness({ sourceLastUpdated: "2026-10-01T12:00:00Z", loadedAt: "2026-10-02T00:00:00Z", gameweeks: [7] }, now, 6);
    expect(r.level).toBe("stale");
    expect(r.message).toMatch(/15 days old/);
  });
  it("reports how many upcoming gameweeks the export still covers", () => {
    // current gameweek 9 (next = 10): an export covering GW7-12 still covers GW10, 11, 12 ahead
    const r = describeCopilotFreshness({ sourceLastUpdated: "2026-10-15T12:00:00Z", loadedAt: "2026-10-15T13:00:00Z", gameweeks: [7, 8, 9, 10, 11, 12] }, now, 9);
    expect(r.gameweeksAhead).toBe(3);
  });
  it("flags an export whose gameweeks are all in the past as stale regardless of age", () => {
    const r = describeCopilotFreshness({ sourceLastUpdated: "2026-10-16T08:00:00Z", loadedAt: "2026-10-16T09:00:00Z", gameweeks: [7, 8] }, now, 12);
    expect(r.gameweeksAhead).toBe(0);
    expect(r.level).toBe("stale");
  });
  it("reports 'none loaded' when nothing has been loaded", () => {
    const r = describeCopilotFreshness(null, now, 6);
    expect(r.level).toBe("none");
    expect(r.message).toMatch(/No Copilot/i);
  });
  it("falls back to the load time when the export has no usable timestamp", () => {
    const r = describeCopilotFreshness({ sourceLastUpdated: "not a date", loadedAt: "2026-10-15T12:00:00Z", gameweeks: [7, 8, 9] }, now, 6);
    expect(r.ageDays).toBeCloseTo(1, 5);
  });
});
