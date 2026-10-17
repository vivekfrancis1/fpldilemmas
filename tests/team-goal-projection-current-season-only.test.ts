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
// This test independently reproduces the dynamic-mode formula from current-standings plus the squad-value
// prior (server/team-goals-squad-value.ts)
// and checks it matches the live projection for a fixture far enough out that 'odds' mode
// has no market to use (falls through to dynamic) — if a last-season blend were reintroduced,
// this would no longer match.
describe('Dynamic-mode team goal projections use only this season\'s data', () => {
  it('reproduces every far-future single-fixture projection from current-standings and squad value, with no last-season contribution', async () => {
    const [standings, projections, bootstrap] = await Promise.all([
      fetchJSON('/api/current-standings'),
      fetchJSON('/api/team-goal-projections'),
      fetchJSON('/api/bootstrap-static'),
    ]);

    // Check every team with exactly one fixture (no DGW/BGW) in a far-future gameweek, so each
    // projection is directly comparable to a single hand-computed value.
    const FAR_FUTURE_GW = '10';
    const squadValue = (teamId: number) =>
      bootstrap.elements.filter((e: any) => e.team === teamId).map((e: any) => e.now_cost)
        .sort((a: number, b: number) => b - a).slice(0, 14).reduce((x: number, y: number) => x + y, 0) / 10;
    let checked = 0;
    let sawPositiveAdjustment = false;
    let sawNegativeAdjustment = false;

    for (const teamProjection of projections) {
      const fixtures = teamProjection.fixtureDetails?.[FAR_FUTURE_GW];
      if (!fixtures || fixtures.length !== 1) continue;
      const team = standings.find((t: any) => t.shortName === teamProjection.teamShort);
      const opponent = standings.find((t: any) => t.shortName === fixtures[0].opponent);
      if (!team || !opponent || team.played === 0 || opponent.played === 0) continue;
      const isHome = fixtures[0].isHome;
      const projected = fixtures[0].goals;

      const attackHalf = (team.goalsFor / team.played) * 0.25 + (team.expectedGoalsFor / team.played) * 0.25;
      const defenceHalf = (opponent.goalsAgainst / opponent.played) * 0.25 + (opponent.expectedGoalsAgainst / opponent.played) * 0.25;
      // Squad value is a prior from outside this season's results (prices of the 14 most expensive
      // players, £m); its weight fades with games played: 0.06 / max(games, 3).
      const games = Math.min(team.played, opponent.played);
      const squadAdjustment = (0.06 / Math.max(games, 3)) * (squadValue(team.id) - squadValue(opponent.id));
      if (squadAdjustment > 0.05) sawPositiveAdjustment = true;
      if (squadAdjustment < -0.05) sawNegativeAdjustment = true;
      // Neither team has 5+ games at either venue this early in the season, so the venue
      // multiplier falls back to the global default (1.10 home / 0.90 away).
      const venueMultiplier = isHome ? 1.10 : 0.90;
      const expected = Math.max(0, Math.min(7, (attackHalf + defenceHalf + squadAdjustment) * venueMultiplier));

      // Projections are served rounded to 2 decimals.
      expect(Math.abs(projected - expected), `${teamProjection.teamShort} GW${FAR_FUTURE_GW}`).toBeLessThan(0.011);
      checked++;
    }

    expect(checked).toBeGreaterThanOrEqual(10);
    expect(sawPositiveAdjustment && sawNegativeAdjustment).toBe(true);
  });

  it('does not move a team\'s projection toward a fixed constant regardless of their actual results (i.e. no last-season/league-average dilution)', async () => {
    // A team with a genuine attacking outburst (goals-for per game well above the league's
    // typical ~1.3-1.5) and a team with a genuine blank (0 goals-for) should stay clearly
    // separated in their projections — if a last-season or league-average blend were still
    // active, both would be pulled substantially toward a shared, more moderate number.
    const standings = await fetchJSON('/api/current-standings');
    const projections = await fetchJSON('/api/team-goal-projections');

    const bestAttack = [...standings].sort((a: any, b: any) => (b.goalsFor / b.played) - (a.goalsFor / a.played))[0];
    const worstAttack = [...standings].sort((a: any, b: any) => (a.goalsFor / a.played) - (b.goalsFor / b.played))[0];

    const avgProjected = (teamShort: string) => {
      const t = projections.find((p: any) => p.teamShort === teamShort);
      const vals = Object.values(t.gameweekProjections || {}).slice(0, 6).map(Number);
      return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    };

    // Scale the bar to how far apart the two teams' real attacks actually are (the attack half of
    // the dynamic formula is 0.25 x goals/game + 0.25 x xG/game), not a fixed number that only
    // holds when results happen to be extreme. The exact formula is checked by the test above.
    const attackSpread =
      0.25 * (bestAttack.goalsFor / bestAttack.played - worstAttack.goalsFor / worstAttack.played) +
      0.25 * (bestAttack.expectedGoalsFor / bestAttack.played - worstAttack.expectedGoalsFor / worstAttack.played);
    expect(avgProjected(bestAttack.shortName) - avgProjected(worstAttack.shortName)).toBeGreaterThan(0.4 * attackSpread);
  });
});
