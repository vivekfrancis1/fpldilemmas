// DB-free helpers for projection snapshots (kept separate so they are unit-testable).
export interface SnapshotRow {
  playerId: number;
  gameweek: number;
  total: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  minutes: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  bonus: number;
  saves: number;
  defensiveContributions: number;
}

// One row per player per gameweek from the aggregator's output (PlayerPointsData[]).
export function buildSnapshotRows(
  players: Array<{ playerId: number; gameweekBreakdown: { [gw: string]: any } }>
): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  for (const p of players) {
    for (const [gwKey, b] of Object.entries(p.gameweekBreakdown || {})) {
      const gameweek = parseInt(gwKey, 10);
      if (isNaN(gameweek)) continue;
      rows.push({
        playerId: p.playerId,
        gameweek,
        total: Number(b.points) || 0,
        goals: Number(b.goals) || 0,
        assists: Number(b.assists) || 0,
        cleanSheets: Number(b.cleanSheets) || 0,
        minutes: Number(b.minutes) || 0,
        goalsConceded: Number(b.goalsConceded) || 0,
        yellowCards: Number(b.yellowCards) || 0,
        redCards: Number(b.redCards) || 0,
        bonus: Number(b.bonus) || 0,
        saves: Number(b.saves) || 0,
        defensiveContributions: Number(b.defensiveContributions) || 0,
      });
    }
  }
  return rows;
}

// Keep every run from the last 2 days; for older days keep only the latest run of each UTC day.
// Returns the ids to delete.
export function snapshotRunsToPrune(runs: Array<{ snapshotId: string; takenAt: string }>, now: Date = new Date()): string[] {
  const cutoff = now.getTime() - 2 * 24 * 3600 * 1000;
  const latestPerDay = new Map<string, { snapshotId: string; t: number }>();
  for (const r of runs) {
    const t = new Date(r.takenAt).getTime();
    if (t >= cutoff) continue;
    const day = new Date(t).toISOString().slice(0, 10);
    const cur = latestPerDay.get(day);
    if (!cur || t > cur.t) latestPerDay.set(day, { snapshotId: r.snapshotId, t });
  }
  const keep = new Set([...latestPerDay.values()].map((v) => v.snapshotId));
  return runs.filter((r) => new Date(r.takenAt).getTime() < cutoff && !keep.has(r.snapshotId)).map((r) => r.snapshotId);
}

// Which maths produced a snapshot, so models can be compared after the fact.
export function modelVersion(env: Record<string, string | undefined> = process.env): string {
  const base = env.EXPECTED_MINUTES_MODE === "off" ? "legacy" : "expected-minutes";
  const sha = env.RAILWAY_GIT_COMMIT_SHA ? env.RAILWAY_GIT_COMMIT_SHA.slice(0, 8) : "";
  return sha && base !== "legacy" ? `${base}@${sha}` : base;
}
