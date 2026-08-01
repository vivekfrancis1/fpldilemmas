import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// The Team Detail page's "Gameweek Performance" tab needs team-level per-gameweek stat
// totals (goals, cards, bonus, defensive contributions, etc). Neither FPL's live API nor
// season_fixtures_archive carries this — it has to be aggregated from gameweek_player_data,
// attributing each player's row to their team via historical_player_stats (2025/26) or the
// live bootstrap (current season), since gameweek_player_data itself has no team_id column.
describe('/api/team-gameweek-stats/:teamName', () => {
  it('returns a near-full season of real per-gameweek team totals for 2025/26', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26');
    expect(Array.isArray(result.gameweeks)).toBe(true);
    // Not always exactly 38: a rescheduled fixture can land two games under one gameweek
    // tag in season_fixtures_archive (a real quirk of that archive, not this aggregation).
    expect(result.gameweeks.length).toBeGreaterThanOrEqual(35);

    const sample = result.gameweeks[0];
    expect(typeof sample.gameweek).toBe('number');
    expect(typeof sample.goals_scored).toBe('number');
  }, 30000);

  it('a specific gameweek\'s aggregated goals match that gameweek\'s real fixture score', async () => {
    const [teamGw, fixtures] = await Promise.all([
      fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26'),
      fetchJSON('/api/fixtures-history?season=2025%2F26'),
    ]);
    const gw1Fixture = fixtures.find((f: any) => f.event === 1 && (f.team_h_name === 'Arsenal' || f.team_a_name === 'Arsenal'));
    expect(gw1Fixture).toBeDefined();
    const arsenalGoalsGw1 = gw1Fixture.team_h_name === 'Arsenal' ? gw1Fixture.team_h_score : gw1Fixture.team_a_score;

    const gw1Stats = teamGw.gameweeks.find((gw: any) => gw.gameweek === 1);
    expect(gw1Stats).toBeDefined();
    expect(gw1Stats.goals_scored).toBe(arsenalGoalsGw1);
  }, 30000);

  it('gameweeks are sorted ascending', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26');
    const gws = result.gameweeks.map((gw: any) => gw.gameweek);
    expect(gws).toEqual([...gws].sort((a, b) => a - b));
  }, 30000);

  it('returns an empty list for an unknown team name', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Not%20A%20Real%20Team?season=2025%2F26');
    expect(result.gameweeks).toEqual([]);
  }, 30000);

  it('defaults to the current season and returns a well-formed (possibly empty) response', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Arsenal');
    expect(Array.isArray(result.gameweeks)).toBe(true);
  }, 30000);
});
