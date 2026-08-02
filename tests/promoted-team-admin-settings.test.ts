import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin } from './admin-auth-helper';

const BASE_URL = 'http://localhost:5050';

let adminCookie: string;

beforeAll(async () => {
  adminCookie = await loginAsAdmin(BASE_URL);
}, 30000);

// ─────────────────────────────────────────────────────────────────────────────
// Promoted-team last-season goals for/against — admin-configurable per
// client/src/pages/admin-goal-projections.tsx, backed by server/team-goals-service.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('Admin promoted-team goals settings', () => {
  const endpoint = `${BASE_URL}/api/admin/promoted-team-goals`;

  it('rejects an unauthenticated GET', async () => {
    const res = await fetch(endpoint);
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated PUT', async () => {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: [{ teamName: 'Coventry City', goalsFor: 1, goalsAgainst: 1 }] }),
    });
    expect(res.status).toBe(401);
  });

  it('returns all three promoted teams for an authenticated admin', async () => {
    const res = await fetch(endpoint, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.teams.map((t: any) => t.teamName).sort();
    expect(names).toEqual(['Coventry City', 'Hull City', 'Ipswich Town']);
    for (const team of body.teams) {
      expect(typeof team.goalsFor).toBe('number');
      expect(typeof team.goalsAgainst).toBe('number');
      expect(team.played).toBe(38);
    }
  });

  it('persists an admin update and reflects it on the next GET, then restores the original value', async () => {
    const before = await (await fetch(endpoint, { headers: { Cookie: adminCookie } })).json();
    const original = before.teams.find((t: any) => t.teamName === 'Coventry City');

    const putRes = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ teams: [{ teamName: 'Coventry City', goalsFor: 99, goalsAgainst: 11 }] }),
    });
    expect(putRes.status).toBe(200);

    const after = await (await fetch(endpoint, { headers: { Cookie: adminCookie } })).json();
    const updated = after.teams.find((t: any) => t.teamName === 'Coventry City');
    expect(updated.goalsFor).toBe(99);
    expect(updated.goalsAgainst).toBe(11);

    // Restore, so this test doesn't leave the real setting corrupted for other runs.
    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ teams: [{ teamName: 'Coventry City', goalsFor: original.goalsFor, goalsAgainst: original.goalsAgainst }] }),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Promoted-team last-season clean sheet counts — admin-configurable per
// client/src/pages/admin-clean-sheet-config.tsx
// ─────────────────────────────────────────────────────────────────────────────
describe('Admin promoted-team clean sheets settings', () => {
  const endpoint = `${BASE_URL}/api/admin/promoted-team-clean-sheets`;

  it('rejects an unauthenticated GET', async () => {
    const res = await fetch(endpoint);
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated PUT', async () => {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: [{ teamName: 'Coventry City', cleanSheets: 1 }] }),
    });
    expect(res.status).toBe(401);
  });

  it('returns all three promoted teams for an authenticated admin', async () => {
    const res = await fetch(endpoint, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    const names = body.teams.map((t: any) => t.teamName).sort();
    expect(names).toEqual(['Coventry City', 'Hull City', 'Ipswich Town']);
    for (const team of body.teams) {
      expect(typeof team.cleanSheets).toBe('number');
      expect(team.played).toBe(38);
    }
  });

  it('persists an admin update and reflects it on the next GET, then restores the original value', async () => {
    const before = await (await fetch(endpoint, { headers: { Cookie: adminCookie } })).json();
    const original = before.teams.find((t: any) => t.teamName === 'Ipswich Town');

    const putRes = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ teams: [{ teamName: 'Ipswich Town', cleanSheets: 20 }] }),
    });
    expect(putRes.status).toBe(200);

    const after = await (await fetch(endpoint, { headers: { Cookie: adminCookie } })).json();
    const updated = after.teams.find((t: any) => t.teamName === 'Ipswich Town');
    expect(updated.cleanSheets).toBe(20);

    // Restore, so this test doesn't leave the real setting corrupted for other runs.
    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ teams: [{ teamName: 'Ipswich Town', cleanSheets: original.cleanSheets }] }),
    });
  });
});
