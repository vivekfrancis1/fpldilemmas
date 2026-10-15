// Back-testing helpers: how good were Copilot's expected-minutes forecasts against the minutes
// players actually played? Also shows realised P(plays) / P(60+) per forecast bucket, which is the
// check on the calibrated minutes model (shared/minutes-model.ts).
export interface ForecastRow { forecast: number; actual: number }

const BUCKETS: Array<{ label: string; test: (f: number) => boolean }> = [
  { label: "<30", test: (f) => f < 30 },
  { label: "30-59", test: (f) => f >= 30 && f < 60 },
  { label: "60-74", test: (f) => f >= 60 && f < 75 },
  { label: "75+", test: (f) => f >= 75 },
];

const mean = (x: number[]) => (x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0);

export function summarizeMinutesForecast(rows: ForecastRow[]) {
  const diffs = rows.map((r) => r.forecast - r.actual);
  return {
    n: rows.length,
    bias: mean(diffs),
    meanAbsError: mean(diffs.map(Math.abs)),
    byBucket: BUCKETS.map((b) => {
      const sel = rows.filter((r) => b.test(r.forecast));
      return {
        label: b.label,
        n: sel.length,
        forecastMean: mean(sel.map((r) => r.forecast)),
        actualMean: mean(sel.map((r) => r.actual)),
        actualPPlays: mean(sel.map((r) => (r.actual > 0 ? 1 : 0))),
        actualP60: mean(sel.map((r) => (r.actual >= 60 ? 1 : 0))),
      };
    }),
  };
}
