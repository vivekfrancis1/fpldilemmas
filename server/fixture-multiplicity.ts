// Double/blank gameweek helpers for the cached Player Total Points aggregation.
//
// Component endpoints return per-gameweek values in two flavours: goals, assists, clean sheets,
// goals conceded, cards, bonus and saves already SUM over a gameweek's fixtures, while minutes
// points and defensive contributions are a per-fixture constant. The live route multiplies the
// per-fixture ones across fixtures; the cached aggregator must do the same, or a double-gameweek
// player gets one match worth of minutes/DC.

// Map of "teamId-gameweek" -> number of fixtures, for gameweeks in [start, end].
export function fixtureCountsByTeamGW(fixtures: any[], start: number, end: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of fixtures) {
    const gw = f.event;
    if (gw === null || gw === undefined || gw < start || gw > end) continue;
    for (const team of [f.team_h, f.team_a]) {
      const key = `${team}-${gw}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

interface PerFixtureBreakdown {
  minutes: number;
  defensiveContributions: number;
  [key: string]: number;
}

// Scales the per-fixture components by the fixture count; zeroes everything for a blank gameweek.
export function applyFixtureMultiplicity(breakdown: PerFixtureBreakdown, nFixtures: number): void {
  if (nFixtures <= 0) {
    for (const key of Object.keys(breakdown)) breakdown[key] = 0;
    return;
  }
  if (nFixtures === 1) return;
  breakdown.minutes *= nFixtures;
  breakdown.defensiveContributions *= nFixtures;
}
