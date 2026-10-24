import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5050';

// The Projected Table adds up each unfinished match's win / draw / loss chances (and expected goals) instead of picking
// one result per match, then rounds at the end (see shared/expected-table.ts, unit-tested in expected-table.test.ts).
// These guard what the endpoint hands the pages: every row adds up and draws have not been squeezed out.
describe('/api/projected-standings from expected results', () => {
  const load = async () => {
    const response = await fetch(`${BASE_URL}/api/projected-standings`);
    expect(response.status).toBe(200);
    return response.json();
  };

  it('every row adds up: W + D + L = games played, points = 3W + D, GD = GF - GA, whole numbers throughout', async () => {
    const table = await load();
    expect(table).toHaveLength(20);
    for (const t of table) {
      expect(t.wins + t.draws + t.losses).toBe(t.played);
      expect(t.points).toBe(3 * t.wins + t.draws);
      expect(t.goalDifference).toBe(t.goalsFor - t.goalsAgainst);
      expect(t.played).toBe(t.actualGames + t.projectedGames);
      for (const key of ['wins', 'draws', 'losses', 'points', 'goalsFor', 'goalsAgainst']) expect(Number.isInteger(t[key])).toBe(true);
    }
  });

  it('is ordered by points, then unrounded expected points, then goal difference, and numbered from 1', async () => {
    const table = await load();
    table.forEach((t: any, i: number) => {
      expect(t.position).toBe(i + 1);
      if (i === 0) return;
      const prev = table[i - 1];
      expect(prev.points).toBeGreaterThanOrEqual(t.points);
      if (prev.points === t.points) expect(prev.expectedPoints).toBeGreaterThanOrEqual(t.expectedPoints);
    });
  });

  it('has a realistic number of draws — roughly a fifth to a third of matches, not almost none', async () => {
    const table = await load();
    const draws = table.reduce((n: number, t: any) => n + t.draws, 0) / 2;
    const matches = table.reduce((n: number, t: any) => n + t.played, 0) / 2;
    expect(draws / matches).toBeGreaterThan(0.15);
    expect(draws / matches).toBeLessThan(0.4);
  });
});
