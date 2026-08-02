import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin } from './admin-auth-helper';

const BASE_URL = 'http://localhost:5050';

let adminCookie: string;

beforeAll(async () => {
  adminCookie = await loginAsAdmin(BASE_URL);
}, 30000);

// ─────────────────────────────────────────────────────────────────────────────
// Fixture odds admin endpoints — see server/odds-service.ts. POST /refresh-odds calls the
// real Odds API and costs free-tier quota, so it is NEVER exercised here beyond confirming
// it's behind auth — only GET /fixture-odds (which just reads already-stored rows) gets a
// full authenticated-path test.
// ─────────────────────────────────────────────────────────────────────────────
describe('Admin fixture odds endpoints', () => {
  it('rejects an unauthenticated GET of stored odds', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/fixture-odds`);
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated POST to refresh odds', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/refresh-odds`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('returns stored odds for an authenticated admin', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/fixture-odds`, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.season).toBe('string');
    expect(Array.isArray(body.odds)).toBe(true);
    for (const row of body.odds) {
      expect(typeof row.homeTeam).toBe('string');
      expect(typeof row.awayTeam).toBe('string');
      expect(typeof row.bookmakerCount).toBe('number');
    }
  });

  it('accepts a season query param for an authenticated admin', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/fixture-odds?season=2025/26`, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.season).toBe('2025/26');
    expect(Array.isArray(body.odds)).toBe(true);
  });
});
