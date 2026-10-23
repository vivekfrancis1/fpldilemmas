import { describe, it, expect } from "vitest";
import {
  PLOT_POSITIONS,
  PLOT_PRESETS,
  STAT_GROUPS,
  buildPlotPlayers,
  getStat,
  presetsForPositions,
  type PlotElement,
} from "../shared/player-plot";

const el = (over: Partial<PlotElement> & { id: number; team: number }): PlotElement =>
  ({
    web_name: `P${over.id}`, element_type: 3, now_cost: 70, selected_by_percent: "10", minutes: 900, starts: 10, total_points: 50,
    points_per_game: "5", form: "5", goals_scored: 3, assists: 2, clean_sheets: 3, saves: 0, bonus: 5, bps: 100, influence: "100", creativity: "100",
    threat: "100", ict_index: "30", expected_goals: "3", expected_assists: "2", expected_goal_involvements: "5", expected_goals_per_90: "0.3",
    expected_assists_per_90: "0.2", expected_goal_involvements_per_90: "0.5", status: "a", chance_of_playing_next_round: null, transfers_in_event: 0,
    transfers_out_event: 0, cost_change_start: 0, defensive_contribution: 10, defensive_contribution_per_90: 5, saves_per_90: 0,
    expected_goals_conceded_per_90: 1, goals_conceded_per_90: 1, clean_sheets_per_90: 0.3, ...over,
  }) as PlotElement;

const base = { projections: [], teamShortById: new Map([[1, "ARS"], [2, "AVL"]]), fromGW: 8, toGW: 10 };
const teamProjections = {
  goals: [
    { teamId: 1, gameweekProjections: { "7": 9, "8": 2, "9": 1.5, "10": 1, "11": 9 } },
    { teamId: 2, gameweekProjections: { "11": 3 } },
  ],
  cs: [{ teamId: 1, gameweekProjections: { "8": 40, "9": 20, "10": 30, "12": 99 } }],
};

describe("team fixture stats", () => {
  it("are listed under their own group, tied to the gameweek range", () => {
    expect(STAT_GROUPS).toContain("Team fixtures");
    for (const key of ["team_goals_range", "team_cs_avg"]) {
      const def = getStat(key)!;
      expect(def, key).toBeDefined();
      expect(def.group).toBe("Team fixtures");
      expect(def.usesHorizon).toBe(true);
    }
  });

  it("team goals add up over exactly the chosen gameweeks", () => {
    const [p] = buildPlotPlayers({ ...base, elements: [el({ id: 1, team: 1 })], teamProjections });
    expect(p.values.team_goals_range).toBeCloseTo(4.5, 10);
  });

  it("clean-sheet chance is the average over the gameweeks that have a value", () => {
    const [p] = buildPlotPlayers({ ...base, elements: [el({ id: 1, team: 1 })], teamProjections });
    expect(p.values.team_cs_avg).toBeCloseTo(30, 10);
  });

  it("is null, never zero, when the team has nothing in the range or no data at all", () => {
    const [none] = buildPlotPlayers({ ...base, elements: [el({ id: 2, team: 2 })], teamProjections });
    expect(none.values.team_goals_range).toBeNull();
    expect(none.values.team_cs_avg).toBeNull();
    const [absent] = buildPlotPlayers({ ...base, elements: [el({ id: 1, team: 1 })] });
    expect(absent.values.team_goals_range).toBeNull();
    expect(absent.values.team_cs_avg).toBeNull();
  });

  it("two players in the same team get the same fixture numbers", () => {
    const [a, b] = buildPlotPlayers({ ...base, elements: [el({ id: 1, team: 1 }), el({ id: 2, team: 1, element_type: 2 })], teamProjections });
    expect(a.values.team_goals_range).toBe(b.values.team_goals_range);
  });
});

describe("fixture quick views", () => {
  const ids = (positions: Array<"GKP" | "DEF" | "MID" | "FWD">) => presetsForPositions(positions).map((p) => p.id);

  it("the general list can plot output against the fixtures", () => {
    const p = PLOT_PRESETS.find((x) => x.id === "fixtures-attack")!;
    expect([p.x, p.y]).toEqual(["team_goals_range", "xgi_90"]);
    expect(p.minMinutes ?? 0).toBeGreaterThan(0);
    expect(p.quadrants).toBeDefined();
  });

  it("every position has a fixtures view, defenders and keepers on clean sheets, attackers on goals", () => {
    const axes = (pos: "GKP" | "DEF" | "MID" | "FWD") => presetsForPositions([pos]).map((p) => `${p.x}|${p.y}`);
    expect(axes("GKP")).toContain("team_cs_avg|cs_90");
    expect(axes("DEF")).toContain("team_cs_avg|cs_90");
    expect(axes("MID")).toContain("team_goals_range|xgi_90");
    expect(axes("FWD")).toContain("team_goals_range|xg_90");
  });

  it("the default graph of each list is unchanged", () => {
    expect(ids([])[0]).toBe("differentials");
    expect(ids(["GKP"])[0]).toBe("gk-value");
    expect(ids(["DEF"])[0]).toBe("def-attack");
    expect(ids(["MID"])[0]).toBe("mid-creators");
    expect(ids(["FWD"])[0]).toBe("fwd-finishing");
  });

  it("no list repeats a pair of axes", () => {
    for (const positions of [[], ...PLOT_POSITIONS.map((p) => [p])] as Array<Array<"GKP" | "DEF" | "MID" | "FWD">>) {
      const keys = presetsForPositions(positions).map((p) => `${p.x}|${p.y}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
