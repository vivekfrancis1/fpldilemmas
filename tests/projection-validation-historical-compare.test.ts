import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin } from './admin-auth-helper';

const BASE_URL = 'http://localhost:5050';

let adminCookie: string;

beforeAll(async () => {
  adminCookie = await loginAsAdmin(BASE_URL);
}, 30000);

// /api/admin/projection-validation compares the model's own forward-looking projections
// against "actual" results. By default "actual" comes from the CURRENT (2026/27) season's
// finished gameweeks — which is empty pre-season, making the whole tool useless until
// kickoff. compareSeason=2025/26 lets it backtest against real completed data instead, by
// name-matching each current player to their 2025/26 row (season_player_snapshot) and
// pulling real per-gameweek stats (gameweek_player_data) to compute actual points using the
// app's own current scoring rules.
describe('Projection validation: compareSeason=2025/26 historical backtest', () => {
  it('returns non-empty, real actual data for 2025/26 (unlike the empty pre-season default)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/projection-validation?compareSeason=2025%2F26`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.compareSeason).toBe('2025/26');
    expect(body.playerCount).toBeGreaterThan(50);

    // At least one high-minutes player should have real, non-zero actual totals —
    // proves the name-match -> gameweek_player_data join actually pulled real data,
    // not just empty/zero placeholders.
    const withData = body.players.filter((p: any) => p.matchesPlayed > 10 && p.actual.totalPoints.pts > 0);
    expect(withData.length).toBeGreaterThan(20);
  }, 120000);

  it('goalkeepers never show non-zero defensive-contribution points in the 2025/26 actuals', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/projection-validation?compareSeason=2025%2F26`, {
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    const gkps = body.players.filter((p: any) => p.position === 'GKP');
    expect(gkps.length).toBeGreaterThan(0);
    for (const gkp of gkps) {
      expect(gkp.actual.defensiveContributions.pts).toBe(0);
    }
  }, 120000);

  it('defaults to the current-season comparison when compareSeason is omitted', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/projection-validation`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.compareSeason).toBe('current');
  }, 120000);
});
