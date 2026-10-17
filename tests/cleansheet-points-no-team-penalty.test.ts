import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = `http://localhost:5050`;

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  return response.json();
}

let csPoints: any[];
let teamCS: any[];
let minutes: any[];

beforeAll(async () => {
  [csPoints, teamCS, minutes] = await Promise.all([
    fetchJSON('/api/player-cleansheet-points'),
    fetchJSON('/api/team-cs-projections'),
    fetchJSON('/api/player-minutes-projections'),
  ]);
});

// A nailed-on starter's clean sheet points should track his team's clean sheet % directly
// (points = minutesFactor x CS% x 4). A team-level "defensive absence" multiplier used to
// shrink every player of a team that had unavailable keepers/defenders on its books — even
// backups who were never going to play — so a team with a better CS% could project fewer
// clean sheet points than a team with a worse one.
describe('/api/player-cleansheet-points has no team-level absence penalty', () => {
  it('a fully available 60+ minute keeper gets ~ CS% x 4 in every single-fixture gameweek', () => {
    const minutesById = new Map(minutes.map((m: any) => [m.playerId, m]));
    const teamByShort = new Map(teamCS.map((t: any) => [t.team, t]));
    let checked = 0;
    for (const p of csPoints) {
      if (p.position !== 'GKP' && p.position !== 'Goalkeeper') continue;
      const m: any = minutesById.get(p.playerId);
      if (!m || m.pct60Plus < 90) continue;
      const team: any = teamByShort.get(p.team);
      if (!team) continue;
      for (const [gw, fixtures] of Object.entries<any[]>(team.fixtureDetails)) {
        if (fixtures.length !== 1) continue;
        if ((m.availabilityRatioPerGW?.[`gw${gw}`] ?? 1) < 1) continue;
        const pts = p.gameweekProjections?.[gw];
        if (pts === undefined) continue;
        const ceiling = 4 * fixtures[0].cleanSheetOdds / 100;
        if (ceiling < 0.2) continue; // rounding noise
        checked++;
        expect(pts / ceiling, `${p.playerName} GW${gw}`).toBeGreaterThan(0.9);
        expect(pts).toBeLessThanOrEqual(ceiling + 0.01);
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});
