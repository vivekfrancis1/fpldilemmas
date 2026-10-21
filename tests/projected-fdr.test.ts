import { describe, it, expect, beforeAll } from "vitest";
import {
  quintileTier,
  lookupProjected,
  formatProjected,
  meanOf,
  type ProjectionRow,
} from "../shared/projected-fdr";

describe("quintileTier (colour = rank among the fixtures shown; 1 = easiest, 5 = hardest)", () => {
  const ten = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  it("splits ten distinct values into five tiers of two, best values easiest", () => {
    const tiers = ten.map((v) => quintileTier(ten, v));
    expect(tiers).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("ties share the better tier", () => {
    const vals = [5, 5, 5, 5, 1, 1, 1, 1, 1, 1];
    expect(quintileTier(vals, 5)).toBe(1);
    expect(quintileTier(vals, 1)).toBe(3); // six values are not better than... four values are: floor(4*5/10)+1 = 3
  });

  it("the highest value is always tier 1 and the lowest is never tier 1 when values differ", () => {
    const vals = [0.4, 1.1, 1.9, 2.5, 0.9, 1.5, 3.0, 2.2, 1.0, 0.7];
    expect(quintileTier(vals, 3.0)).toBe(1);
    expect(quintileTier(vals, 0.4)).toBe(5);
  });

  it("with fewer than five values there are no meaningful quintiles, so everything is neutral (3)", () => {
    expect(quintileTier([2.0], 2.0)).toBe(3);
    expect(quintileTier([2.0, 1.0, 3.0, 0.5], 3.0)).toBe(3);
  });

  it("all equal values share tier 1 (nothing is easier than anything else) only when there are enough values; otherwise neutral", () => {
    const same = Array(10).fill(2);
    expect(new Set(same.map((v) => quintileTier(same, v))).size).toBe(1);
  });

  it("every tier is between 1 and 5", () => {
    const vals = Array.from({ length: 37 }, (_, i) => Math.sin(i) * 3 + 3);
    for (const v of vals) {
      const t = quintileTier(vals, v);
      expect(t).toBeGreaterThanOrEqual(1);
      expect(t).toBeLessThanOrEqual(5);
    }
  });
});

describe("lookupProjected (reads our own per-fixture numbers)", () => {
  const rows: ProjectionRow[] = [
    {
      teamId: 1,
      fixtureDetails: {
        "8": [{ opponent: "EVE", isHome: true, goals: 2.06, cleanSheetOdds: 48.2, source: "odds" }],
        "10": [
          { opponent: "HUL", isHome: true, goals: 1.8, source: "model" },
          { opponent: "LIV", isHome: false, goals: 1.1, source: "odds" },
        ],
      },
    },
  ];
  const byId = new Map(rows.map((r) => [r.teamId, r]));

  it("attack reads goals, defence reads clean-sheet odds", () => {
    expect(lookupProjected(byId, 1, 8, "EVE", true, "attack")).toEqual({ value: 2.06, source: "odds" });
    expect(lookupProjected(byId, 1, 8, "EVE", true, "defence")).toEqual({ value: 48.2, source: "odds" });
  });

  it("a double gameweek returns each fixture's own value, matched by opponent and venue", () => {
    expect(lookupProjected(byId, 1, 10, "HUL", true, "attack")!.value).toBe(1.8);
    expect(lookupProjected(byId, 1, 10, "LIV", false, "attack")!.value).toBe(1.1);
    expect(lookupProjected(byId, 1, 10, "HUL", false, "attack")).toBeNull(); // wrong venue
  });

  it("missing team, gameweek, fixture or value gives null, never a made-up number", () => {
    expect(lookupProjected(byId, 99, 8, "EVE", true, "attack")).toBeNull();
    expect(lookupProjected(byId, 1, 9, "EVE", true, "attack")).toBeNull();
    expect(lookupProjected(byId, 1, 10, "HUL", true, "defence")).toBeNull(); // no clean-sheet value on that row
  });
});

describe("formatProjected and meanOf", () => {
  it("attack shows goals to 1 dp, defence shows a whole-number percentage", () => {
    expect(formatProjected("attack", 2.06)).toBe("2.1");
    expect(formatProjected("attack", 0.94)).toBe("0.9");
    expect(formatProjected("defence", 48.2)).toBe("48%");
    expect(formatProjected("defence", 27.5)).toBe("28%");
  });

  it("meanOf averages and returns null for nothing", () => {
    expect(meanOf([1, 2, 3])).toBe(2);
    expect(meanOf([])).toBeNull();
  });
});

const BASE_URL = `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("data contract: the endpoints the Projected view reads", () => {
  let goals: any[];
  let cs: any[];
  let bootstrap: any;

  beforeAll(async () => {
    goals = (await getJson("/api/team-goal-projections")).body;
    cs = (await getJson("/api/team-cs-projections")).body;
    bootstrap = (await getJson("/api/bootstrap-static")).body;
  }, 180000);

  it("goal projections expose teamId and per-fixture goals; clean-sheet projections expose id and cleanSheetOdds", () => {
    expect(goals).toHaveLength(bootstrap.teams.length);
    expect(cs).toHaveLength(bootstrap.teams.length);
    const gw = Object.keys(goals[0].fixtureDetails)[0];
    const g = goals[0].fixtureDetails[gw][0];
    expect(typeof g.goals).toBe("number");
    expect(typeof g.opponent).toBe("string");
    expect(typeof g.isHome).toBe("boolean");
    const c = cs[0].fixtureDetails[Object.keys(cs[0].fixtureDetails)[0]][0];
    expect(typeof c.cleanSheetOdds).toBe("number");
  });

  it("an official fixture and the projected rows agree on opponent and venue for the same team and gameweek", async () => {
    const fixtures = (await getJson("/api/fixtures")).body as any[];
    const shortById = new Map<number, string>(bootstrap.teams.map((t: any) => [t.id, t.short_name]));
    const gw = Number(Object.keys(goals[0].fixtureDetails)[0]);
    const team = goals[0];
    const official = fixtures.filter((f) => f.event === gw && (f.team_h === team.teamId || f.team_a === team.teamId));
    const shown = team.fixtureDetails[String(gw)];
    expect(shown).toHaveLength(official.length);
    for (const f of official) {
      const isHome = f.team_h === team.teamId;
      const opp = shortById.get(isHome ? f.team_a : f.team_h);
      expect(shown.some((s: any) => s.opponent === opp && s.isHome === isHome)).toBe(true);
    }
  });
});
