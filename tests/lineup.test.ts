import { describe, it, expect } from "vitest";
import { bestLineup, type LineupPlayer } from "../shared/lineup";

const P = (id: number, elementType: 1 | 2 | 3 | 4, xPts: number | null): LineupPlayer => ({ id, elementType, xPts });

// 2 GKP, 5 DEF, 5 MID, 3 FWD
const squad = (xs: { g: number[]; d: number[]; m: number[]; f: number[] }): LineupPlayer[] => [
  ...xs.g.map((x, i) => P(1 + i, 1, x)),
  ...xs.d.map((x, i) => P(11 + i, 2, x)),
  ...xs.m.map((x, i) => P(21 + i, 3, x)),
  ...xs.f.map((x, i) => P(31 + i, 4, x)),
];

describe("bestLineup", () => {
  it("picks the highest-scoring legal XI and adds the captain's points a second time", () => {
    const s = squad({ g: [4, 1], d: [5, 4, 3, 2, 1], m: [8, 7, 6, 2, 1], f: [9, 3, 1] });
    const out = bestLineup(s);
    // best: GKP 4 + DEF 5,4,3 + MID 8,7,6 + FWD 9,3 + the best remaining slot (DEF 2 vs MID 2 vs FWD 1)
    expect(out.starting).toHaveLength(11);
    expect(out.starting.filter((p) => p.elementType === 1)).toHaveLength(1);
    expect(out.captainId).toBe(31); // 9 xPts
    const sum = out.starting.reduce((a, p) => a + (p.xPts ?? 0), 0);
    expect(out.total).toBeCloseTo(sum + 9, 10);
  });

  it("never breaks formation rules: 1 GKP, 3-5 DEF, 2-5 MID, 1-3 FWD", () => {
    // four forwards would be tempting, but only 3 can start; only 1 GKP may start
    const s = squad({ g: [9, 9], d: [1, 1, 1, 1, 1], m: [1, 1, 1, 1, 1], f: [9, 9, 9] });
    const out = bestLineup(s);
    const n = (t: number) => out.starting.filter((p) => p.elementType === t).length;
    expect(n(1)).toBe(1);
    expect(n(2)).toBeGreaterThanOrEqual(3);
    expect(n(2)).toBeLessThanOrEqual(5);
    expect(n(3)).toBeGreaterThanOrEqual(2);
    expect(n(3)).toBeLessThanOrEqual(5);
    expect(n(4)).toBeGreaterThanOrEqual(1);
    expect(n(4)).toBeLessThanOrEqual(3);
    expect(n(2) + n(3) + n(4)).toBe(10);
  });

  it("the reserve goalkeeper and the rest go to the bench; bench total is reported", () => {
    const s = squad({ g: [4, 1], d: [5, 4, 3, 2, 1], m: [8, 7, 6, 2, 1], f: [9, 3, 1] });
    const out = bestLineup(s);
    expect(out.bench).toHaveLength(4);
    expect(out.starting.length + out.bench.length).toBe(15);
    const benchSum = out.bench.reduce((a, p) => a + (p.xPts ?? 0), 0);
    expect(out.benchTotal).toBeCloseTo(benchSum, 10);
    expect(out.bench[0].elementType).toBe(1); // reserve keeper first
  });

  it("a player with no projection (blank gameweek) never starts ahead of a player projected 0 who can fill the same slot", () => {
    const s = squad({ g: [4, 0], d: [5, 4, 3, 0, 0], m: [8, 7, 6, 0, 0], f: [9, 0, 0] });
    s[s.findIndex((p) => p.id === 14)] = P(14, 2, null); // blank-gameweek defender
    const out = bestLineup(s);
    const started = new Set(out.starting.map((p) => p.id));
    expect(started.has(14) && !started.has(15)).toBe(false);
  });

  it("the captain is the highest xPts player in the XI, ties broken by lower id", () => {
    const s = squad({ g: [1, 1], d: [1, 1, 1, 1, 1], m: [6, 6, 1, 1, 1], f: [5, 1, 1] });
    expect(bestLineup(s).captainId).toBe(21);
  });

  it("returns a repeatable result regardless of input order", () => {
    const s = squad({ g: [4, 1], d: [5, 4, 3, 2, 1], m: [8, 7, 6, 2, 1], f: [9, 3, 1] });
    const a = bestLineup(s);
    const b = bestLineup([...s].reverse());
    expect(b.starting.map((p) => p.id).sort((x, y) => x - y)).toEqual(a.starting.map((p) => p.id).sort((x, y) => x - y));
    expect(b.total).toBeCloseTo(a.total, 10);
  });

  it("with fewer than 11 players it does not crash and reports an incomplete lineup", () => {
    const out = bestLineup([P(1, 1, 3), P(11, 2, 4), P(21, 3, 5)]);
    expect(out.complete).toBe(false);
    expect(out.total).toBe(0);
  });

  it("matches the formation search My Dashboard has always used (reference implementation, random squads)", () => {
    // Reference: the inline algorithm from server/routes.ts (my-dashboard projection), kept verbatim as the oracle.
    const reference = (players: LineupPlayer[]) => {
      const proj = (p: LineupPlayer) => p.xPts ?? 0;
      const g = players.filter((p) => p.elementType === 1).sort((a, b) => proj(b) - proj(a));
      const d = players.filter((p) => p.elementType === 2).sort((a, b) => proj(b) - proj(a));
      const m = players.filter((p) => p.elementType === 3).sort((a, b) => proj(b) - proj(a));
      const f = players.filter((p) => p.elementType === 4).sort((a, b) => proj(b) - proj(a));
      let best: LineupPlayer[] = [];
      let bestTotal = -1;
      for (let nd = 3; nd <= 5; nd++)
        for (let nm = 2; nm <= 5; nm++)
          for (let nf = 1; nf <= 3; nf++) {
            if (nd + nm + nf !== 10) continue;
            if (nd > d.length || nm > m.length || nf > f.length || !g.length) continue;
            const cand = [g[0], ...d.slice(0, nd), ...m.slice(0, nm), ...f.slice(0, nf)];
            const t = cand.reduce((s, p) => s + proj(p), 0);
            if (t > bestTotal) { bestTotal = t; best = cand; }
          }
      const cap = Math.max(...best.map(proj));
      return bestTotal + cap;
    };
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (let i = 0; i < 200; i++) {
      const r = () => Math.round(rnd() * 120) / 10;
      const s = squad({ g: [r(), r()], d: [r(), r(), r(), r(), r()], m: [r(), r(), r(), r(), r()], f: [r(), r(), r()] });
      expect(bestLineup(s).total).toBeCloseTo(reference(s), 9);
    }
  });
});
