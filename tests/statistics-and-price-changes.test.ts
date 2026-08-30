import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// /api/fixtures-history sources real 2025/26 results from season_fixtures_archive (rather than
// FPL's live /api/fixtures/, which only ever reflects the current season) so Match Stats can
// show a completed season's schedule.
describe('/api/fixtures-history', () => {
  it('returns real, finished 2025/26 fixtures with embedded team names', async () => {
    const fixtures = await fetchJSON('/api/fixtures-history?season=2025%2F26');
    expect(Array.isArray(fixtures)).toBe(true);
    expect(fixtures.length).toBeGreaterThan(300); // 20 teams * 38 GWs / 2 = 380 fixtures

    const sample = fixtures[0];
    expect(sample.finished).toBe(true);
    expect(typeof sample.team_h_name).toBe('string');
    expect(typeof sample.team_a_name).toBe('string');
    expect(typeof sample.team_h_score).toBe('number');
    expect(typeof sample.team_a_score).toBe('number');
  }, 30000);

  it('covers all 38 gameweeks', async () => {
    const fixtures = await fetchJSON('/api/fixtures-history?season=2025%2F26');
    const gameweeks = new Set(fixtures.map((f: any) => f.event));
    expect(gameweeks.size).toBe(38);
  }, 30000);
});

// /api/current-standings?season=2025/26 computes a full enhanced standings table from durable
// archive tables (season_fixtures_archive + historical_player_stats + gameweek_player_data)
// instead of FPL's live (current-season-only) endpoints.
describe('/api/current-standings (historical season)', () => {
  it('returns a real, complete 2025/26 table with Arsenal finishing top', async () => {
    const standings = await fetchJSON('/api/current-standings?venue=all&season=2025%2F26');
    expect(Array.isArray(standings)).toBe(true);
    expect(standings.length).toBe(20); // all 20 real 2025/26 clubs, including relegated ones

    const arsenal = standings.find((t: any) => t.name === 'Arsenal');
    expect(arsenal).toBeDefined();
    expect(arsenal.position).toBe(1);
    expect(arsenal.points).toBe(85);
    expect(arsenal.played).toBe(38);
  }, 30000);

  it('includes relegated 2025/26 clubs with no crest-resolvable current bootstrap ID', async () => {
    const standings = await fetchJSON('/api/current-standings?venue=all&season=2025%2F26');
    const relegated = ['Burnley', 'West Ham', 'Wolves'];
    for (const name of relegated) {
      const team = standings.find((t: any) => t.name === name);
      expect(team, `missing ${name}`).toBeDefined();
      expect(team.played).toBe(38);
    }
  }, 30000);

  it('enhanced stats (defensive contributions, clean sheets) are non-zero and internally consistent', async () => {
    const standings = await fetchJSON('/api/current-standings?venue=all&season=2025%2F26');
    const arsenal = standings.find((t: any) => t.name === 'Arsenal');
    expect(arsenal.cleanSheets).toBeGreaterThan(0);
    expect(arsenal.cleanSheets).toBeLessThanOrEqual(arsenal.played);
    expect(arsenal.defensiveContributions).toBeGreaterThan(0);
    expect(arsenal.goalDifference).toBe(arsenal.goalsFor - arsenal.goalsAgainst);
  }, 30000);

  it('still serves the live (current season) table by default, unaffected by the season param', async () => {
    const defaultStandings = await fetchJSON('/api/current-standings?venue=all');
    const explicitCurrentSeason = await fetchJSON('/api/current-standings?venue=all&season=2026%2F27');
    expect(Array.isArray(defaultStandings)).toBe(true);
    // Omitting ?season= must serve exactly the same (live, current-season) table as explicitly
    // requesting the current season — not a snapshot of any particular played-count, which
    // naturally changes as the real season progresses gameweek by gameweek.
    expect(defaultStandings.length).toBe(explicitCurrentSeason.length);
    for (const team of defaultStandings) {
      const matching = explicitCurrentSeason.find((t: any) => t.id === team.id);
      expect(matching).toBeDefined();
      expect(team.played).toBe(matching.played);
      expect(team.goalsFor).toBe(matching.goalsFor);
    }
  }, 30000);
});

// /api/price-changes/recent has no season column in its underlying table, so old-season rows
// must be filtered by date instead — confirms the 2025/26 rows already in the DB (real data
// from the previous season) are excluded from what's now meant to be 2026/27-only output.
describe('/api/price-changes/recent (current-season filter)', () => {
  it('excludes price changes recorded before the current season', async () => {
    const changes = await fetchJSON('/api/price-changes/recent');
    expect(Array.isArray(changes)).toBe(true);
    // 2025/26 spans Aug 2025 - May 2026, so a plain calendar-year check isn't enough — assert
    // against the actual June 1, 2026 cutoff the endpoint uses.
    for (const change of changes) {
      expect(new Date(change.change_date).getTime()).toBeGreaterThanOrEqual(new Date('2026-06-01').getTime());
    }
  }, 30000);
});
