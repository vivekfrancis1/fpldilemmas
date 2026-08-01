import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// /api/players/blended powers the Player Statistics "Blended" season option: it uses
// live 2026/27 bootstrap data for whatever's actually available this early in the season
// (price, ownership) and falls back to real 2025/26 season totals for everything else
// (points, goals, assists, minutes, form, defensive contributions, etc).
describe('/api/players/blended', () => {
  it('covers the full current-bootstrap player universe', async () => {
    const [blended, bootstrap] = await Promise.all([
      fetchJSON('/api/players/blended'),
      fetchJSON('/api/bootstrap-static'),
    ]);
    expect(Array.isArray(blended)).toBe(true);
    expect(blended.length).toBe(bootstrap.elements.length);
  }, 30000);

  it('uses the live 2026/27 price and ownership for a held-over player', async () => {
    const [blended, bootstrap] = await Promise.all([
      fetchJSON('/api/players/blended'),
      fetchJSON('/api/bootstrap-static'),
    ]);
    const haaland = bootstrap.elements.find((p: any) => p.web_name === 'Haaland');
    expect(haaland).toBeDefined();
    const blendedHaaland = blended.find((p: any) => p.id === haaland.id);
    expect(blendedHaaland).toBeDefined();
    expect(blendedHaaland.now_cost).toBe(haaland.now_cost);
    expect(blendedHaaland.selected_by_percent).toBe(haaland.selected_by_percent);
  }, 30000);

  it('uses real 2025/26 season totals for non-price stats on a held-over player', async () => {
    const [blended, bootstrap, historical] = await Promise.all([
      fetchJSON('/api/players/blended'),
      fetchJSON('/api/bootstrap-static'),
      fetchJSON('/api/players/historical/2025%2F26'),
    ]);
    const haaland = bootstrap.elements.find((p: any) => p.web_name === 'Haaland');
    const historicalHaaland = historical.find((p: any) => p.playerId === haaland.id);
    expect(historicalHaaland).toBeDefined();
    expect(historicalHaaland.total_points).toBeGreaterThan(0);

    const blendedHaaland = blended.find((p: any) => p.id === haaland.id);
    expect(blendedHaaland.total_points).toBe(historicalHaaland.total_points);
    expect(blendedHaaland.goals_scored).toBe(historicalHaaland.goals_scored);
    expect(blendedHaaland.minutes).toBe(historicalHaaland.minutes);
  }, 30000);

  it('computes Value as 2025/26 total points divided by the 2026/27 price', async () => {
    const [blended, bootstrap, historical] = await Promise.all([
      fetchJSON('/api/players/blended'),
      fetchJSON('/api/bootstrap-static'),
      fetchJSON('/api/players/historical/2025%2F26'),
    ]);
    const haaland = bootstrap.elements.find((p: any) => p.web_name === 'Haaland');
    const historicalHaaland = historical.find((p: any) => p.playerId === haaland.id);
    const blendedHaaland = blended.find((p: any) => p.id === haaland.id);

    const expectedValue = (historicalHaaland.total_points / (haaland.now_cost / 10)).toFixed(1);
    expect(blendedHaaland.value_season).toBe(expectedValue);
  }, 30000);

  it('computes Value Form as 2025/26 form divided by the 2026/27 price', async () => {
    const [blended, bootstrap, historical] = await Promise.all([
      fetchJSON('/api/players/blended'),
      fetchJSON('/api/bootstrap-static'),
      fetchJSON('/api/players/historical/2025%2F26'),
    ]);
    const haaland = bootstrap.elements.find((p: any) => p.web_name === 'Haaland');
    const historicalHaaland = historical.find((p: any) => p.playerId === haaland.id);
    const blendedHaaland = blended.find((p: any) => p.id === haaland.id);

    const expectedValueForm = ((parseFloat(historicalHaaland.form) || 0) / (haaland.now_cost / 10)).toFixed(1);
    expect(blendedHaaland.value_form).toBe(expectedValueForm);
  }, 30000);

  it('handles players with no 2025/26 history gracefully (zeroed non-price stats)', async () => {
    const [blended, bootstrap] = await Promise.all([
      fetchJSON('/api/players/blended'),
      fetchJSON('/api/bootstrap-static'),
    ]);
    // Any current-bootstrap player not present in blended output would be a bug —
    // spot-check that every player has a well-formed row with no missing price field.
    for (const player of bootstrap.elements) {
      const row = blended.find((p: any) => p.id === player.id);
      expect(row, `missing blended row for ${player.web_name}`).toBeDefined();
      expect(row.now_cost).toBe(player.now_cost);
      expect(typeof row.total_points).toBe('number');
    }
  }, 30000);
});
