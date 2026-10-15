// Scoring projections against realised points, and choosing the right snapshot to score.
import { spearman } from "./projection-compare";

export function summarizeProjectionAccuracy(rows: Array<{ projected: number; actual: number }>) {
  if (rows.length === 0) return { n: 0, bias: 0, meanAbsError: 0, rmse: 0, spearman: 0 };
  const diffs = rows.map((r) => r.projected - r.actual);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  return {
    n: rows.length,
    bias: mean(diffs),
    meanAbsError: mean(diffs.map(Math.abs)),
    rmse: Math.sqrt(mean(diffs.map((d) => d * d))),
    spearman: spearman(rows.map((r) => r.projected), rows.map((r) => r.actual)),
  };
}

// The most recent run taken strictly before the deadline — a fair test uses what was known then.
export function latestRunBefore<T extends { takenAt: string }>(runs: T[], deadlineIso: string): T | undefined {
  const deadline = new Date(deadlineIso).getTime();
  let best: T | undefined;
  for (const r of runs) {
    const t = new Date(r.takenAt).getTime();
    if (t < deadline && (!best || t > new Date(best.takenAt).getTime())) best = r;
  }
  return best;
}
