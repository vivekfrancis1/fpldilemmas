import { describe, it, expect, beforeAll } from "vitest";
import { buildLeagueOwnership } from "../shared/league-ownership";

// 8 clubs, players spread by id so the 3-per-club rule never binds in the template team
const teams = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Club ${i + 1}`, short_name: `C${i + 1}` }));
const el = (id: number, type: number) => ({ id, web_name: `P${id}`, team: (id % 8) + 1, element_type: type, now_cost: 50 });
const elements = [
  el(1, 1), el(2, 1), el(11, 2), el(12, 2), el(13, 2), el(14, 2), el(15, 2),
  el(21, 3), el(22, 3), el(23, 3), el(24, 3), el(25, 3),
  el(31, 4), el(32, 4), el(33, 4),
  el(99, 4), el(98, 3), // extras only some managers own
];
const pick = (element: number, captain = false) => ({ element, is_captain: captain });
const squad = (ids: number[], cap: number) => ids.map((i) => pick(i, i === cap));
const base15 = [1, 2, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 31, 32, 33];

// 4 managers. m1..m3 hold base15 (m1 also captain 31); m4 swaps 33 -> 99 and 25 -> 98 and captains 21.
const managers = [
  { managerId: 1, picks: squad(base15, 31) },
  { managerId: 2, picks: squad(base15, 31) },
  { managerId: 3, picks: squad(base15, 22) },
  { managerId: 4, picks: squad(base15.map((i) => (i === 33 ? 99 : i === 25 ? 98 : i)), 21) },
];
const run = (over: any = {}) => buildLeagueOwnership({ managers, elements, teams, ...over });

describe("buildLeagueOwnership", () => {
  it("counts how many managers hold each player (bench included) and the percentage of managers counted", () => {
    const out = run();
    expect(out.managersCounted).toBe(4);
    const p31 = out.ownership.find((p) => p.playerId === 31)!;
    expect(p31.ownedBy).toBe(4);
    expect(p31.percent).toBe(100);
    const p33 = out.ownership.find((p) => p.playerId === 33)!;
    expect(p33.ownedBy).toBe(3);
    expect(p33.percent).toBe(75);
    const p99 = out.ownership.find((p) => p.playerId === 99)!;
    expect(p99.ownedBy).toBe(1);
    expect(p99.percent).toBe(25);
  });

  it("orders by ownership then player id, and honours topN", () => {
    const out = run({ topN: 5 });
    expect(out.ownership).toHaveLength(5);
    for (let i = 1; i < out.ownership.length; i++) {
      const a = out.ownership[i - 1];
      const b = out.ownership[i];
      expect(a.ownedBy > b.ownedBy || (a.ownedBy === b.ownedBy && a.playerId < b.playerId)).toBe(true);
    }
  });

  it("counts captains", () => {
    const out = run();
    expect(out.captains[0]).toMatchObject({ playerId: 31, count: 2, percent: 50 });
    expect(out.captains.map((c) => c.playerId).sort((a, b) => a - b)).toEqual([21, 22, 31]);
  });

  it("managers without exactly 15 picks are left out of the denominator and reported", () => {
    const out = run({ managers: [...managers, { managerId: 5, picks: [pick(1)] }, { managerId: 6, picks: null }] });
    expect(out.managersRequested).toBe(6);
    expect(out.managersCounted).toBe(4);
    expect(out.ownership.find((p) => p.playerId === 31)!.percent).toBe(100);
  });

  it("builds the league's template team from the same squads", () => {
    const out = run();
    expect(out.template.managersCounted).toBe(4);
    expect(out.template.startingXI).toHaveLength(11);
  });

  describe("you mode", () => {
    it("differentials are your players held by fewer than 25% of the league (boundary exclusive)", () => {
      const out = run({ you: { managerId: 4, picks: managers[3].picks } });
      // you own 99 (25%) and 98 (25%): exactly 25% is NOT a differential
      expect(out.you!.differentials.map((d) => d.playerId)).toEqual([]);
      const out2 = run({ you: { managerId: 4, picks: managers[3].picks }, differentialMax: 30 });
      expect(out2.you!.differentials.map((d) => d.playerId).sort((a, b) => a - b)).toEqual([98, 99]);
    });

    it("gaps are players held by at least 50% of the league that you do not own (boundary inclusive), most-owned first", () => {
      const out = run({ you: { managerId: 4, picks: managers[3].picks } });
      // 33 and 25 are held by 3 of 4 (75%) and you swapped them out
      expect(out.you!.gaps.map((g) => g.playerId)).toEqual([25, 33]);
      const out2 = run({ you: { managerId: 4, picks: managers[3].picks }, gapMin: 76 });
      expect(out2.you!.gaps).toEqual([]);
    });

    it("works for a manager who is not in the league sample (percentages are still against the league)", () => {
      const out = run({ you: { managerId: 777, picks: squad(base15, 31) } });
      expect(out.you!.inSample).toBe(false);
      expect(out.you!.differentials).toEqual([]);
      expect(out.you!.gaps).toEqual([]);
    });

    it("flags whether you are one of the managers counted", () => {
      expect(run({ you: { managerId: 4, picks: managers[3].picks } }).you!.inSample).toBe(true);
    });

    it("an incomplete squad for you gives a clear 'no full squad' result, not a guess", () => {
      const out = run({ you: { managerId: 4, picks: [pick(1)] } });
      expect(out.you).toMatchObject({ hasFullSquad: false, differentials: [], gaps: [] });
    });
  });

  it("an empty league gives empty sections and a null template", () => {
    const out = run({ managers: [] });
    expect(out.managersCounted).toBe(0);
    expect(out.ownership).toEqual([]);
    expect(out.captains).toEqual([]);
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}
const FPL = "https://fantasy.premierleague.com/api";

describe("GET /api/league-ownership/:leagueId (against FPL's own data, league 314 = Overall, top 50)", () => {
  let out: any;
  let boot: any;
  let latest: number;

  beforeAll(async () => {
    boot = (await getJson("/api/bootstrap-static")).body;
    latest = Math.max(...boot.events.filter((e: any) => e.finished).map((e: any) => e.id));
    out = (await getJson(`/api/league-ownership/314?gw=${latest}`)).body;
  }, 240000);

  it("covers the first standings page (at most 50 managers) and says the league has more", () => {
    expect(out.gameweek).toBe(latest);
    expect(out.managersRequested).toBe(50);
    expect(out.managersCounted).toBeLessThanOrEqual(50);
    expect(out.managersCounted).toBeGreaterThan(40);
    expect(out.hasMore).toBe(true);
    expect(out.league.name).toBe("Overall");
  });

  it("every ownership figure equals a manual count over the raw FPL picks of the same managers", async () => {
    const standings: any = await (await fetch(`${FPL}/leagues-classic/314/standings/?page_standings=1`)).json();
    const counts = new Map<number, number>();
    let counted = 0;
    for (const row of standings.standings.results) {
      const res = await fetch(`${FPL}/entry/${row.entry}/event/${latest}/picks/`);
      if (!res.ok) continue;
      const picks = (await res.json()).picks;
      if (picks?.length !== 15) continue;
      counted++;
      for (const p of picks) counts.set(p.element, (counts.get(p.element) ?? 0) + 1);
    }
    expect(out.managersCounted).toBe(counted);
    for (const p of out.ownership.slice(0, 10)) {
      expect(p.ownedBy).toBe(counts.get(p.playerId));
      expect(p.percent).toBe(Math.round((p.ownedBy / counted) * 100));
    }
  }, 240000);

  it("returns a legal template XI built from those squads", () => {
    expect(out.template.startingXI).toHaveLength(11);
    expect(out.template.managersCounted).toBe(out.managersCounted);
  });

  it("you mode: differentials and gaps respect the thresholds", async () => {
    const youId = 9267;
    const { status, body } = await getJson(`/api/league-ownership/314?gw=${latest}&managerId=${youId}`);
    expect(status).toBe(200);
    for (const d of body.you.differentials) expect(d.ownedBy * 100).toBeLessThan(25 * body.managersCounted);
    for (const g of body.you.gaps) expect(g.ownedBy * 100).toBeGreaterThanOrEqual(50 * body.managersCounted);
  });

  it("rejects bad input: non-numeric league 400, unknown league 404, bad/unfinished gameweek 400, bad manager 400", async () => {
    expect((await getJson("/api/league-ownership/abc")).status).toBe(400);
    expect((await getJson(`/api/league-ownership/999999999?gw=${latest}`)).status).toBe(404);
    for (const bad of ["0", "39", "abc", "2.5"]) expect((await getJson(`/api/league-ownership/314?gw=${bad}`)).status).toBe(400);
    const unfinished = boot.events.find((e: any) => !e.finished).id;
    expect((await getJson(`/api/league-ownership/314?gw=${unfinished}`)).status).toBe(400);
    expect((await getJson(`/api/league-ownership/314?gw=${latest}&managerId=abc`)).status).toBe(400);
  });
});
