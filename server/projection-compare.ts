// Compares our per-gameweek point projections with an independent forecast (Copilot's xPts).
// Copilot is a second opinion, not ground truth: disagreements are flagged for review, and
// realised points remain the real arbiter.
export interface CompareRow { name: string; gw: number; ours: number; theirs: number; xMins: number }

function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[order[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(a: number[], b: number[]): number {
  if (a.length < 2 || a.length !== b.length) return 0;
  const ra = ranks(a), rb = ranks(b);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

const BUCKETS: Array<{ label: string; test: (x: number) => boolean }> = [
  { label: "<45", test: (x) => x < 45 },
  { label: "45-74", test: (x) => x >= 45 && x < 75 },
  { label: "75+", test: (x) => x >= 75 },
];

export function comparePredictions(rows: CompareRow[], topOutliers = 10) {
  const mean = (x: number[]) => (x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0);
  const diffs = rows.map((r) => r.ours - r.theirs);
  return {
    n: rows.length,
    bias: mean(diffs),
    meanAbsDiff: mean(diffs.map(Math.abs)),
    spearman: spearman(rows.map((r) => r.ours), rows.map((r) => r.theirs)),
    byXMins: BUCKETS.map((b) => {
      const sel = rows.filter((r) => b.test(r.xMins));
      const d = sel.map((r) => r.ours - r.theirs);
      return { label: b.label, n: sel.length, bias: mean(d), meanAbsDiff: mean(d.map(Math.abs)) };
    }),
    outliers: [...rows].sort((a, b) => Math.abs(b.ours - b.theirs) - Math.abs(a.ours - a.theirs)).slice(0, topOutliers),
  };
}
