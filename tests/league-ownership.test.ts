import { describe, it, expect, beforeAll } from "vitest";
import { buildLeagueOwnership, selectableGameweeks } from "../shared/league-ownership";

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

describe("selectableGameweeks (squads are locked once the deadline has passed)", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const ev = (id: number, deadline: string, finished = false) => ({ id, deadline_time: deadline, finished });
  const events = [
    ev(7, "2026-10-17T10:00:00Z", true),
    ev(8, "2026-10-24T10:00:00Z"), // current gameweek: deadline passed, not finished
    ev(9, "2026-10-31T10:00:00Z"), // next: deadline still ahead
  ];

  it("includes finished gameweeks and the live one whose deadline has passed, excludes upcoming ones", () => {
    expect(selectableGameweeks(events, now)).toEqual([7, 8]);
  });
  it("is sorted ascending whatever order FPL lists them in", () => {
    expect(selectableGameweeks([...events].reverse(), now)).toEqual([7, 8]);
  });
  it("a deadline exactly now counts as passed", () => {
    expect(selectableGameweeks([ev(9, "2026-10-24T12:00:00Z")], now)).toEqual([9]);
  });
  it("a finished gameweek is always selectable, even with a missing deadline", () => {
    expect(selectableGameweeks([{ id: 3, deadline_time: null, finished: true }], now)).toEqual([3]);
  });
  it("is empty when nothing has started", () => {
    expect(selectableGameweeks([ev(1, "2026-12-01T10:00:00Z")], now)).toEqual([]);
  });
});

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
    it("differentials are your players held by fewer than 50% of the league by default (boundary exclusive)", () => {
      const you4 = { managerId: 4, picks: managers[3].picks };
      // you own 99 and 98 (25% each); everything else you hold is owned by 75-100%
      expect(run({ you: you4 }).you!.differentials.map((d) => d.playerId)).toEqual([98, 99]);
      // exactly 25% is NOT a differential when the limit is 25
      expect(run({ you: you4, differentialMax: 25 }).you!.differentials).toEqual([]);
      expect(run({ you: you4, differentialMax: 26 }).you!.differentials.map((d) => d.playerId)).toEqual([98, 99]);
    });

    it("a player owned by exactly 50% of the league is not a differential, one owned by 49% or less is", () => {
      // 4 managers: 99 is held by m4 and one more manager = 2 of 4 = 50%
      const two = managers.map((m, i) => (i === 1 ? { ...m, picks: squad(base15.map((x) => (x === 33 ? 99 : x)), 31) } : m));
      const you = { managerId: 4, picks: managers[3].picks };
      expect(run({ managers: two, you }).you!.differentials.map((d) => d.playerId)).toEqual([98]); // 99 at 50% is out
      expect(run({ managers: two, you, differentialMax: 51 }).you!.differentials.map((d) => d.playerId)).toEqual([98, 99]);
    });

    it("has no gaps list any more: what you are missing is the threats list", () => {
      const out = run({ you: { managerId: 4, picks: managers[3].picks } });
      expect(out.you).not.toHaveProperty("gaps");
    });

    it("works for a manager who is not in the league sample (percentages are still against the league)", () => {
      const out = run({ you: { managerId: 777, picks: squad(base15, 31) } });
      expect(out.you!.inSample).toBe(false);
      expect(out.you!.differentials).toEqual([]);
    });

    describe("threats (popular players you don't own)", () => {
      // m4 (rank 4) swapped 33 -> 99 and 25 -> 98; 33 and 25 are held by m1..m3 (75%), 99 and 98 only by m4 (25%).
      const named = managers.map((m) => ({ ...m, name: `M${m.managerId}`, rank: m.managerId }));
      const you4 = { managerId: 4, picks: managers[3].picks };
      const youM1 = { managerId: 1, picks: managers[0].picks };

      it("threats are players you don't own that MORE than 25% of the league hold, with who holds them (boundary exclusive)", () => {
        const out = run({ managers: named, you: you4 });
        expect(out.you!.threats.map((t) => t.playerId)).toEqual([25, 33]); // 75% each; you swapped them out
        const t33 = out.you!.threats.find((t) => t.playerId === 33)!;
        expect(t33.ownedBy).toBe(3);
        expect(t33.owners).toEqual([
          { managerId: 1, name: "M1", rank: 1 },
          { managerId: 2, name: "M2", rank: 2 },
          { managerId: 3, name: "M3", rank: 3 },
        ]);
        // 99 and 98 sit at exactly 25%: not a threat at the default limit, and a threat once the limit drops below 25
        expect(run({ managers: named, you: youM1 }).you!.threats).toEqual([]);
        expect(run({ managers: named, you: youM1, threatMin: 24 }).you!.threats.map((t) => t.playerId).sort((a, b) => a - b)).toEqual([98, 99]);
      });

      it("never lists a player you own", () => {
        const out = run({ managers: named, you: youM1, threatMin: 0 });
        const yours = new Set(managers[0].picks!.map((p) => p.element));
        for (const t of out.you!.threats) expect(yours.has(t.playerId)).toBe(false);
      });

      it("lists the most-owned first, then the better-ranked owner, then player id, and honours threatsMax", () => {
        const ms = [
          { managerId: 1, name: "A", rank: 1, picks: squad(base15.map((i) => (i === 33 ? 99 : i)), 31) },
          { managerId: 2, name: "B", rank: 2, picks: squad(base15.map((i) => (i === 33 ? 98 : i)), 31) },
          { managerId: 3, name: "C", rank: 3, picks: squad(base15.map((i) => (i === 33 ? 98 : i === 25 ? 99 : i)), 31) },
          { managerId: 4, name: "D", rank: 4, picks: squad(base15.map((i) => (i === 33 ? 98 : i === 25 ? 99 : i)), 31) },
          { managerId: 5, name: "You", rank: 5, picks: squad(base15, 31) },
        ];
        const you = { managerId: 5, picks: ms[4].picks };
        // 98: B, C, D (3 of 5). 99: A, C, D (3 of 5). Tie on owners, so the better-ranked owner (A, rank 1) puts 99 first.
        const out = run({ managers: ms, you, threatMin: 30 });
        expect(out.you!.threats.map((t) => t.playerId)).toEqual([99, 98]);
        expect(out.you!.threats[0].owners.map((o) => o.name)).toEqual(["A", "C", "D"]);
        expect(run({ managers: ms, you, threatMin: 30, threatsMax: 1 }).you!.threats.map((t) => t.playerId)).toEqual([99]);
      });

      it("a more-owned player comes before a less-owned one even if the less-owned one has the better-ranked owner", () => {
        const out = run({ managers: named, you: you4 });
        // 25 and 33 are both 75%; add a 50% player by making m1 hold 98 too
        const ms = named.map((m, i) => (i === 0 ? { ...m, picks: squad(base15.map((x) => (x === 21 ? 98 : x)), 31) } : m));
        const out2 = run({ managers: ms, you: { managerId: 4, picks: managers[3].picks }, threatMin: 20 });
        const order = out2.you!.threats.map((t) => t.ownedBy);
        expect(order).toEqual([...order].sort((a, b) => b - a));
        expect(out.you!.threats.length).toBe(2);
      });

      it("owners without a name or rank are still listed by id", () => {
        const out = run({ you: you4 });
        expect(out.you!.threats.find((t) => t.playerId === 33)!.owners).toEqual([{ managerId: 1 }, { managerId: 2 }, { managerId: 3 }]);
      });

      it("is empty when you have no full squad", () => {
        expect(run({ managers: named, you: { managerId: 1, picks: [pick(1)] } }).you!.threats).toEqual([]);
      });
    });

    describe("points and starting XI / bench", () => {
      const withPos = (ids: number[]) => ids.map((element, i) => ({ element, is_captain: false, position: i + 1 }));
      const points = { 99: 7, 98: 2, 33: 5, 31: 9 };
      const you4 = { managerId: 4, picks: withPos(base15.map((i) => (i === 33 ? 99 : i === 25 ? 98 : i))) };
      const ms = [
        { managerId: 1, name: "A", rank: 1, picks: withPos(base15) },
        { managerId: 2, name: "B", rank: 2, picks: withPos(base15.map((i) => (i === 33 ? 99 : i))) },
        { managerId: 3, name: "C", rank: 3, picks: withPos(base15) },
        { managerId: 4, name: "You", rank: 4, picks: you4.picks },
      ];

      it("your differentials say whether the player is in your starting XI (position 1-11) or on the bench, and carry his points", () => {
        const out = run({ managers: ms, you: you4, points, differentialMax: 60 });
        const d98 = out.you!.differentials.find((d) => d.playerId === 98)!;
        const d99 = out.you!.differentials.find((d) => d.playerId === 99)!;
        // base15 index: 98 replaced 25 (index 11 -> position 12, bench); 99 replaced 33 (index 14 -> position 15, bench)
        expect(d98).toMatchObject({ starting: false, points: 2 });
        expect(d99).toMatchObject({ starting: false, points: 7, ownedBy: 2 });
      });

      it("a player in picks 1-11 is starting", () => {
        const you = { managerId: 4, picks: withPos([99, ...base15.filter((i) => i !== 33 && i !== 1)].concat([1, 2]).slice(0, 15)) };
        const out = run({ managers: ms, you, points, differentialMax: 60 });
        expect(out.you!.differentials.find((d) => d.playerId === 99)!.starting).toBe(true);
      });

      it("threats carry points, and each owner says whether he starts the player", () => {
        const you = { managerId: 3, picks: withPos(base15) };
        const out = run({ managers: ms, you, points });
        const t99 = out.you!.threats.find((t) => t.playerId === 99)!;
        expect(t99.points).toBe(7);
        expect(t99.ownedBy).toBe(2);
        expect(t99.owners.map((o) => [o.name, o.starting])).toEqual([["B", false], ["You", false]]);
      });

      it("points are left out when none are supplied, and a player missing from the points map scores 0", () => {
        expect(run({ managers: ms, you: you4, differentialMax: 60 }).you!.differentials[0].points).toBeUndefined();
        const out = run({ managers: ms, you: you4, points: {}, differentialMax: 60 });
        expect(out.you!.differentials[0].points).toBe(0);
      });

    });

    it("flags whether you are one of the managers counted", () => {
      expect(run({ you: { managerId: 4, picks: managers[3].picks } }).you!.inSample).toBe(true);
    });

    it("an incomplete squad for you gives a clear 'no full squad' result, not a guess", () => {
      const out = run({ you: { managerId: 4, picks: [pick(1)] } });
      expect(out.you).toMatchObject({ hasFullSquad: false, differentials: [], threats: [] });
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
    // One real FPL call per manager, but in parallel batches of 10 so the test is quick and polite
    const rows = standings.standings.results as any[];
    for (let i = 0; i < rows.length; i += 10) {
      const batch = await Promise.all(
        rows.slice(i, i + 10).map(async (row) => {
          const res = await fetch(`${FPL}/entry/${row.entry}/event/${latest}/picks/`);
          return res.ok ? (await res.json()).picks : null;
        }),
      );
      for (const picks of batch) {
        if (picks?.length !== 15) continue;
        counted++;
        for (const p of picks) counts.set(p.element, (counts.get(p.element) ?? 0) + 1);
      }
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

  it("you mode: differentials respect the threshold", async () => {
    const youId = 9267;
    const { status, body } = await getJson(`/api/league-ownership/314?gw=${latest}&managerId=${youId}`);
    expect(status).toBe(200);
    for (const d of body.you.differentials) expect(d.ownedBy * 100).toBeLessThan(50 * body.managersCounted);
    expect(body.you).not.toHaveProperty("gaps");
    const yours = new Set(body.you.differentials.map((d: any) => d.playerId));
    expect(body.you.threats.length).toBeLessThanOrEqual(12);
    for (let i = 0; i < body.you.threats.length; i++) {
      const t = body.you.threats[i];
      expect(t.ownedBy * 100).toBeGreaterThan(25 * body.managersCounted);
      if (i > 0) expect(t.ownedBy).toBeLessThanOrEqual(body.you.threats[i - 1].ownedBy);
      expect(t.owners).toHaveLength(t.ownedBy);
      expect(t.owners[0].name).toBeTruthy();
      expect(yours.has(t.playerId)).toBe(false);
    }
  });

  it("offers the live gameweek once its deadline has passed, and flags it as live", async () => {
    const live = boot.events.find((e: any) => !e.finished && new Date(e.deadline_time) <= new Date());
    expect(out.gameweeks).toContain(latest);
    if (!live) return; // between gameweeks: nothing is live right now
    expect(out.gameweeks).toContain(live.id);
    const { status, body } = await getJson(`/api/league-ownership/314?gw=${live.id}`);
    expect(status).toBe(200);
    expect(body.gameweek).toBe(live.id);
    expect(body.live).toBe(true);
    expect(body.liveGameweek).toBe(live.id);
    expect((await getJson("/api/league-ownership/314")).body.gameweek).toBe(live.id); // the live gameweek is the default
  });

  it("rejects bad input: non-numeric league 400, unknown league 404, bad/unfinished gameweek 400, bad manager 400", async () => {
    expect((await getJson("/api/league-ownership/abc")).status).toBe(400);
    expect((await getJson(`/api/league-ownership/999999999?gw=${latest}`)).status).toBe(404);
    for (const bad of ["0", "39", "abc", "2.5"]) expect((await getJson(`/api/league-ownership/314?gw=${bad}`)).status).toBe(400);
    const upcoming = boot.events.find((e: any) => new Date(e.deadline_time) > new Date()).id;
    expect((await getJson(`/api/league-ownership/314?gw=${upcoming}`)).status).toBe(400);
    expect((await getJson(`/api/league-ownership/314?gw=${latest}&managerId=abc`)).status).toBe(400);
  });
});
