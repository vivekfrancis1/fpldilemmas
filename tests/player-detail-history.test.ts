import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function getHaalandId(): Promise<number> {
  const bootstrap = await fetchJSON('/api/bootstrap-static');
  const haaland = bootstrap.elements.find((p: any) => p.web_name === 'Haaland');
  return haaland.id;
}

// The "2025/26 Season" gameweek-by-gameweek tab needs its own endpoint since FPL's live
// element-summary "history" field only ever covers the current season. This endpoint
// name-crosswalks the current-bootstrap player to their native 2025/26 element ID
// (gameweek_player_data uses a different, mutually-consistent scheme) and returns their
// real per-gameweek rows for that season.
describe('/api/player-gameweek-history/:playerId (2025/26)', () => {
  it('returns a full season of real per-gameweek data for a held-over player', async () => {
    const haalandId = await getHaalandId();
    const result = await fetchJSON(`/api/player-gameweek-history/${haalandId}?season=2025%2F26`);
    expect(Array.isArray(result.history)).toBe(true);
    expect(result.history.length).toBeGreaterThan(30);

    const totalPoints = result.history.reduce((sum: number, gw: any) => sum + gw.total_points, 0);
    expect(totalPoints).toBe(239);

    const totalGoals = result.history.reduce((sum: number, gw: any) => sum + gw.goals_scored, 0);
    expect(totalGoals).toBe(27);
  }, 30000);

  it('gameweeks are sorted ascending and shaped like the current-season history', async () => {
    const haalandId = await getHaalandId();
    const result = await fetchJSON(`/api/player-gameweek-history/${haalandId}?season=2025%2F26`);
    const rounds = result.history.map((gw: any) => gw.round);
    const sorted = [...rounds].sort((a, b) => a - b);
    expect(rounds).toEqual(sorted);

    const sample = result.history[0];
    expect(typeof sample.round).toBe('number');
    expect(typeof sample.minutes).toBe('number');
    expect(typeof sample.total_points).toBe('number');
  }, 30000);

  it('rejects unsupported seasons', async () => {
    const haalandId = await getHaalandId();
    const response = await fetch(`${BASE_URL}/api/player-gameweek-history/${haalandId}?season=2024%2F25`);
    expect(response.status).toBe(400);
  }, 30000);

  it('returns an empty history for a player with no 2025/26 record (new to the league)', async () => {
    const bootstrap = await fetchJSON('/api/bootstrap-static');
    const historical = await fetchJSON('/api/players/historical/2025%2F26');
    const historicalIds = new Set(historical.map((p: any) => p.playerId));
    const newPlayer = bootstrap.elements.find((p: any) => !historicalIds.has(p.id));

    const result = await fetchJSON(`/api/player-gameweek-history/${newPlayer.id}?season=2025%2F26`);
    expect(result.history).toEqual([]);
  }, 30000);
});
