import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5050';

// The Projected Table gives each unfinished match to the likeliest of home win / draw / away win (see
// shared/projected-result.ts), not to whichever side has more rounded projected goals. The choice itself is unit-tested
// in projected-result-from-probabilities.test.ts; this guards the endpoint's bookkeeping around it.
describe('/api/projected-standings with results from win/draw/away-win %', () => {
  it('every team\'s wins, draws, losses and points agree with its games played', async () => {
    const response = await fetch(`${BASE_URL}/api/projected-standings`);
    expect(response.status).toBe(200);
    const table = await response.json();
    expect(table).toHaveLength(20);
    for (const t of table) {
      expect(t.wins + t.draws + t.losses).toBe(t.played);
      expect(t.points).toBe(3 * t.wins + t.draws);
      expect(t.played).toBe(t.actualGames + t.projectedGames);
    }
  });

  it('every match has one winner or is a draw for both: total wins equals total losses and draws come in pairs', async () => {
    const table = await (await fetch(`${BASE_URL}/api/projected-standings`)).json();
    const sum = (key: string) => table.reduce((n: number, t: any) => n + t[key], 0);
    expect(sum('wins')).toBe(sum('losses'));
    expect(sum('draws') % 2).toBe(0);
  });
});
