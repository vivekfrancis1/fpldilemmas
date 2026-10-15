import { describe, it, expect } from "vitest";
import { buildSnapshotRows, snapshotRunsToPrune, modelVersion } from "../server/projection-snapshot-utils";
import { summarizeProjectionAccuracy, latestRunBefore } from "../server/projection-backtest";

const player = (id: number) => ({
  playerId: id,
  gameweekBreakdown: {
    "7": { goals: 1, assists: 0.5, cleanSheets: 1, minutes: 2, goalsConceded: -0.2, yellowCards: -0.1, redCards: 0, bonus: 0.4, saves: 0, defensiveContributions: 0.3, points: 4.9 },
    "8": { goals: 0, assists: 0, cleanSheets: 0, minutes: 0, goalsConceded: 0, yellowCards: 0, redCards: 0, bonus: 0, saves: 0, defensiveContributions: 0, points: 0 },
  },
});

describe("buildSnapshotRows", () => {
  it("emits one row per player per gameweek with the component breakdown and total", () => {
    const rows = buildSnapshotRows([player(11), player(12)]);
    expect(rows).toHaveLength(4);
    const r = rows.find((x) => x.playerId === 11 && x.gameweek === 7)!;
    expect(r.total).toBe(4.9);
    expect(r.goals).toBe(1);
    expect(r.cleanSheets).toBe(1);
    expect(r.defensiveContributions).toBe(0.3);
  });
  it("skips non-numeric gameweek keys (e.g. summary entries)", () => {
    const p: any = player(1);
    p.gameweekBreakdown["total"] = { points: 99 };
    expect(buildSnapshotRows([p])).toHaveLength(2);
  });
});

describe("snapshotRunsToPrune", () => {
  const day = (d: number, h: number) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
  const now = new Date(Date.UTC(2026, 9, 20, 12));
  const runs = [
    { snapshotId: "a", takenAt: day(20, 3) },  // today
    { snapshotId: "b", takenAt: day(19, 9) },  // 1 day old: keep (within 2 days)
    { snapshotId: "c", takenAt: day(15, 3) },  // old day, early run
    { snapshotId: "d", takenAt: day(15, 20) }, // same old day, later run -> the one to keep
    { snapshotId: "e", takenAt: day(14, 3) },  // old day with a single run -> keep
  ];
  it("keeps everything from the last 2 days and only the latest run of each older day", () => {
    expect(snapshotRunsToPrune(runs, now).sort()).toEqual(["c"]);
  });
  it("prunes nothing when there is nothing old", () => {
    expect(snapshotRunsToPrune(runs.slice(0, 2), now)).toEqual([]);
  });
});

describe("modelVersion", () => {
  it("labels the maths mode and includes the commit when known", () => {
    expect(modelVersion({ EXPECTED_MINUTES_MODE: "off" })).toBe("legacy");
    expect(modelVersion({})).toBe("expected-minutes");
    expect(modelVersion({ RAILWAY_GIT_COMMIT_SHA: "abcdef123456" })).toBe("expected-minutes@abcdef12");
  });
});

describe("summarizeProjectionAccuracy", () => {
  it("reports n, bias (projected minus actual), MAE, RMSE and rank correlation", () => {
    const s = summarizeProjectionAccuracy([
      { projected: 6, actual: 8 },
      { projected: 4, actual: 2 },
      { projected: 2, actual: 2 },
    ]);
    expect(s.n).toBe(3);
    expect(s.bias).toBeCloseTo(0, 9);
    expect(s.meanAbsError).toBeCloseTo(4 / 3, 9);
    expect(s.rmse).toBeCloseTo(Math.sqrt(8 / 3), 9);
    expect(s.spearman).toBeGreaterThan(0.4);
  });
  it("handles empty input", () => {
    expect(summarizeProjectionAccuracy([])).toEqual({ n: 0, bias: 0, meanAbsError: 0, rmse: 0, spearman: 0 });
  });
});

describe("latestRunBefore", () => {
  const runs = [
    { snapshotId: "a", takenAt: "2026-10-10T03:00:00.000Z" },
    { snapshotId: "b", takenAt: "2026-10-16T21:00:00.000Z" },
    { snapshotId: "c", takenAt: "2026-10-17T12:00:00.000Z" },
  ];
  it("picks the most recent run taken before the deadline (no hindsight)", () => {
    expect(latestRunBefore(runs, "2026-10-17T10:00:00Z")?.snapshotId).toBe("b");
  });
  it("returns undefined when nothing precedes the deadline", () => {
    expect(latestRunBefore(runs, "2026-10-01T10:00:00Z")).toBeUndefined();
  });
});
