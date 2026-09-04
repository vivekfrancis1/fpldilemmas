import { describe, it, expect } from "vitest";
import { buildWildcardSquad, type SquadCandidate } from "../server/wildcard-squad-builder";

function makePool(): SquadCandidate[] {
  const pool: SquadCandidate[] = [];
  let id = 1;
  // 8 teams (real FPL has 20, so 3-per-team is never a binding global constraint —
  // 8 is enough headroom to exercise the cap without making the 15-slot squad
  // itself infeasible, the way a too-small team count would).
  for (let team = 1; team <= 8; team++) {
    for (let i = 0; i < 4; i++) {
      pool.push({ id: id++, webName: `GK${team}-${i}`, team, elementType: 1, price: 40 + i * 5, projectedPoints: 10 + i * 3 });
    }
    for (let i = 0; i < 6; i++) {
      pool.push({ id: id++, webName: `DEF${team}-${i}`, team, elementType: 2, price: 40 + i * 5, projectedPoints: 15 + i * 4 });
    }
    for (let i = 0; i < 6; i++) {
      pool.push({ id: id++, webName: `MID${team}-${i}`, team, elementType: 3, price: 45 + i * 6, projectedPoints: 18 + i * 5 });
    }
    for (let i = 0; i < 4; i++) {
      pool.push({ id: id++, webName: `FWD${team}-${i}`, team, elementType: 4, price: 45 + i * 7, projectedPoints: 16 + i * 6 });
    }
  }
  return pool;
}

describe("buildWildcardSquad", () => {
  it("returns a full 15-man squad with correct position quotas", () => {
    const result = buildWildcardSquad(makePool(), 1000);
    expect(result).not.toBeNull();
    expect(result!.squad).toHaveLength(15);
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<1 | 2 | 3 | 4, number>;
    for (const p of result!.squad) counts[p.elementType]++;
    expect(counts[1]).toBe(2);
    expect(counts[2]).toBe(5);
    expect(counts[3]).toBe(5);
    expect(counts[4]).toBe(3);
  });

  it("never exceeds the given budget", () => {
    const budget = 700;
    const result = buildWildcardSquad(makePool(), budget);
    expect(result).not.toBeNull();
    expect(result!.totalCost).toBeLessThanOrEqual(budget);
  });

  it("never picks more than 3 players from the same real team", () => {
    const result = buildWildcardSquad(makePool(), 1000);
    expect(result).not.toBeNull();
    const teamCounts = new Map<number, number>();
    for (const p of result!.squad) teamCounts.set(p.team, (teamCounts.get(p.team) || 0) + 1);
    for (const count of teamCounts.values()) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it("spends a generous budget on higher-projected players than a bare-minimum budget", () => {
    const pool = makePool();
    const tight = buildWildcardSquad(pool, 650);
    const generous = buildWildcardSquad(pool, 1000);
    expect(tight).not.toBeNull();
    expect(generous).not.toBeNull();
    expect(generous!.totalProjectedPoints).toBeGreaterThan(tight!.totalProjectedPoints);
  });

  it("returns null when even the cheapest valid squad exceeds budget", () => {
    const result = buildWildcardSquad(makePool(), 1);
    expect(result).toBeNull();
  });

  it("ignores duplicate ids and picks only distinct players", () => {
    const result = buildWildcardSquad(makePool(), 1000);
    const ids = new Set(result!.squad.map((p) => p.id));
    expect(ids.size).toBe(15);
  });
});
