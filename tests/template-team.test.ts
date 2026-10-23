import { describe, it, expect, beforeAll } from "vitest";
import { buildTemplateTeam } from "../shared/template-team";

// ---- synthetic world: 3 GKP, 6 DEF, 6 MID, 4 FWD across clubs ----
const teams = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Club ${i + 1}`, short_name: `C${i + 1}`, code: (i + 1) * 10 + 3 }));
type El = { id: number; web_name: string; team: number; element_type: number; now_cost: number };
const mk = (id: number, type: number, team: number, cost = 50): El => ({ id, web_name: `P${id}`, team, element_type: type, now_cost: cost });
// clubs are spread so the 3-per-club cap does not bind here (it has its own test below)
const gkp = [mk(1, 1, 1), mk(2, 1, 2), mk(3, 1, 3)];
const def = [mk(11, 2, 4), mk(12, 2, 5), mk(13, 2, 6), mk(14, 2, 7), mk(15, 2, 8), mk(16, 2, 1)];
const mid = [mk(21, 3, 2), mk(22, 3, 3), mk(23, 3, 4), mk(24, 3, 5), mk(25, 3, 6), mk(26, 3, 7)];
const fwd = [mk(31, 4, 8), mk(32, 4, 1), mk(33, 4, 2), mk(34, 4, 3)];
const elements: El[] = [...gkp, ...def, ...mid, ...fwd];

const pick = (element: number, captain = false) => ({ element, position: 1, multiplier: captain ? 2 : 1, is_captain: captain, is_vice_captain: false });
// A legal 15 for one manager: [gkp ids], [def ids], [mid ids], [fwd ids]
const squad = (g: number[], d: number[], m: number[], f: number[], captain: number) =>
  [...g, ...d, ...m, ...f].map((id) => pick(id, id === captain));
const manager = (managerId: number, picks: any[]) => ({ managerId, picks });

const base = [
  manager(1, squad([1, 2], [11, 12, 13, 14, 15], [21, 22, 23, 24, 25], [31, 32, 33], 31)),
  manager(2, squad([1, 2], [11, 12, 13, 14, 16], [21, 22, 23, 24, 26], [31, 32, 34], 31)),
  manager(3, squad([1, 3], [11, 12, 13, 15, 16], [21, 22, 23, 25, 26], [31, 33, 34], 21)),
];
const run = (over: any = {}) => buildTemplateTeam({ managers: base, elements, teams, ...over });

describe("buildTemplateTeam", () => {
  it("carries each player's club shirt code so the pitch can draw the right shirt", () => {
    const out = run();
    for (const p of [...out.startingXI, ...out.bench]) expect(p.teamCode).toBe(p.teamId * 10 + 3);
  });

  it("counts ownership across all 15 picks and expresses it as a share of the squads counted", () => {
    const out = run();
    expect(out.managersCounted).toBe(3);
    const all = [...out.startingXI, ...out.bench];
    const p31 = all.find((p) => p.playerId === 31)!;
    expect(p31.ownedBy).toBe(3);
    expect(p31.ownershipPercent).toBe(100);
    const p15 = all.find((p) => p.playerId === 15);
    if (p15) expect(p15.ownedBy).toBe(2);
  });

  it("builds a legal squad: 2 GKP, 5 DEF, 5 MID, 3 FWD (15 players), XI of 11 with 1 GKP", () => {
    const out = run();
    const all = [...out.startingXI, ...out.bench];
    expect(all).toHaveLength(15);
    const by = (t: string) => all.filter((p) => p.position === t).length;
    expect([by("GKP"), by("DEF"), by("MID"), by("FWD")]).toEqual([2, 5, 5, 3]);
    expect(out.startingXI).toHaveLength(11);
    expect(out.startingXI.filter((p) => p.position === "GKP")).toHaveLength(1);
    expect(out.bench).toHaveLength(4);
    expect(out.bench[0].position).toBe("GKP"); // reserve keeper first, as in FPL
  });

  it("picks the most-owned players in each position", () => {
    const out = run();
    const ids = [...out.startingXI, ...out.bench].map((p) => p.playerId);
    // forwards 32, 33, 34 are tied on 2 owners; the lowest ids win the last two slots
    expect(ids).toEqual(expect.arrayContaining([1, 11, 12, 13, 21, 22, 23, 31, 32, 33]));
    expect(ids).not.toContain(34);
    expect(ids).not.toContain(3); // the least-owned keeper
    expect(ids).not.toContain(16); // defender 16 (2 owners) loses the tie to 14 and 15
  });

  it("the starting XI is a valid formation (>=3 DEF, >=2 MID, >=1 FWD) and the label matches it", () => {
    const out = run();
    const n = (t: string) => out.startingXI.filter((p) => p.position === t).length;
    expect(n("DEF")).toBeGreaterThanOrEqual(3);
    expect(n("MID")).toBeGreaterThanOrEqual(2);
    expect(n("FWD")).toBeGreaterThanOrEqual(1);
    expect(out.formation).toBe(`${n("DEF")}-${n("MID")}-${n("FWD")}`);
  });

  it("never selects more than 3 players from one club", () => {
    // everyone owns the same four Club-1 outfielders, so the cap must bite
    const c1 = [mk(41, 2, 1), mk(42, 3, 1), mk(43, 4, 1), mk(44, 3, 1)];
    const els = [...elements, ...c1];
    const same = (id: number) =>
      manager(id, squad([1, 2], [41, 12, 13, 14, 15], [42, 44, 23, 24, 25], [43, 32, 33], 43));
    const out = buildTemplateTeam({ managers: [same(1), same(2), same(3)], elements: els, teams });
    const perClub = new Map<number, number>();
    for (const p of [...out.startingXI, ...out.bench]) perClub.set(p.teamId, (perClub.get(p.teamId) ?? 0) + 1);
    expect(Math.max(...perClub.values())).toBeLessThanOrEqual(3);
    expect([...out.startingXI, ...out.bench]).toHaveLength(15);
  });

  it("leaves out squads that did not return exactly 15 picks (they do not dilute the percentages)", () => {
    const broken = { managerId: 99, picks: [pick(1), pick(11)] };
    const out = run({ managers: [...base, broken, { managerId: 98, picks: null }] });
    expect(out.managersCounted).toBe(3);
    expect(out.managersRequested).toBe(5);
    const p31 = [...out.startingXI, ...out.bench].find((p) => p.playerId === 31)!;
    expect(p31.ownershipPercent).toBe(100);
  });

  it("names the most common captain with how many managers chose him", () => {
    const out = run();
    expect(out.captain).toMatchObject({ playerId: 31, count: 2, percent: 67 });
  });

  it("breaks ownership ties by player id so results are repeatable", () => {
    const a = run();
    const b = run({ managers: [...base].reverse() });
    expect(a.startingXI.map((p) => p.playerId)).toEqual(b.startingXI.map((p) => p.playerId));
    expect(a.bench.map((p) => p.playerId)).toEqual(b.bench.map((p) => p.playerId));
  });

  it("totals the squad value in millions from now_cost", () => {
    const out = run();
    expect(out.totalValue).toBe(75); // 15 players x 50 tenths = 75.0m
  });

  it("returns an empty, honest result when no squads are available", () => {
    const out = run({ managers: [] });
    expect(out.managersCounted).toBe(0);
    expect(out.startingXI).toEqual([]);
    expect(out.bench).toEqual([]);
    expect(out.captain).toBeNull();
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/template-team (consistency with the Top 100 squads we already load)", () => {
  let top: any;
  let tt: any;

  beforeAll(async () => {
    top = (await getJson("/api/top-managers/teams")).body;
    tt = (await getJson("/api/template-team")).body;
  }, 120000);

  it("reports the same gameweek and squad count as the Top 100 data", () => {
    expect(tt.gameweek).toBe(top.metadata.gameweek);
    const complete = top.teams.filter((t: any) => t.success && t.teamData?.picks?.length === 15).length;
    expect(tt.managersCounted).toBe(complete);
    expect(tt.managersRequested).toBe(top.metadata.totalRequested);
  });

  it("every listed player's ownedBy equals a manual count over the raw squads", () => {
    const counts = new Map<number, number>();
    for (const t of top.teams) {
      if (!t.success || t.teamData?.picks?.length !== 15) continue;
      for (const p of t.teamData.picks) counts.set(p.element, (counts.get(p.element) ?? 0) + 1);
    }
    for (const p of [...tt.startingXI, ...tt.bench]) {
      expect(p.ownedBy).toBe(counts.get(p.playerId));
      expect(p.ownershipPercent).toBe(Math.round((p.ownedBy / tt.managersCounted) * 100));
    }
  });

  it("is a legal 15: 2/5/5/3, max 3 per club, XI of 11", () => {
    const all = [...tt.startingXI, ...tt.bench];
    expect(all).toHaveLength(15);
    expect(tt.startingXI).toHaveLength(11);
    const by = (t: string) => all.filter((p: any) => p.position === t).length;
    expect([by("GKP"), by("DEF"), by("MID"), by("FWD")]).toEqual([2, 5, 5, 3]);
    const perClub = new Map<number, number>();
    for (const p of all) perClub.set(p.teamId, (perClub.get(p.teamId) ?? 0) + 1);
    expect(Math.max(...perClub.values())).toBeLessThanOrEqual(3);
  });
});

// ---- Template Team for two groups: Top 100 managers and Content Creators ----
import { TEMPLATE_GROUPS, parseTemplateGroup } from "../shared/template-team";

describe("template team groups", () => {
  it("defaults to the Top 100 managers when no group is given", () => {
    expect(parseTemplateGroup(undefined)).toBe("top100");
    expect(parseTemplateGroup("")).toBe("top100");
  });

  it("accepts the two groups", () => {
    expect(parseTemplateGroup("top100")).toBe("top100");
    expect(parseTemplateGroup("creators")).toBe("creators");
  });

  it("rejects anything else instead of guessing", () => {
    for (const bad of ["Top100", "creator", "all", "1", "top100,creators", ["creators"], 5, null]) {
      expect(parseTemplateGroup(bad as unknown), String(bad)).toBeNull();
    }
  });

  it("each group names its own people and data source", () => {
    expect(TEMPLATE_GROUPS.top100.label).toBe("Top 100 managers");
    expect(TEMPLATE_GROUPS.creators.label).toBe("Content creators");
    expect(TEMPLATE_GROUPS.top100.source).toBe("api/top-managers/teams");
    expect(TEMPLATE_GROUPS.creators.source).toBe("api/content-creators/teams");
  });
});
