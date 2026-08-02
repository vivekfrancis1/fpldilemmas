import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5050';
// Matches the seeded admin account in server/seed-admin-user.ts — see
// promoted-team-admin-settings.test.ts for why this isn't imported directly.
const ADMIN_EMAIL = 'fpldilemmas@gmail.com';
const ADMIN_PASSWORD = 'fpldilemmas2024';

async function loginAsAdmin(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.get('set-cookie');
  expect(setCookie).toBeTruthy();
  return setCookie!.split(';')[0];
}

let adminCookie: string;

beforeAll(async () => {
  adminCookie = await loginAsAdmin();
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
