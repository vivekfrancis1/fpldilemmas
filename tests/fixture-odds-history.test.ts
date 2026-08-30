import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:5050';

// ─────────────────────────────────────────────────────────────────────────────
// Public fixture odds history endpoints — see server/odds-service.ts. Snapshots only exist
// once odds-refresh-scheduler.ts (or a manual admin refresh) has actually run, so these tests
// assert response SHAPE rather than requiring specific data to be present.
// ─────────────────────────────────────────────────────────────────────────────
describe('Fixture odds history endpoints', () => {
  it('lists fixtures with stored odds history (possibly empty)', async () => {
    const res = await fetch(`${BASE_URL}/api/fixture-odds-history/fixtures`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.season).toBe('string');
    expect(Array.isArray(body.fixtures)).toBe(true);
    for (const fixture of body.fixtures) {
      expect(typeof fixture.oddsApiEventId).toBe('string');
      expect(typeof fixture.homeTeam).toBe('string');
      expect(typeof fixture.awayTeam).toBe('string');
      expect(typeof fixture.snapshotCount).toBe('number');
      expect(fixture.snapshotCount).toBeGreaterThan(0);
    }
  });

  it('returns 404 for a fixture with no stored history', async () => {
    const res = await fetch(`${BASE_URL}/api/fixture-odds-history/not-a-real-event-id`);
    expect(res.status).toBe(404);
  });

  it('returns a valid time series for a fixture that does have history', async () => {
    const listRes = await fetch(`${BASE_URL}/api/fixture-odds-history/fixtures`);
    const { fixtures } = await listRes.json();
    if (fixtures.length === 0) {
      // No snapshots collected yet in this environment — shape is covered by the other tests.
      return;
    }

    const target = fixtures[0];
    const res = await fetch(`${BASE_URL}/api/fixture-odds-history/${target.oddsApiEventId}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.oddsApiEventId).toBe(target.oddsApiEventId);
    expect(typeof body.homeTeam).toBe('string');
    expect(typeof body.awayTeam).toBe('string');
    expect(Array.isArray(body.snapshots)).toBe(true);
    expect(body.snapshots.length).toBeGreaterThan(0);

    // Oldest-first ordering
    const timestamps = body.snapshots.map((s: any) => new Date(s.snapshotAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }

    for (const point of body.snapshots) {
      expect(typeof point.bookmakerCount).toBe('number');
      // Probabilities and derived expected-goals are nullable (a snapshot can lack a market),
      // but when present must be finite numbers, not NaN from a bad solve.
      for (const key of ['homeWinProb', 'drawProb', 'awayWinProb', 'over25Prob', 'expectedHomeGoals', 'expectedAwayGoals']) {
        if (point[key] !== null) {
          expect(typeof point[key]).toBe('number');
          expect(Number.isNaN(point[key])).toBe(false);
        }
      }
    }
  });
});
