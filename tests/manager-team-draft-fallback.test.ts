import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

// Pre-season "GW1 draft" fallback for /api/manager/:managerId/team — mirrors the
// `authenticatedPicks` bypass already supported on /api/manager/:managerId/recommended-transfers.
// Recommended Transfers and Transfer Planner POST a client-cached draft squad here when this
// manager's real picks aren't available from FPL yet (see client/src/lib/preseason-draft-cache.ts
// and client/src/lib/draft-to-fpl-picks.ts).
describe('/api/manager/:managerId/team draft-picks fallback', () => {
  // A real, currently-pre-season manager ID (no 2026/27 picks locked yet) used throughout this
  // session's manual testing — confirmed to 404 with TEAM_NOT_AVAILABLE on plain GET.
  const MANAGER_ID = 376201;

  it('plain GET is unchanged: still 404s with TEAM_NOT_AVAILABLE when no real picks exist yet', async () => {
    const res = await fetch(`${BASE_URL}/api/manager/${MANAGER_ID}/team`);
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
