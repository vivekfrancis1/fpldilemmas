import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Pre-season / early-season regression guard for TeamGoalsService.calculateFixtureGoals
// (dynamic mode). Bug: getTeamAverageXG/getTeamAverageXGC fall back to the SAME flat
// constant (1.3 xG, 1.5 xGC) for every team when there's no current-season data yet,
// while getTeamAverageGoals/getTeamAverageGoalsConceded correctly blend in real
// last-season data. Since the flat xG/xGC terms are identical for every team, they
// contribute nothing to the *difference* between teams but still eat half the formula's
// weight — diluting the real last-season signal and compressing all 20 teams into a
// narrow, largely undifferentiated band. Symptom reported live: /projected-standings
// had Everton finishing 2nd and Fulham 3rd.
describe('Dynamic-mode team goal projections during pre-season (no current-season data)', () => {
  it('produces a meaningfully wider spread across teams than the diluted-formula baseline', async () => {
    const projections = await fetchJSON('/api/team-goal-projections');
    const averages = projections.map((t: any) => {
      const vals = Object.values(t.gameweekProjections || {}).slice(0, 6).map(Number);
      return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    });

    const mean = averages.reduce((a: number, b: number) => a + b, 0) / averages.length;
    const variance = averages.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / averages.length;
    const stdDev = Math.sqrt(variance);

    // Buggy (diluted) formula measured ~0.078 stddev across the live 20-team set.
    // Un-diluted (real last-season signal at full weight) should be close to double that.
    expect(stdDev).toBeGreaterThan(0.12);
  });

  it('clearly separates a historically elite attack (Man City) from a historically weak one (Everton)', async () => {
    const projections = await fetchJSON('/api/team-goal-projections');
    const manCity = projections.find((t: any) => t.teamId === 15);
    const everton = projections.find((t: any) => t.teamId === 9);
    expect(manCity).toBeDefined();
    expect(everton).toBeDefined();

    const avg = (t: any) => {
      const vals = Object.values(t.gameweekProjections || {}).slice(0, 6).map(Number);
      return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    };

    // Buggy formula measured ~0.17 gap; un-diluted should be closer to ~0.35.
    expect(avg(manCity) - avg(everton)).toBeGreaterThan(0.25);
  });
});
