import { describe, it, expect, beforeAll } from "vitest";
import {
  horizonProjection,
  rankAmongField,
  findUpgrades,
  squadFlags,
  type RmtPlayer,
} from "../shared/rate-my-team";

// ---- synthetic world ----
const mk = (id: number, elementType: 1 | 2 | 3 | 4, team: number, price: number, status = "a"): RmtPlayer => ({
  id, elementType, team, price, status, chanceOfPlayingNextRound: status === "a" ? 100 : 50, news: "", name: `P${id}`,
});
// squad: 2 GKP, 5 DEF, 5 MID, 3 FWD across clubs 1..8 (never more than 2 per club)
const squadPlayers: RmtPlayer[] = [
  mk(1, 1, 1, 50), mk(2, 1, 2, 45),
  mk(11, 2, 3, 55), mk(12, 2, 4, 50), mk(13, 2, 5, 45), mk(14, 2, 6, 45), mk(15, 2, 7, 40),
  mk(21, 3, 1, 100), mk(22, 3, 2, 80), mk(23, 3, 3, 65), mk(24, 3, 4, 55), mk(25, 3, 5, 50),
  mk(31, 4, 8, 90), mk(32, 4, 6, 75), mk(33, 4, 7, 50),
];
const gws = [8, 9];
// xPts per gameweek for everyone (default 2), a few stars
const xp = (id: number, a: number, b: number) => [id, { "8": a, "9": b }] as const;
const xPtsMap = new Map<number, Record<string, number>>([
  ...squadPlayers.map((p) => [p.id, { "8": 2, "9": 2 }] as const),
  xp(21, 7, 7), xp(31, 6, 6), xp(11, 4, 4), xp(2, 3, 3),
]);

describe("horizonProjection", () => {
  it("total equals the sum of the per-gameweek best-XI totals", () => {
    const out = horizonProjection(squadPlayers, xPtsMap, gws);
    expect(out.perGameweek).toHaveLength(2);
    expect(out.total).toBeCloseTo(out.perGameweek.reduce((a, g) => a + g.total, 0), 10);
    expect(out.perGameweek.map((g) => g.gameweek)).toEqual([8, 9]);
  });

  it("a shorter horizon only includes the requested gameweeks", () => {
    const one = horizonProjection(squadPlayers, xPtsMap, [8]);
    const two = horizonProjection(squadPlayers, xPtsMap, [8, 9]);
    expect(one.total).toBeCloseTo(two.perGameweek[0].total, 10);
  });

  it("includes the captain's double points and the bench total per gameweek", () => {
    const g8 = horizonProjection(squadPlayers, xPtsMap, [8]).perGameweek[0];
    expect(g8.captainId).toBe(21);
    expect(g8.benchTotal).toBeGreaterThanOrEqual(0);
  });

  it("a player missing from the projections counts as no points, not a crash", () => {
    const out = horizonProjection(squadPlayers, new Map(), gws);
    expect(out.total).toBe(0);
  });
});

describe("rankAmongField", () => {
  it("ranks the user by how many squads in the field score strictly higher", () => {
    const r = rankAmongField(50, [60, 55, 50, 40, 30]);
    expect(r.rank).toBe(3); // two above; the equal one does not outrank
    expect(r.fieldSize).toBe(5);
    expect(r.average).toBe(47);
    expect(r.best).toBe(60);
  });

  it("top of the field is rank 1; bottom is fieldSize + 1", () => {
    expect(rankAmongField(100, [60, 55]).rank).toBe(1);
    expect(rankAmongField(1, [60, 55]).rank).toBe(3);
  });

  it("handles an empty field honestly", () => {
    const r = rankAmongField(50, []);
    expect(r.fieldSize).toBe(0);
    expect(r.rank).toBeNull();
    expect(r.average).toBeNull();
    expect(r.best).toBeNull();
  });
});

describe("findUpgrades", () => {
  // candidate pool: some same-position better players at different prices and clubs
  const pool: RmtPlayer[] = [
    ...squadPlayers,
    mk(101, 3, 2, 105), // MID replacing 21? costs 10.5
    mk(102, 3, 9, 60), // cheap MID
    mk(103, 4, 9, 95), // FWD
    mk(104, 3, 1, 60, "i"), // injured MID: must be excluded
    mk(105, 2, 10, 50), // DEF
  ];
  const pts = new Map(xPtsMap);
  pts.set(101, { "8": 9, "9": 9 });
  pts.set(102, { "8": 6, "9": 6 });
  pts.set(103, { "8": 8, "9": 8 });
  pts.set(104, { "8": 20, "9": 20 });
  pts.set(105, { "8": 5, "9": 5 });

  const run = (over: any = {}) =>
    findUpgrades({ squad: squadPlayers, pool, xPtsByPlayer: pts, gameweeks: gws, bank: 0, ...over });

  it("only suggests same-position players the manager doesn't already own, who are not injured/suspended/unavailable", () => {
    for (const u of run()) {
      const out = squadPlayers.find((p) => p.id === u.outId)!;
      const inn = pool.find((p) => p.id === u.inId)!;
      expect(inn.elementType).toBe(out.elementType);
      expect(squadPlayers.some((p) => p.id === u.inId)).toBe(false);
      expect(["i", "s", "u", "n"]).not.toContain(inn.status);
    }
    expect(run().some((u) => u.inId === 104)).toBe(false);
  });

  it("respects the budget: in-price <= out selling price + bank", () => {
    for (const u of run({ bank: 0 })) {
      const out = squadPlayers.find((p) => p.id === u.outId)!;
      const inn = pool.find((p) => p.id === u.inId)!;
      expect(inn.price).toBeLessThanOrEqual(out.price + 0);
    }
    // 101 costs 105 and 21 sells for 100: unaffordable at bank 0, affordable at bank 5
    expect(run({ bank: 0 }).some((u) => u.inId === 101)).toBe(false);
    expect(run({ bank: 5 }).some((u) => u.inId === 101)).toBe(true);
  });

  it("uses the supplied selling prices instead of the current price when given", () => {
    const sell = new Map<number, number>([[21, 110]]); // manager would receive 11.0 for player 21
    expect(run({ bank: 0, sellingPrices: sell }).some((u) => u.outId === 21 && u.inId === 101)).toBe(true);
  });

  it("never breaks the 3-per-club rule given the rest of the squad", () => {
    // club 1 already has players 1 and 21; add a third club-1 player so swapping in another club-1 player must be rejected
    const crowded = [...squadPlayers.filter((p) => p.id !== 25), mk(26, 3, 1, 50)]; // club 1 now: 1, 21, 26
    const extra = mk(106, 4, 1, 60); // FWD at club 1
    const p = new Map(pts);
    p.set(106, { "8": 12, "9": 12 });
    p.set(26, { "8": 2, "9": 2 });
    const ups = findUpgrades({ squad: crowded, pool: [...crowded, extra], xPtsByPlayer: p, gameweeks: gws, bank: 100 });
    // swapping a non-club-1 forward for 106 would make 4 club-1 players: not allowed
    expect(ups.some((u) => u.inId === 106 && crowded.find((q) => q.id === u.outId)!.team !== 1)).toBe(false);
  });

  it("gain equals the recomputed horizon total minus the current total (a bench swap shows its real, smaller gain)", () => {
    const base = horizonProjection(squadPlayers, xPtsMap, gws).total;
    for (const u of run({ bank: 100 })) {
      const next = squadPlayers.map((p) => (p.id === u.outId ? pool.find((q) => q.id === u.inId)! : p));
      expect(u.gain).toBeCloseTo(horizonProjection(next, pts, gws).total - base, 9);
      expect(u.gain).toBeGreaterThan(0);
    }
  });

  it("returns at most one (best) replacement per player and at most topN rows, best gain first", () => {
    const ups = run({ bank: 100, topN: 3 });
    expect(ups.length).toBeLessThanOrEqual(3);
    const outs = ups.map((u) => u.outId);
    expect(new Set(outs).size).toBe(outs.length);
    for (let i = 1; i < ups.length; i++) expect(ups[i - 1].gain).toBeGreaterThanOrEqual(ups[i].gain);
  });
});

describe("squadFlags", () => {
  const fixtures = [
    { event: 8, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3, finished: false },
    { event: 8, team_h: 3, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 3, finished: false }, // team 1 double in 8
    { event: 9, team_h: 4, team_a: 5, team_h_difficulty: 3, team_a_difficulty: 3, finished: false }, // team 1 blank in 9
  ];
  const squad = [mk(1, 1, 1, 50), mk(2, 1, 2, 45, "d"), mk(3, 2, 4, 50, "i")];

  it("lists injured/doubtful players with FPL's own status and chance, nothing invented", () => {
    const f = squadFlags({ squad, fixtures, gameweeks: [8, 9] });
    expect(f.availability.map((a) => a.playerId).sort()).toEqual([2, 3]);
    expect(f.availability.find((a) => a.playerId === 3)!.status).toBe("i");
  });

  it("lists blank and double gameweeks per player from the official fixtures", () => {
    const f = squadFlags({ squad, fixtures, gameweeks: [8, 9] });
    expect(f.doubles.find((d) => d.playerId === 1)!.gameweeks).toEqual([8]);
    expect(f.blanks.find((b) => b.playerId === 1)!.gameweeks).toEqual([9]);
    expect(f.blanks.find((b) => b.playerId === 3)!.gameweeks).toEqual([8]); // player 3's club (4) only plays in GW9
    expect(f.doubles.some((d) => d.playerId === 3)).toBe(false);
  });
});

describe("squadFlags with unscheduled fixtures", () => {
  it("a player whose club has an unscheduled fixture and none in the gameweek is TBC, not blank", () => {
    const fixtures = [
      { event: 8, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3, finished: false },
      { event: null, team_h: 4, team_a: 5, team_h_difficulty: 3, team_a_difficulty: 3, finished: false },
    ];
    const squad = [mk(3, 2, 4, 50), mk(7, 3, 9, 50)]; // club 4 has a TBC fixture; club 9 has nothing at all
    const f = squadFlags({ squad, fixtures, gameweeks: [8] });
    expect(f.blanks.map((b) => b.playerId)).toEqual([7]);
    expect(f.tbc.map((b) => b.playerId)).toEqual([3]);
    expect(f.tbc[0].gameweeks).toEqual([8]);
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/rate-my-team/:managerId (consistency with the data it is built from)", () => {
  let cached: any[];
  let top: any;
  let rmt: any;
  const MANAGER = 9267; // a Top 100 manager id, so a real squad exists

  beforeAll(async () => {
    cached = (await getJson("/api/cached/player-total-points")).body;
    top = (await getJson("/api/top-managers/teams")).body;
    rmt = (await getJson(`/api/rate-my-team/${MANAGER}?horizon=5`)).body;
  }, 180000);

  it("uses the first 5 projected gameweeks and a per-gameweek total that sums to the headline", () => {
    expect(rmt.gameweeks).toHaveLength(5);
    const sum = rmt.perGameweek.reduce((a: number, g: any) => a + g.total, 0);
    expect(rmt.projectedTotal).toBeCloseTo(sum, 6);
  });

  it("every upgrade's xPts values equal the cached projection endpoint", () => {
    const byId = new Map(cached.map((p) => [p.playerId, p]));
    for (const u of rmt.upgrades) {
      const sum = (id: number) =>
        rmt.gameweeks.reduce((a: number, gw: number) => a + (byId.get(id)?.gameweekProjections?.[String(gw)] ?? 0), 0);
      expect(u.inHorizonXPts).toBeCloseTo(sum(u.inId), 6);
      expect(u.outHorizonXPts).toBeCloseTo(sum(u.outId), 6);
    }
  });

  it("the Top 100 comparison counts the same squads as /api/top-managers/teams", () => {
    const completeTeams = top.teams.filter((t: any) => t.success && t.teamData?.picks?.length === 15);
    // MANAGER is itself a Top 100 manager, and a manager is not compared with their own squad
    const complete = completeTeams.filter((t: any) => t.managerId !== MANAGER).length;
    expect(completeTeams.some((t: any) => t.managerId === MANAGER)).toBe(true);
    expect(rmt.rank.fieldSize).toBe(complete);
    expect(rmt.rank.rank).toBeGreaterThanOrEqual(1);
    expect(rmt.rank.rank).toBeLessThanOrEqual(complete + 1);
  });

  it("rejects a non-numeric id with 400 and an unknown manager with 404", async () => {
    expect((await getJson("/api/rate-my-team/abc")).status).toBe(400);
    expect((await getJson("/api/rate-my-team/999999999")).status).toBe(404);
  });

  it("rejects a bad horizon with 400", async () => {
    for (const bad of ["0", "-1", "abc", "2.5", "99"]) {
      expect((await getJson(`/api/rate-my-team/${MANAGER}?horizon=${bad}`)).status).toBe(400);
    }
  });
});
