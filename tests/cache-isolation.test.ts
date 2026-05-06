import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5000';
const get = (path: string) =>
  fetch(`${BASE}${path}`).then(r => {
    if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
    return r.json();
  });

let startGW: number;
let rangeKey: string;
let singleGwKey: string;

beforeAll(async () => {
  const bootstrap = await get('/api/bootstrap-static');
  const currentGW: number = bootstrap.events.find((e: any) => e.is_current)?.id ?? 1;
  startGW = Math.min(currentGW + 1, 38);
  const endGW = Math.min(startGW + 11, 38);
  rangeKey = `${startGW}-${endGW}`;
  singleGwKey = `${startGW}-${startGW}`;
}, 30_000);

describe('Cache entry isolation: stored entry unchanged after cache-hit requests', () => {
  /**
   * Range-key guard (routes.ts ~line 597):
   * Warm the cache, snapshot the stored entry, serve three sequential cache-hit
   * requests (each applies the read-side structuredClone guard at ~line 18164
   * before availability adjustments), then snapshot again. Without the guard
   * the adjustment pass mutates stored nested objects in-place and the two
   * snapshots diverge.
   */
  it('range key: stored entry is unchanged after serving cache-hit requests', async () => {
    // Warm: guarantees rangeKey is populated before the before-snapshot
    await get('/api/cached/player-total-points');

    const before = await get(`/api/admin/cache-snapshot?key=${rangeKey}`);
    expect(before.playerCount).toBeGreaterThan(0);

    await get('/api/cached/player-total-points');
    await get('/api/cached/player-total-points');
    await get('/api/cached/player-total-points');

    const after = await get(`/api/admin/cache-snapshot?key=${rangeKey}`);
    expect(after.playerCount).toBe(before.playerCount);

    for (let i = 0; i < before.snapshot.length; i++) {
      const b = before.snapshot[i];
      const a = after.snapshot[i];
      expect(a.playerId).toBe(b.playerId);
      for (const [gw, val] of b.sampleGWValues as [string, number][]) {
        const aEntry = (a.sampleGWValues as [string, number][]).find(([g]) => g === gw);
        expect(aEntry).toBeDefined();
        expect(Math.abs((aEntry![1] as number) - (val as number))).toBeLessThan(0.001);
      }
    }
  }, 60_000);

  /**
   * Per-GW key guard (routes.ts ~line 634):
   * Same snapshot-before/after pattern for the singleGwKey populated lazily on
   * first hit to /api/player-total-points. Confirms the per-GW entry cannot be
   * corrupted independently of the range entry.
   */
  it('per-GW key: stored entry is unchanged after serving cache-hit requests', async () => {
    const gwUrl = `/api/player-total-points?startGameweek=${startGW}&endGameweek=${startGW}`;

    // Warm: ensures singleGwKey is populated before the before-snapshot
    await get(gwUrl);

    const before = await get(`/api/admin/cache-snapshot?key=${singleGwKey}`);
    expect(before.playerCount).toBeGreaterThan(0);

    await get(gwUrl);
    await get(gwUrl);
    await get(gwUrl);

    const after = await get(`/api/admin/cache-snapshot?key=${singleGwKey}`);
    expect(after.playerCount).toBe(before.playerCount);

    for (let i = 0; i < before.snapshot.length; i++) {
      const b = before.snapshot[i];
      const a = after.snapshot[i];
      expect(a.playerId).toBe(b.playerId);
      for (const [gw, val] of b.sampleGWValues as [string, number][]) {
        const aEntry = (a.sampleGWValues as [string, number][]).find(([g]) => g === gw);
        expect(aEntry).toBeDefined();
        expect(Math.abs((aEntry![1] as number) - (val as number))).toBeLessThan(0.001);
      }
    }
  }, 60_000);
});

describe('Component breakdown stability: per-component values identical across repeated responses', () => {
  /**
   * Closes the gap left by the cache-entry isolation tests above.
   *
   * Those tests confirm the *stored* cache entry is not mutated, but they never
   * inspect the per-component values that appear in each *response*.  This test
   * makes three strictly sequential cache-hit requests and asserts that every
   * component breakdown field is numerically identical across all three for every
   * availability-adjusted player.
   *
   * Sequential (not concurrent) requests are required: an exponential-unscaling
   * bug — where each cache hit multiplies the stored value by 1/prob again —
   * compounds across request #2 and #3, so the divergence is only detectable
   * when request N+1 can observe the state written by request N.
   */

  const COMPONENT_KEYS = [
    'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
    'pointsFromMinutes', 'pointsFromBonus', 'pointsFromSaves',
    'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards',
    'pointsFromDefensiveContributions',
  ] as const;

  it('component values are identical across three sequential cache-hit requests for availability-adjusted players', async () => {
    const gwUrl = `/api/player-total-points?startGameweek=${startGW}&endGameweek=${startGW}`;

    // Warm the cache so all three requests below are cache-hits and exercise the
    // unscaling / structuredClone path in routes.ts ~line 18164.
    await get(gwUrl);

    // Strictly sequential: each request sees the cache entry as left by the previous one.
    const r1 = await get(gwUrl);
    const r2 = await get(gwUrl);
    const r3 = await get(gwUrl);

    expect(Array.isArray(r1)).toBe(true);
    expect((r1 as any[]).length).toBeGreaterThan(0);
    expect((r2 as any[]).length).toBe((r1 as any[]).length);
    expect((r3 as any[]).length).toBe((r1 as any[]).length);

    // Hard assertion: at least one availability-adjusted player must be present so
    // the unscaling path (routes.ts ~line 18180) is actually exercised.
    // If this fails the season is likely complete and all players are fully fit;
    // the test should be run during an active gameweek period.
    const adjustedPlayers = (r1 as any[]).filter(
      (p: any) => p.availabilityAdjustments && Object.keys(p.availabilityAdjustments).length > 0
    );
    expect(adjustedPlayers.length).toBeGreaterThan(0);

    const byId2 = new Map<number, any>((r2 as any[]).map((p: any) => [p.playerId, p]));
    const byId3 = new Map<number, any>((r3 as any[]).map((p: any) => [p.playerId, p]));

    for (const p1 of adjustedPlayers) {
      const p2 = byId2.get(p1.playerId);
      const p3 = byId3.get(p1.playerId);
      expect(p2).toBeDefined();
      expect(p3).toBeDefined();

      for (const key of COMPONENT_KEYS) {
        const comp1 = p1[key] as Record<string, number> | undefined;
        if (!comp1) continue;
        for (const gwKey of Object.keys(comp1)) {
          const v1 = comp1[gwKey] ?? 0;
          const v2 = (p2[key]?.[gwKey]) ?? 0;
          const v3 = (p3[key]?.[gwKey]) ?? 0;
          expect(Math.abs(v2 - v1), `playerId=${p1.playerId} ${key}[${gwKey}]: r2=${v2} r1=${v1}`).toBeLessThan(0.001);
          expect(Math.abs(v3 - v1), `playerId=${p1.playerId} ${key}[${gwKey}]: r3=${v3} r1=${v1}`).toBeLessThan(0.001);
        }
      }
    }
  }, 90_000);
});
