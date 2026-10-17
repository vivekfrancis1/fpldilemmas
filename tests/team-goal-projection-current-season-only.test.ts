import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Regression guard for TeamGoalsService.getTeamAverageGoals/getTeamAverageGoalsConceded:
// dynamic-mode team goal projections must be derived ONLY from this season's (2026/27)
// current-standings data (goals-for/against, xG-for/against, per the team's own actual
// completed-fixture count) — the 2025/26 last-season blend was deliberately removed per
// explicit product decision, even though that means early-season projections are more
// volatile (a single fluke result carries full weight, undamped, until more games accumulate).
// The dynamic-mode formula is the team-strength model in server/team-goals-strength.ts (xG-difference
// rating gap, scaled by games played, around the league-average goals). Fitted values below must
// match STRENGTH_MAX_WEIGHT / STRENGTH_HALF_GAMES there.
// This test independently reproduces the dynamic-mode formula from current-standings alone
// and checks it matches the live projection for a fixture far enough out that 'odds' mode
// has no market to use (falls through to dynamic) — if a last-season blend were reintroduced,
// this would no longer match.
describe('Dynamic-mode team goal projections use only this season\'s data', () => {
  it('reproduces a far-future fixture projection purely from current-standings, with no last-season contribution', async () => {
    const [standings, projections] = await Promise.all([
      fetchJSON('/api/current-standings'),
      fetchJSON('/api/team-goal-projections'),
    ]);

    // Pick a team+far-future-gameweek combo with exactly one fixture (no DGW/BGW) so the
    // projection is directly comparable to a single hand-computed value.
    const FAR_FUTURE_GW = '10';
    let target: { team: any; opponent: any; isHome: boolean; projected: number } | undefined;

    for (const teamProjection of projections) {
      const fixtures = teamProjection.fixtureDetails?.[FAR_FUTURE_GW];
      if (!fixtures || fixtures.length !== 1) continue;
      const team = standings.find((t: any) => t.shortName === teamProjection.teamShort);
      const opponent = standings.find((t: any) => t.shortName === fixtures[0].opponent);
      if (!team || !opponent || team.played === 0 || opponent.played === 0) continue;
      target = { team, opponent, isHome: fixtures[0].isHome, projected: fixtures[0].goals };
      break;
    }

    expect(target).toBeDefined();
    const { team, opponent, isHome, projected } = target!;

    const rating = (t: any) => (t.expectedGoalsFor - t.expectedGoalsAgainst) / t.played;
    const leagueAvg = standings.reduce((a: number, t: any) => a + t.goalsFor, 0) / standings.reduce((a: number, t: any) => a + t.played, 0);
    const games = Math.min(team.played, opponent.played);
    const weight = (0.5 * games) / (games + 2.5);
    // Neither team has 5+ games at either venue this early in the season, so the venue
    // multiplier falls back to the global default (1.15 home / 0.87 away).
    const venueMultiplier = isHome ? 1.15 : 0.87;
    const expected = Math.max(0, Math.min(7, (leagueAvg + weight * (rating(team) - rating(opponent))) * venueMultiplier));

    expect(projected).toBeCloseTo(expected, 1);
  });

  it('keeps a genuinely strong team clearly above a genuinely weak one (real results are not diluted away)', async () => {
    // The team with the best xG difference per game and the one with the worst should stay clearly
    // separated in their projections — if a last-season or league-average blend were reintroduced,
    // both would be pulled toward a shared, more moderate number. The exact formula is checked by
    // the test above.
    const standings = await fetchJSON('/api/current-standings');
    const projections = await fetchJSON('/api/team-goal-projections');

    const net = (t: any) => (t.expectedGoalsFor - t.expectedGoalsAgainst) / t.played;
    const sorted = [...standings].sort((a: any, b: any) => net(b) - net(a));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const avgProjected = (teamShort: string) => {
      const t = projections.find((p: any) => p.teamShort === teamShort);
      const vals = Object.values(t.gameweekProjections || {}).slice(0, 6).map(Number);
      return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    };

    expect(avgProjected(best.shortName) - avgProjected(worst.shortName)).toBeGreaterThan(0.1);
  });
});
