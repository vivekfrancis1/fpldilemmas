// Turns the /api/player-defensive-contributions-projections payload into DB rows. The payload's
// gameweekProjections is keyed "gw6" with { dc, points } values; the older shape was keyed "6"
// with a bare number. Both are accepted.
export interface DefensiveRecord {
  playerId: number;
  gameweek: number;
  season: string;
  defensiveContribution: number;
  points: number;
}

export function buildDefensiveRecords(data: any[], season: string): DefensiveRecord[] {
  const records: DefensiveRecord[] = [];
  for (const player of data) {
    const proj = player.gameweekProjections;
    if (!proj || typeof proj !== "object") continue;
    for (const [key, value] of Object.entries(proj)) {
      const gw = parseInt(key.replace(/^gw/i, ""), 10);
      if (isNaN(gw) || gw < 1 || gw > 38) continue;
      const dc = typeof value === "number" ? value : Number((value as any)?.dc ?? 0);
      const points = typeof value === "number" ? 0 : Number((value as any)?.points ?? 0);
      if (!(dc > 0)) continue;
      records.push({
        playerId: player.playerId,
        gameweek: gw,
        season,
        defensiveContribution: Number(dc.toFixed(2)),
        points: Number(points.toFixed(2)),
      });
    }
  }
  return records;
}
