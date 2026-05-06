import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = `http://localhost:5000`;

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchJSONOptional(path: string): Promise<any | null> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.json();
}

let bootstrapData: any;
let currentGameweek: number;
let nextGameweek: number;
let endGameweek: number;

beforeAll(async () => {
  bootstrapData = await fetchJSON('/api/bootstrap-static');
  currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 1;
  nextGameweek = Math.min(currentGameweek + 1, 38);
  endGameweek = Math.min(nextGameweek + 11, 38);
}, 30000);

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT CACHE IMMUTABILITY: snapshot the raw in-memory cache entry before and
// after serving a cache-hit request and assert the stored entry is unchanged.
// This confirms deep-clone protection is working: the stored object is never
// mutated even though transformations are applied to the outgoing response.
// ─────────────────────────────────────────────────────────────────────────────

describe('Direct cache-entry immutability – player-total-points', () => {
  it('raw cache entry is byte-for-byte identical before and after a cache-hit request', async () => {
    const cacheKey = `${nextGameweek}-${endGameweek}`;
    const liveUrl = `/api/player-total-points?startGameweek=${nextGameweek}&endGameweek=${endGameweek}`;
    const snapshotUrl = `/api/admin/cache-snapshot?key=${encodeURIComponent(cacheKey)}`;

    // Warm the cache
    await fetchJSON(liveUrl);

    // Snapshot the raw stored entry
    const snapBefore = await fetchJSONOptional(snapshotUrl);
    expect(snapBefore).not.toBeNull();
    expect(snapBefore.playerCount).toBeGreaterThan(0);

    // Trigger two more cache hits (transformed output is returned but cache must be unchanged)
    await fetchJSON(liveUrl);
    await fetchJSON(liveUrl);

    // Snapshot the raw stored entry again — must be identical
    const snapAfter = await fetchJSONOptional(snapshotUrl);
    expect(snapAfter).not.toBeNull();

    // playerCount must not change
    expect(snapAfter.playerCount).toBe(snapBefore.playerCount);

    // storedTimestamp must not change (the cache was not invalidated and re-populated)
    expect(snapAfter.storedTimestamp).toBe(snapBefore.storedTimestamp);

    // Per-player snapshots must be identical — checks that both projection values
    // and component breakdown values in the stored entry have not drifted
    for (let i = 0; i < snapBefore.snapshot.length; i++) {
      const before = snapBefore.snapshot[i];
      const after = snapAfter.snapshot[i];

      expect(after.playerId).toBe(before.playerId);
      expect(after.totalExpectedPoints).toBeCloseTo(before.totalExpectedPoints ?? 0, 6);

      // GW projection keys must be unchanged
      expect(after.gwProjectionKeys).toEqual(before.gwProjectionKeys);

      // GW projection values must be unchanged (exponential unscaling would change these)
      for (const [gw, v] of before.sampleGWValues) {
        const afterPair = after.sampleGWValues.find(([g]: [string, number]) => g === gw);
        expect(afterPair).toBeDefined();
        expect(afterPair[1]).toBeCloseTo(v as number, 6);
      }

      // Component breakdown keys must be unchanged
      expect(after.pointsFromGoalsKeys).toEqual(before.pointsFromGoalsKeys);

      // Component breakdown values must be unchanged
      for (const [gw, v] of before.sampleGoalValues) {
        const afterPair = after.sampleGoalValues.find(([g]: [string, number]) => g === gw);
        expect(afterPair).toBeDefined();
        expect(afterPair[1]).toBeCloseTo(v as number, 6);
      }
      for (const [gw, v] of before.sampleAssistValues) {
        const afterPair = after.sampleAssistValues.find(([g]: [string, number]) => g === gw);
        expect(afterPair).toBeDefined();
        expect(afterPair[1]).toBeCloseTo(v as number, 6);
      }
      for (const [gw, v] of before.sampleCSValues) {
        const afterPair = after.sampleCSValues.find(([g]: [string, number]) => g === gw);
        expect(afterPair).toBeDefined();
        expect(afterPair[1]).toBeCloseTo(v as number, 6);
      }
    }
  }, 60000);
});

// ─────────────────────────────────────────────────────────────────────────────
// STABILITY TESTS: verify that successive HTTP responses are identical.
// Catches any mutation that leaks into the response even if the stored entry
// is protected (belt-and-suspenders coverage).
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache Immutability – player-total-points (response stability)', () => {
  const liveUrl = (start: number, end: number) =>
    `/api/player-total-points?startGameweek=${start}&endGameweek=${end}`;

  it('returns identical totalExpectedPoints for every player on repeated cache hits', async () => {
    const url = liveUrl(nextGameweek, endGameweek);

    const first: any[] = await fetchJSON(url);
    expect(first.length).toBeGreaterThan(0);

    const second: any[] = await fetchJSON(url);
    const third: any[] = await fetchJSON(url);

    const firstById = new Map(first.map((p) => [p.playerId, p]));
    const secondById = new Map(second.map((p) => [p.playerId, p]));
    const thirdById = new Map(third.map((p) => [p.playerId, p]));

    let checked = 0;
    for (const [id, p1] of firstById) {
      const p2 = secondById.get(id);
      const p3 = thirdById.get(id);
      if (!p2 || !p3) continue;

      expect(p2.totalExpectedPoints).toBeCloseTo(p1.totalExpectedPoints, 4);
      expect(p3.totalExpectedPoints).toBeCloseTo(p1.totalExpectedPoints, 4);
      checked++;
    }

    expect(checked).toBeGreaterThan(100);
  }, 60000);

  it('returns identical per-GW projection values for every player on repeated cache hits', async () => {
    const url = liveUrl(nextGameweek, endGameweek);

    const first: any[] = await fetchJSON(url);
    const second: any[] = await fetchJSON(url);

    const secondById = new Map(second.map((p: any) => [p.playerId, p]));

    let checked = 0;
    for (const p1 of first) {
      const p2 = secondById.get(p1.playerId);
      if (!p2) continue;

      const gws = Object.keys(p1.gameweekProjections || {});
      for (const gw of gws) {
        const v1 = p1.gameweekProjections[gw];
        const v2 = p2.gameweekProjections?.[gw];
        expect(v2).toBeCloseTo(v1, 4);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  }, 60000);

  it('component breakdowns do not grow on repeated cache hits (no exponential unscaling)', async () => {
    const url = liveUrl(nextGameweek, endGameweek);

    const compKeys = [
      'pointsFromGoals',
      'pointsFromAssists',
      'pointsFromCleanSheets',
      'pointsFromMinutes',
      'pointsFromBonus',
    ];

    await fetchJSON(url);
    const hit1: any[] = await fetchJSON(url);
    const hit2: any[] = await fetchJSON(url);
    const hit3: any[] = await fetchJSON(url);

    const byId = (arr: any[]) => new Map(arr.map((p) => [p.playerId, p]));
    const h2 = byId(hit2);
    const h3 = byId(hit3);

    let checked = 0;
    for (const p1 of hit1) {
      const p2 = h2.get(p1.playerId);
      const p3 = h3.get(p1.playerId);
      if (!p2 || !p3) continue;

      for (const key of compKeys) {
        const comp1 = p1[key];
        const comp2 = p2[key];
        const comp3 = p3[key];
        if (!comp1 || !comp2 || !comp3) continue;

        for (const gw of Object.keys(comp1)) {
          const v1 = comp1[gw] ?? 0;
          const v2 = comp2[gw] ?? 0;
          const v3 = comp3[gw] ?? 0;

          expect(v2).toBeCloseTo(v1, 4);
          expect(v3).toBeCloseTo(v1, 4);
        }
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  }, 90000);
});

describe('Cache Immutability – cached/player-total-points (response stability)', () => {
  it('returns stable totalExpectedPoints across multiple requests', async () => {
    const url = '/api/cached/player-total-points';

    const first: any[] = await fetchJSON(url);
    expect(first.length).toBeGreaterThan(0);

    const second: any[] = await fetchJSON(url);
    const third: any[] = await fetchJSON(url);

    const secondById = new Map(second.map((p: any) => [p.playerId, p]));
    const thirdById = new Map(third.map((p: any) => [p.playerId, p]));

    let checked = 0;
    for (const p1 of first) {
      const p2 = secondById.get(p1.playerId);
      const p3 = thirdById.get(p1.playerId);
      if (!p2 || !p3) continue;

      expect(p2.totalExpectedPoints).toBeCloseTo(p1.totalExpectedPoints, 4);
      expect(p3.totalExpectedPoints).toBeCloseTo(p1.totalExpectedPoints, 4);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  }, 90000);

  it('component breakdowns stay constant across repeated cached requests', async () => {
    const url = '/api/cached/player-total-points';

    const compKeys = [
      'pointsFromGoals',
      'pointsFromAssists',
      'pointsFromCleanSheets',
    ];

    await fetchJSON(url);
    const hit1: any[] = await fetchJSON(url);
    const hit2: any[] = await fetchJSON(url);
    const hit3: any[] = await fetchJSON(url);

    const h2 = new Map(hit2.map((p: any) => [p.playerId, p]));
    const h3 = new Map(hit3.map((p: any) => [p.playerId, p]));

    let checked = 0;
    for (const p1 of hit1) {
      const p2 = h2.get(p1.playerId);
      const p3 = h3.get(p1.playerId);
      if (!p2 || !p3) continue;

      for (const key of compKeys) {
        const comp1 = p1[key];
        const comp2 = p2[key];
        const comp3 = p3[key];
        if (!comp1 || !comp2 || !comp3) continue;

        for (const gw of Object.keys(comp1)) {
          const v1 = comp1[gw] ?? 0;
          const v2 = comp2[gw] ?? 0;
          const v3 = comp3[gw] ?? 0;
          expect(v2).toBeCloseTo(v1, 4);
          expect(v3).toBeCloseTo(v1, 4);
        }
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  }, 120000);
});
