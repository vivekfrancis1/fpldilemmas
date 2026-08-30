import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

// Pre-season "GW1 draft" fallback for /api/manager/:managerId/team — mirrors the
// `authenticatedPicks` bypass already supported on /api/manager/:managerId/recommended-transfers.
// Recommended Transfers and Transfer Planner POST a client-cached draft squad here when this
// manager's real picks aren't available from FPL yet (see client/src/lib/preseason-draft-cache.ts
// and client/src/lib/draft-to-fpl-picks.ts).
describe('/api/manager/:managerId/team draft-picks fallback', () => {
  // FPL manager IDs are a much smaller sequential range than this, so it can never resolve to
  // a real account and reliably 404s with TEAM_NOT_AVAILABLE regardless of season progress —
  // unlike a real "currently has no picks" manager ID, which stops being true the moment that
  // manager sets a real team (as 376201, used here pre-season, since has).
  const NONEXISTENT_MANAGER_ID = 999999999;
  // A real manager ID, now with genuine GW2 picks locked in — still useful for the POST test
  // below, which needs a real account so its account-level entry-data enrichment (transfers
  // limit, etc.) has something real to fetch; the draftPicks bypass only replaces the SQUAD
  // PICKS half of the response, not that account-level data.
  const MANAGER_ID = 376201;

  it('plain GET 404s with TEAM_NOT_AVAILABLE for a manager with no picks at all', async () => {
    const res = await fetch(`${BASE_URL}/api/manager/${NONEXISTENT_MANAGER_ID}/team`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('TEAM_NOT_AVAILABLE');
  });

  it('POST with draftPicks bypasses the FPL fetch and returns those picks, enriched with real entry data', async () => {
    const draftPicks = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false, selling_price: 50, purchase_price: 50 },
      { element: 2, position: 2, multiplier: 2, is_captain: true, is_vice_captain: false, selling_price: 120, purchase_price: 120 },
    ];

    const res = await fetch(`${BASE_URL}/api/manager/${MANAGER_ID}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftPicks }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // toMatchObject (not toEqual) — the handler enriches each pick with live-gameweek stat
    // fields (live_minutes, live_points, etc.), same as it would for a real response.
    expect(body.picks).toMatchObject(draftPicks);
    expect(body.active_chip).toBeNull();
    // Enrichment from the real (account-level, not squad-pick-level) entry-data fetch still runs.
    expect(body.transfers).toBeDefined();
    expect(typeof body.transfers.limit).toBe('number');
  }, 15000);
});
