import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// The Team Detail page's "Gameweek Performance" tab needs team-level per-fixture stat
// totals (goals, cards, bonus, defensive contributions, etc). Neither FPL's live API nor
// season_fixtures_archive carries this — it has to be aggregated from gameweek_player_data,
// attributing each player's row to their team via historical_player_stats (2025/26) or the
// live bootstrap (current season), since gameweek_player_data itself has no team_id column.
//
// Grouped by fixture_id, NOT gameweek number: a postponed fixture can share its original
// gameweek's number with another match (e.g. two real Arsenal 2025/26 fixtures both tagged
// gameweek 26 in season_fixtures_archive — a genuine rescheduling quirk in that archive).
// Grouping by gameweek would merge the two fixtures' stats into one bucket that the client
// then double-counts when it attaches the same bucket to both fixture rows.
describe('/api/team-gameweek-stats/:teamName', () => {
  it('returns a near-full season of real per-fixture team totals for 2025/26', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26');
    expect(Array.isArray(result.fixtures)).toBe(true);
    // Not always exactly 38: gameweek_player_data can be missing rows entirely for a single
    // rescheduled fixture (a real gap in that archive, not this aggregation).
    expect(result.fixtures.length).toBeGreaterThanOrEqual(36);

    const sample = result.fixtures[0];
    expect(typeof sample.fixture_id).toBe('number');
    expect(typeof sample.gameweek).toBe('number');
    expect(typeof sample.goals_scored).toBe('number');
  }, 30000);

  it('only includes fixtures the team actually played (no misattributed fixture_ids from a mid-season transfer)', async () => {
    const [teamGw, fixtures] = await Promise.all([
      fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26'),
      fetchJSON('/api/fixtures-history?season=2025%2F26'),
    ]);
    const realArsenalFixtureIds = new Set(
      fixtures.filter((f: any) => f.team_h_name === 'Arsenal' || f.team_a_name === 'Arsenal').map((f: any) => f.id)
    );
    for (const f of teamGw.fixtures) {
      expect(realArsenalFixtureIds.has(f.fixture_id)).toBe(true);
    }
  }, 30000);

  it('a specific gameweek\'s aggregated goals match that gameweek\'s real fixture score', async () => {
    const [teamGw, fixtures] = await Promise.all([
      fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26'),
      fetchJSON('/api/fixtures-history?season=2025%2F26'),
    ]);
    const gw1Fixture = fixtures.find((f: any) => f.event === 1 && (f.team_h_name === 'Arsenal' || f.team_a_name === 'Arsenal'));
    expect(gw1Fixture).toBeDefined();
    const arsenalGoalsGw1 = gw1Fixture.team_h_name === 'Arsenal' ? gw1Fixture.team_h_score : gw1Fixture.team_a_score;

    const gw1Stats = teamGw.fixtures.find((f: any) => f.fixture_id === gw1Fixture.id);
    expect(gw1Stats).toBeDefined();
    expect(gw1Stats.goals_scored).toBe(arsenalGoalsGw1);
  }, 30000);

  it('never returns duplicate fixture_ids, even when two real fixtures share a gameweek tag', async () => {
    // Real rescheduling quirk: season_fixtures_archive tags two distinct Arsenal 2025/26
    // fixtures (Brentford away and Wolves away) both as gameweek 26. Grouping by fixture_id
    // (not gameweek) means each stays its own entry — this asserts the general invariant
    // that would catch any regression back to gameweek-based grouping (which double-counted).
    const fixtures = await fetchJSON('/api/fixtures-history?season=2025%2F26');
    const gw26Fixtures = fixtures.filter((f: any) => f.event === 26 && (f.team_h_name === 'Arsenal' || f.team_a_name === 'Arsenal'));
    expect(gw26Fixtures.length).toBe(2);

    const teamGw = await fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26');
    const allFixtureIds = teamGw.fixtures.map((f: any) => f.fixture_id);
    expect(new Set(allFixtureIds).size).toBe(allFixtureIds.length);
  }, 30000);

  it('aggregated goals scored across all fixtures are close to (but never exceed) the season total from /api/current-standings', async () => {
    const [teamGw, standings] = await Promise.all([
      fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26'),
      fetchJSON('/api/current-standings?venue=all&season=2025%2F26'),
    ]);
    const arsenal = standings.find((t: any) => t.name === 'Arsenal');
    expect(arsenal).toBeDefined();

    const totalGoals = teamGw.fixtures.reduce((sum: number, f: any) => sum + f.goals_scored, 0);
    // A missing fixture's worth of goals is a real archive gap (see test above) — the
    // aggregation must never OVER-count (that would mean a fixture's stats were double-counted),
    // but a small under-count from one missing fixture is expected.
    expect(totalGoals).toBeLessThanOrEqual(arsenal.goalsFor);
    expect(totalGoals).toBeGreaterThan(arsenal.goalsFor - 10);
  }, 30000);

  it('fixtures are sorted by gameweek ascending', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Arsenal?season=2025%2F26');
    const gws = result.fixtures.map((f: any) => f.gameweek);
    expect(gws).toEqual([...gws].sort((a, b) => a - b));
  }, 30000);

  it('returns an empty list for an unknown team name', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Not%20A%20Real%20Team?season=2025%2F26');
    expect(result.fixtures).toEqual([]);
  }, 30000);

  it('defaults to the current season and returns a well-formed (possibly empty) response', async () => {
    const result = await fetchJSON('/api/team-gameweek-stats/Arsenal');
    expect(Array.isArray(result.fixtures)).toBe(true);
  }, 30000);
});
