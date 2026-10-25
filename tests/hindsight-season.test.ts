import { describe, it, expect, beforeAll } from "vitest";
import { buildGameweekHindsight } from "../shared/hindsight";
import { summarizeSeason, type SeasonRow } from "../shared/hindsight-season";

const cap = (id: number, points: number) => ({ id, name: `P${id}`, points });
const row = (over: Partial<SeasonRow> & { gameweek: number }): SeasonRow => ({
  chip: null,
  officialPoints: 60,
  transferCost: 0,
  pointsOnBench: 5,
  bestPossible: 70,
  captainMultiplier: 2,
  captain: { chosen: cap(1, 8), best: cap(1, 8) },
  ...over,
});

describe("summarizeSeason", () => {
  it("returns zeroed totals and no rows for an empty season", () => {
    const s = summarizeSeason([]);
    expect(s.gameweeks).toBe(0);
    expect(s.totals.officialPoints).toBe(0);
    expect(s.totals.efficiencyPct).toBe(0);
    expect(s.biggestGap).toBeNull();
    expect(s.smallestGap).toBeNull();
    expect(s.chips).toEqual([]);
  });

  it("sums scored, best possible, gap, bench points and transfer costs", () => {
    const s = summarizeSeason([
      row({ gameweek: 1, officialPoints: 60, bestPossible: 70, pointsOnBench: 4, transferCost: 0 }),
      row({ gameweek: 2, officialPoints: 50, bestPossible: 80, pointsOnBench: 9, transferCost: 4 }),
    ]);
    expect(s.gameweeks).toBe(2);
    expect(s.totals.officialPoints).toBe(110);
    expect(s.totals.bestPossible).toBe(150);
    expect(s.totals.gap).toBe(40);
    expect(s.totals.pointsOnBench).toBe(13);
    expect(s.totals.transferCost).toBe(4);
    expect(s.totals.efficiencyPct).toBeCloseTo((110 / 150) * 100, 6);
  });

  it("rows carry their own gap and are ordered by gameweek", () => {
    const s = summarizeSeason([row({ gameweek: 3, officialPoints: 40, bestPossible: 55 }), row({ gameweek: 1 })]);
    expect(s.rows.map((r) => r.gameweek)).toEqual([1, 3]);
    expect(s.rows[1].gap).toBe(15);
  });

  it("captain hit when the chosen captain scored as much as the best captain (ties count)", () => {
    const s = summarizeSeason([
      row({ gameweek: 1, captain: { chosen: cap(1, 8), best: cap(1, 8) } }),
      row({ gameweek: 2, captain: { chosen: cap(2, 6), best: cap(3, 6) } }), // different player, same points
      row({ gameweek: 3, captain: { chosen: cap(2, 2), best: cap(3, 12) } }),
    ]);
    expect(s.captaincy.gameweeks).toBe(3);
    expect(s.captaincy.hits).toBe(2);
    expect(s.rows.map((r) => r.captainHit)).toEqual([true, true, false]);
  });

  it("captain cost is the missed points times the extra multiples (x2 -> once, Triple Captain x3 -> twice)", () => {
    const s = summarizeSeason([
      row({ gameweek: 1, captainMultiplier: 2, captain: { chosen: cap(2, 2), best: cap(3, 12) } }),
      row({ gameweek: 2, captainMultiplier: 3, chip: "3xc", captain: { chosen: cap(2, 2), best: cap(3, 12) } }),
    ]);
    expect(s.rows[0].captainCost).toBe(10);
    expect(s.rows[1].captainCost).toBe(20);
    expect(s.captaincy.pointsLost).toBe(30);
  });

  it("a week with no captain on record is left out of the captaincy count", () => {
    const s = summarizeSeason([
      row({ gameweek: 1, captain: { chosen: null, best: cap(3, 12) } }),
      row({ gameweek: 2 }),
    ]);
    expect(s.captaincy.gameweeks).toBe(1);
    expect(s.rows[0].captainHit).toBeNull();
    expect(s.rows[0].captainCost).toBe(0);
  });

  it("finds the biggest and smallest gap weeks (earliest gameweek wins a tie) and lists chips used", () => {
    const s = summarizeSeason([
      row({ gameweek: 1, officialPoints: 60, bestPossible: 70 }),
      row({ gameweek: 2, officialPoints: 50, bestPossible: 80, chip: "bboost" }),
      row({ gameweek: 3, officialPoints: 50, bestPossible: 80 }),
      row({ gameweek: 4, officialPoints: 70, bestPossible: 70, chip: "wildcard" }),
    ]);
    expect(s.biggestGap).toEqual({ gameweek: 2, gap: 30 });
    expect(s.smallestGap).toEqual({ gameweek: 4, gap: 0 });
    expect(s.chips).toEqual([
      { gameweek: 2, chip: "bboost" },
      { gameweek: 4, chip: "wildcard" },
    ]);
  });
});

describe("buildGameweekHindsight", () => {
  // 15-man squad: ids 1-2 GKP, 11-15 DEF, 21-25 MID, 31-33 FWD
  const ids = [1, 2, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 31, 32, 33];
  const typeOf = (id: number) => (id < 11 ? 1 : id < 21 ? 2 : id < 31 ? 3 : 4);
  const pts = new Map<number, number>(ids.map((id, i) => [id, [6, 1, 9, 6, 2, 2, 1, 12, 8, 5, 2, 2, 10, 3, 2][i]]));
  const elements = new Map(ids.map((id) => [id, { element_type: typeOf(id), web_name: `P${id}` }]));
  // picked XI: GKP 1, DEF 11-14, MID 21-23 + 24, FWD 31,32 ; captain 31 (10 pts); bench 2, 15, 25, 33
  const start = [1, 11, 12, 13, 14, 21, 22, 23, 24, 31, 32];
  const picks = ids.map((id) => ({
    element: id,
    position: start.includes(id) ? start.indexOf(id) + 1 : 12 + ids.filter((x) => !start.includes(x)).indexOf(id),
    multiplier: id === 31 ? 2 : start.includes(id) ? 1 : 0,
    is_captain: id === 31,
  }));
  const base = { picks, pointsById: pts, elements, activeChip: null, entryHistory: { points: 70, event_transfers_cost: 4, points_on_bench: 11 } };

  it("reports the official numbers as given and the best possible from the same 15", () => {
    const out = buildGameweekHindsight(base);
    expect(out.officialPoints).toBe(70);
    expect(out.transferCost).toBe(4);
    expect(out.pointsOnBench).toBe(11);
    expect(out.gap).toBe(out.bestPossible - 70);
    expect(out.picks).toHaveLength(15);
    expect(out.bestXI).toHaveLength(11);
    expect(out.chip).toBeNull();
  });

  it("marks the chosen captain, the best captain and which picks are in the best XI", () => {
    const out = buildGameweekHindsight(base);
    expect(out.captain.chosen).toEqual({ id: 31, name: "P31", position: "FWD", points: 10 });
    expect(out.captain.best?.id).toBe(21); // 12 pts is the top score
    const bestIds = new Set(out.bestXI.map((p) => p.id));
    for (const p of out.picks) expect(p.inBestXI).toBe(bestIds.has(p.id));
    expect(out.picks.filter((p) => p.started)).toHaveLength(11);
  });

  it("Bench Boost counts all 15 and Triple Captain counts the captain three times", () => {
    expect(buildGameweekHindsight({ ...base, activeChip: "bboost" }).formation).toBeNull();
    const normal = buildGameweekHindsight(base);
    const tc = buildGameweekHindsight({ ...base, activeChip: "3xc" });
    expect(tc.captainMultiplier).toBe(3);
    expect(tc.bestPossible).toBe(normal.bestPossible + 12);
  });

  it("a player missing from the points feed scores 0 and a missing history gives 0 official points", () => {
    const out = buildGameweekHindsight({ ...base, pointsById: new Map(), entryHistory: undefined });
    expect(out.officialPoints).toBe(0);
    expect(out.picks.every((p) => p.points === 0)).toBe(true);
  });
});

const BASE_URL = process.env.TEST_BASE_URL ?? `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/hindsight/:managerId/season (against real finished gameweeks)", () => {
  let managerId: number;
  let finished: number[];

  beforeAll(async () => {
    const top = (await getJson("/api/top-managers/teams")).body;
    managerId = top.teams.find((t: any) => t.success).managerId;
    const boot = (await getJson("/api/bootstrap-static")).body;
    finished = boot.events.filter((e: any) => e.finished).map((e: any) => e.id);
  }, 180000);

  it("has one row per finished gameweek, and totals equal the sum of the rows", async () => {
    const { status, body } = await getJson(`/api/hindsight/${managerId}/season`);
    expect(status).toBe(200);
    expect(body.managerId).toBe(managerId);
    expect(body.gameweeks).toBe(body.rows.length);
    expect(body.rows.length).toBeGreaterThan(0);
    for (const r of body.rows) expect(finished).toContain(r.gameweek);
    const sum = (k: string) => body.rows.reduce((a: number, r: any) => a + r[k], 0);
    expect(body.totals.officialPoints).toBe(sum("officialPoints"));
    expect(body.totals.bestPossible).toBe(sum("bestPossible"));
    expect(body.totals.gap).toBe(body.totals.bestPossible - body.totals.officialPoints);
    expect(body.totals.pointsOnBench).toBe(sum("pointsOnBench"));
    expect(body.totals.transferCost).toBe(sum("transferCost"));
  }, 120000);

  it("every season row equals the single-gameweek endpoint for that gameweek", async () => {
    const season = (await getJson(`/api/hindsight/${managerId}/season`)).body;
    const sample = [season.rows[0], season.rows[season.rows.length - 1]];
    for (const r of sample) {
      const single = (await getJson(`/api/hindsight/${managerId}?gw=${r.gameweek}`)).body;
      expect(r.officialPoints).toBe(single.officialPoints);
      expect(r.bestPossible).toBe(single.bestPossible);
      expect(r.pointsOnBench).toBe(single.pointsOnBench);
      expect(r.transferCost).toBe(single.transferCost);
      expect(r.chip).toBe(single.chip);
      expect(r.captain.chosen?.id ?? null).toBe(single.captain.chosen?.id ?? null);
    }
  }, 120000);

  it("rejects a non-numeric id with 400 and an unknown manager with 404", async () => {
    expect((await getJson(`/api/hindsight/abc/season`)).status).toBe(400);
    expect((await getJson(`/api/hindsight/999999999/season`)).status).toBe(404);
  }, 60000);
});
