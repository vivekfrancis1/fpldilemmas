// Calibrates P(minutes played | forecast xMins) from real per-gameweek minutes.
//
// Copilot gives a *mean* expected-minutes figure; the scoring components need a *distribution*
// (a 45-minute mean could be a half-fit starter or a rotation player). Historical xMins
// forecasts don't exist, so the forecast is proxied by the player's trailing mean minutes over
// the previous `window` gameweeks (zeros included — a missed game is part of the forecast). For
// each forecast bin we then tabulate the minutes actually played in the next gameweek.
// Only PRIOR gameweeks feed the forecast, so the outcome never leaks into it.
export interface MinutesRow { playerId: number; gameweek: number; minutes: number }

export interface MinutesBin {
  lo: number;
  hi: number;
  n: number;
  meanX: number; // average forecast in the bin
  meanMinutes: number; // average realised minutes in the bin
  pZero: number; // 0 minutes
  p1to29: number;
  p30to59: number;
  p60to74: number;
  p75plus: number;
}

export const X_BIN_EDGES = [0, 5, 15, 30, 45, 60, 75, 85, 90.0001];

function binIndex(x: number): number {
  for (let i = 0; i < X_BIN_EDGES.length - 1; i++) if (x >= X_BIN_EDGES[i] && x < X_BIN_EDGES[i + 1]) return i;
  return X_BIN_EDGES.length - 2;
}

export function calibrateMinutes(
  rows: MinutesRow[],
  opts: { window: number; minGameweek: number }
): MinutesBin[] {
  const k = X_BIN_EDGES.length - 1;
  const acc = Array.from({ length: k }, () => ({ n: 0, sumX: 0, sumM: 0, zero: 0, a: 0, b: 0, c: 0, d: 0 }));

  const byPlayer = new Map<number, MinutesRow[]>();
  for (const r of rows) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
    byPlayer.get(r.playerId)!.push(r);
  }
  for (const history of byPlayer.values()) {
    history.sort((p, q) => p.gameweek - q.gameweek);
    for (let i = opts.window; i < history.length; i++) {
      if (history[i].gameweek < opts.minGameweek) continue;
      let sum = 0;
      for (let j = i - opts.window; j < i; j++) sum += history[j].minutes;
      const x = sum / opts.window;
      const m = history[i].minutes;
      const s = acc[binIndex(x)];
      s.n++; s.sumX += x; s.sumM += m;
      if (m === 0) s.zero++;
      else if (m < 30) s.a++;
      else if (m < 60) s.b++;
      else if (m < 75) s.c++;
      else s.d++;
    }
  }
  return acc.map((s, i) => ({
    lo: X_BIN_EDGES[i],
    hi: X_BIN_EDGES[i + 1],
    n: s.n,
    meanX: s.n ? s.sumX / s.n : (X_BIN_EDGES[i] + X_BIN_EDGES[i + 1]) / 2,
    meanMinutes: s.n ? s.sumM / s.n : 0,
    pZero: s.n ? s.zero / s.n : 0,
    p1to29: s.n ? s.a / s.n : 0,
    p30to59: s.n ? s.b / s.n : 0,
    p60to74: s.n ? s.c / s.n : 0,
    p75plus: s.n ? s.d / s.n : 0,
  }));
}

// Average realised minutes inside each outcome bucket, over the same samples as calibrateMinutes.
// Used so per-bucket maths (e.g. Poisson exposure = minutes / 90) uses real bucket means.
export function calibrateBucketMinutes(
  rows: MinutesRow[],
  opts: { window: number; minGameweek: number }
): { zero: number; p1to29: number; p30to59: number; p60to74: number; p75plus: number } {
  const sum = { zero: 0, p1to29: 0, p30to59: 0, p60to74: 0, p75plus: 0 };
  const cnt = { zero: 0, p1to29: 0, p30to59: 0, p60to74: 0, p75plus: 0 };
  const byPlayer = new Map<number, MinutesRow[]>();
  for (const r of rows) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
    byPlayer.get(r.playerId)!.push(r);
  }
  for (const history of byPlayer.values()) {
    history.sort((p, q) => p.gameweek - q.gameweek);
    for (let i = opts.window; i < history.length; i++) {
      if (history[i].gameweek < opts.minGameweek) continue;
      const m = history[i].minutes;
      const key = m === 0 ? "zero" : m < 30 ? "p1to29" : m < 60 ? "p30to59" : m < 75 ? "p60to74" : "p75plus";
      sum[key] += m; cnt[key]++;
    }
  }
  const mean = (k: keyof typeof sum) => (cnt[k] ? sum[k] / cnt[k] : 0);
  return { zero: 0, p1to29: mean("p1to29"), p30to59: mean("p30to59"), p60to74: mean("p60to74"), p75plus: mean("p75plus") };
}
