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
