import { describe, it, expect } from "vitest";
import {
  PLOT_STATS,
  PLOT_PRESETS,
  getStat,
  horizonSum,
  buildPlotPlayers,
  filterPlayers,
  topByStat,
  median,
  makeScale,
  niceDomain,
  niceTicks,
  declutterLabels,
  quadrantPicks,
  presetsForPositions,
  presetBaseline,
  stateForPreset,
  stateForPosition,
  PLOT_POSITIONS,
  decodePlotState,
  encodePlotState,
  DEFAULT_PLOT_STATE,
  type PlotElement,
  type PlotProjection,
} from "../shared/player-plot";

const el = (over: Partial<PlotElement> = {}): PlotElement => ({
  id: 1,
  web_name: "Haaland",
  element_type: 4,
  team: 15,
  now_cost: 157,
  selected_by_percent: "76.9",
  minutes: 600,
  starts: 7,
  total_points: 60,
  points_per_game: "8.6",
  form: "9.5",
  goals_scored: 6,
  assists: 1,
  clean_sheets: 0,
  saves: 0,
  bonus: 10,
  bps: 200,
  influence: "300.0",
  creativity: "100.0",
  threat: "800.0",
  ict_index: "120.0",
  expected_goals: "5.00",
  expected_assists: "0.50",
  expected_goal_involvements: "5.50",
  expected_goals_per_90: 0.75,
  expected_assists_per_90: 0.07,
  expected_goal_involvements_per_90: 0.82,
  defensive_contribution_per_90: 3.9,
  defensive_contribution: 27,
  saves_per_90: 0,
  clean_sheets_per_90: 0.14,
  expected_goals_conceded_per_90: 0.9,
  goals_conceded_per_90: 1.1,
  transfers_in_event: 1000,
  transfers_out_event: 400,
  cost_change_start: 5,
  status: "a",
  chance_of_playing_next_round: 100,
  ...over,
});

const proj = (over: Partial<PlotProjection> = {}): PlotProjection => ({
  playerId: 1,
  gameweekProjections: { "8": 5, "9": 6, "10": 7, "11": 8 },
  xMinsPerGW: { "8": 60, "9": 80, "10": 90, "11": 90 },
  pointsFromGoals: { "8": 2, "9": 3, "10": 3, "11": 4 },
  pointsFromAssists: { "8": 0.1, "9": 0.2, "10": 0.2, "11": 0.3 },
  ...over,
});

const teamShortById = new Map([[15, "MCI"], [1, "ARS"]]);

function build(elements: PlotElement[], projections: PlotProjection[], fromGW = 8, toGW = 10) {
  return buildPlotPlayers({ elements, projections, teamShortById, fromGW, toGW });
}

describe("horizonSum", () => {
  it("sums exactly From..To and skips missing gameweeks", () => {
    expect(horizonSum({ "8": 5, "9": 6, "10": 7, "11": 8 }, 8, 10)).toBe(18);
    expect(horizonSum({ "8": 5, "10": 7 }, 8, 10)).toBe(12);
  });
  it("is null when no gameweek in range has a value", () => {
    expect(horizonSum({ "20": 5 }, 8, 10)).toBeNull();
    expect(horizonSum(undefined, 8, 10)).toBeNull();
  });
});

describe("buildPlotPlayers - stat values equal the source fields", () => {
  const [p] = build([el()], [proj()]);
  it("identity fields", () => {
    expect(p.id).toBe(1);
    expect(p.name).toBe("Haaland");
    expect(p.teamShort).toBe("MCI");
    expect(p.position).toBe("FWD");
    expect(p.available).toBe(true);
  });
  it("price is now_cost / 10 and ownership is numeric", () => {
    expect(p.values.price).toBe(15.7);
    expect(p.values.ownership).toBe(76.9);
    expect(p.price).toBe(15.7);
    expect(p.ownership).toBe(76.9);
  });
  it("season stats come straight from FPL fields", () => {
    expect(p.values.total_points).toBe(60);
    expect(p.values.ppg).toBe(8.6);
    expect(p.values.form).toBe(9.5);
    expect(p.values.goals).toBe(6);
    expect(p.values.goal_involvements).toBe(7);
    expect(p.values.xg).toBe(5);
    expect(p.values.xgi_90).toBe(0.82);
    expect(p.values.dc_90).toBe(3.9);
    expect(p.values.net_transfers).toBe(600);
    expect(p.values.price_change).toBe(0.5);
  });
  it("luck stats are actual minus expected", () => {
    expect(p.values.goals_minus_xg).toBeCloseTo(1, 10);
    expect(p.values.assists_minus_xa).toBeCloseTo(0.5, 10);
    expect(p.values.gi_minus_xgi).toBeCloseTo(1.5, 10);
  });
  it("ratios", () => {
    expect(p.values.points_per_m).toBeCloseTo(60 / 15.7, 10);
    expect(p.values.points_per_90).toBeCloseTo((60 / 600) * 90, 10);
  });
  it("projection stats use only the chosen horizon (GW8-10)", () => {
    expect(p.values.xpts_total).toBe(18);
    expect(p.values.xpts_avg).toBe(6);
    expect(p.values.xpts_per_m).toBeCloseTo(18 / 15.7, 10);
    expect(p.values.xmins_avg).toBeCloseTo((60 + 80 + 90) / 3, 10);
    expect(p.values.xgoal_pts).toBe(8);
    expect(p.values.xassist_pts).toBeCloseTo(0.5, 10);
  });
});

describe("buildPlotPlayers - missing data gives null, never a made-up number", () => {
  it("zero price / zero minutes ratios are null", () => {
    const [p] = build([el({ now_cost: 0, minutes: 0 })], [proj()]);
    expect(p.values.points_per_m).toBeNull();
    expect(p.values.xpts_per_m).toBeNull();
    expect(p.values.points_per_90).toBeNull();
  });
  it("a player with no projection row has null projection stats but keeps FPL stats", () => {
    const [p] = build([el()], []);
    expect(p.values.xpts_total).toBeNull();
    expect(p.values.xpts_avg).toBeNull();
    expect(p.values.xmins_avg).toBeNull();
    expect(p.values.total_points).toBe(60);
  });
  it("a horizon with no projections is null", () => {
    const [p] = build([el()], [proj()], 30, 32);
    expect(p.values.xpts_total).toBeNull();
  });
  it("every registered stat has a value key on a built player", () => {
    const [p] = build([el()], [proj()]);
    for (const s of PLOT_STATS) expect(Object.prototype.hasOwnProperty.call(p.values, s.key)).toBe(true);
  });
  it("positions and availability", () => {
    const players = build(
      [el({ id: 1, element_type: 1 }), el({ id: 2, element_type: 2 }), el({ id: 3, element_type: 3, status: "i", chance_of_playing_next_round: 0 }), el({ id: 4, status: "d", chance_of_playing_next_round: 50 })],
      [],
    );
    expect(players.map((x) => x.position)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(players.map((x) => x.available)).toEqual([true, true, false, false]);
  });
});

describe("filterPlayers", () => {
  const players = build(
    [
      el({ id: 1, element_type: 4, team: 15, minutes: 600, now_cost: 157, selected_by_percent: "76.9" }),
      el({ id: 2, element_type: 3, team: 1, minutes: 100, now_cost: 60, selected_by_percent: "4.0" }),
      el({ id: 3, element_type: 2, team: 1, minutes: 450, now_cost: 50, selected_by_percent: "12.5" }),
    ],
    [],
  );
  const none = { positions: [], teamIds: [], minMinutes: 0, maxPrice: null, ownershipMin: null, ownershipMax: null };
  it("no filters keeps everyone", () => {
    expect(filterPlayers(players, none)).toHaveLength(3);
  });
  it("position (multi), team, minutes, price and ownership range", () => {
    expect(filterPlayers(players, { ...none, positions: ["DEF", "MID"] }).map((p) => p.id)).toEqual([2, 3]);
    expect(filterPlayers(players, { ...none, teamIds: [1] }).map((p) => p.id)).toEqual([2, 3]);
    expect(filterPlayers(players, { ...none, minMinutes: 300 }).map((p) => p.id)).toEqual([1, 3]);
    expect(filterPlayers(players, { ...none, maxPrice: 6 }).map((p) => p.id)).toEqual([2, 3]);
    expect(filterPlayers(players, { ...none, ownershipMax: 10 }).map((p) => p.id)).toEqual([2]);
    expect(filterPlayers(players, { ...none, ownershipMin: 10 }).map((p) => p.id)).toEqual([1, 3]);
  });
  it("boundaries are inclusive", () => {
    expect(filterPlayers(players, { ...none, minMinutes: 450 }).map((p) => p.id)).toEqual([1, 3]);
    expect(filterPlayers(players, { ...none, maxPrice: 5 }).map((p) => p.id)).toEqual([3]);
  });
});

describe("topByStat", () => {
  const players = build(
    [el({ id: 1, total_points: 30 }), el({ id: 2, total_points: 50 }), el({ id: 3, total_points: 50 }), el({ id: 4, total_points: 10 })],
    [],
  );
  it("ranks by the stat descending, ties by id, and limits to N", () => {
    expect(topByStat(players, "total_points", 3).map((p) => p.id)).toEqual([2, 3, 1]);
  });
  it("ignores players whose value is null", () => {
    expect(topByStat(players, "xpts_total", 10)).toEqual([]);
  });
});

describe("median", () => {
  it("odd, even, and ignores nulls", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null, 5, null, 1, 3])).toBe(3);
  });
  it("null when empty", () => {
    expect(median([])).toBeNull();
    expect(median([null])).toBeNull();
  });
});

describe("scales and ticks", () => {
  it("linear maps min to 0 and max to 1 and inverts", () => {
    const s = makeScale("linear", 10, 30);
    expect(s.forward(10)).toBe(0);
    expect(s.forward(30)).toBe(1);
    expect(s.forward(20)).toBe(0.5);
    expect(s.inverse(0.5)).toBe(20);
  });
  it("sqrt is monotonic, spreads small values, and inverts", () => {
    const s = makeScale("sqrt", 0, 100);
    expect(s.forward(0)).toBe(0);
    expect(s.forward(100)).toBe(1);
    expect(s.forward(25)).toBeCloseTo(0.5, 10);
    let last = -1;
    for (let v = 0; v <= 100; v += 5) {
      const t = s.forward(v);
      expect(t).toBeGreaterThan(last);
      last = t;
    }
    expect(s.inverse(s.forward(37))).toBeCloseTo(37, 8);
  });
  it("sqrt handles negative values (luck stats) symmetrically", () => {
    const s = makeScale("sqrt", -9, 9);
    expect(s.forward(0)).toBeCloseTo(0.5, 10);
    expect(s.forward(-4)).toBeCloseTo(1 - s.forward(4), 10);
    expect(s.inverse(s.forward(-6))).toBeCloseTo(-6, 8);
  });
  it("a zero-width domain does not divide by zero", () => {
    expect(makeScale("linear", 5, 5).forward(5)).toBe(0.5);
    expect(makeScale("sqrt", 5, 5).forward(5)).toBe(0.5);
  });
  it("nice ticks are round numbers inside the nice domain", () => {
    const [lo, hi] = niceDomain(9.7, 31.2, 6);
    expect(lo).toBeLessThanOrEqual(9.7);
    expect(hi).toBeGreaterThanOrEqual(31.2);
    const t = niceTicks(lo, hi, 6);
    expect(t[0]).toBe(lo);
    expect(t[t.length - 1]).toBe(hi);
    const step = t[1] - t[0];
    expect([1, 2, 2.5, 5, 10].some((m) => Math.abs(step / (10 ** Math.floor(Math.log10(step))) - m) < 1e-9)).toBe(true);
    for (const v of t) expect(v).toBeGreaterThanOrEqual(lo);
  });
  it("nice domain of a single value is still a usable range", () => {
    const [lo, hi] = niceDomain(5, 5, 5);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("declutterLabels", () => {
  const bounds = { width: 400, height: 300 };
  const pt = (id: number, x: number, y: number, priority = id) => ({ id, x, y, w: 60, h: 14, priority, r: 5 });
  const rect = (p: { x: number; y: number; w: number; h: number }, side: string) => {
    const gap = 8;
    switch (side) {
      case "right": return { x: p.x + gap, y: p.y - p.h / 2, w: p.w, h: p.h };
      case "left": return { x: p.x - gap - p.w, y: p.y - p.h / 2, w: p.w, h: p.h };
      case "above": return { x: p.x - p.w / 2, y: p.y - gap - p.h, w: p.w, h: p.h };
      default: return { x: p.x - p.w / 2, y: p.y + gap, w: p.w, h: p.h };
    }
  };
  const overlap = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it("labels an isolated point on its preferred side (right)", () => {
    const res = declutterLabels([pt(1, 100, 100)], bounds);
    expect(res.get(1)).toBe("right");
  });
  it("flips to the left when the right side would leave the chart", () => {
    const res = declutterLabels([pt(1, 380, 100)], bounds);
    expect(res.get(1)).toBe("left");
  });
  it("never shows two overlapping labels", () => {
    const points = Array.from({ length: 30 }, (_, i) => pt(i + 1, 150 + (i % 6) * 18, 100 + Math.floor(i / 6) * 9));
    const res = declutterLabels(points, bounds);
    const shown = points.filter((p) => res.get(p.id));
    for (let i = 0; i < shown.length; i++) {
      for (let j = i + 1; j < shown.length; j++) {
        expect(overlap(rect(shown[i], res.get(shown[i].id)!), rect(shown[j], res.get(shown[j].id)!))).toBe(false);
      }
    }
  });
  it("gives the label to the higher-priority (lower number) point when two collide", () => {
    const res = declutterLabels([pt(2, 100.5, 100, 2), pt(1, 100, 100, 1)], bounds);
    expect(res.get(1)).not.toBeNull();
    // the other one either found another free side or is hidden, but never takes the first one's spot
    const second = res.get(2);
    if (second) expect(overlap(rect(pt(2, 100.5, 100), second), rect(pt(1, 100, 100), res.get(1)!))).toBe(false);
  });
  it("keeps labels out of blocked areas (corner captions)", () => {
    // right-hand label for a point at (100,100) would span x 108..168; block that area
    const res = declutterLabels([pt(1, 100, 100)], bounds, [{ x: 100, y: 90, w: 80, h: 20 }]);
    expect(res.get(1)).toBe("left");
    // block every side -> no label
    const none = declutterLabels([pt(1, 100, 100)], bounds, [{ x: 0, y: 0, w: 400, h: 300 }]);
    expect(none.get(1)).toBeNull();
  });
  it("lets the top-priority points label over a blocked area when nothing else is free", () => {
    const blockedAll = [{ x: 0, y: 0, w: 400, h: 300 }];
    const res = declutterLabels([pt(1, 100, 100, 1), pt(2, 300, 200, 9)], bounds, blockedAll, 1);
    expect(res.get(1)).not.toBeNull(); // top priority overrides the blocked area
    expect(res.get(2)).toBeNull(); // the rest still respect it
  });
  it("hides labels that have no free space", () => {
    const crowded = Array.from({ length: 40 }, (_, i) => pt(i + 1, 200, 150));
    const res = declutterLabels(crowded, bounds);
    expect([...res.values()].filter(Boolean).length).toBeLessThan(40);
    expect(res.get(1)).not.toBeNull();
  });
});

describe("URL state", () => {
  it("round-trips", () => {
    const state = { ...DEFAULT_PLOT_STATE, x: "price", y: "xpts_per_m", positions: ["DEF", "MID"] as any, top: 40, from: 9, to: 12, xScale: "sqrt" as const, yScale: "linear" as const, minMinutes: 300, maxPrice: 8.5, teamIds: [1, 15], median: false };
    const decoded = decodePlotState(encodePlotState(state));
    expect(decoded).toEqual(state);
  });
  it("encodes only what differs from the defaults", () => {
    expect(encodePlotState(DEFAULT_PLOT_STATE)).toBe("");
    expect(encodePlotState({ ...DEFAULT_PLOT_STATE, top: 30 })).toBe("top=30");
  });
  it("invalid or unknown values fall back to defaults", () => {
    const d = decodePlotState("x=nope&y=&pos=ZZZ,DEF&top=-5&from=abc&xs=weird&mins=-1&maxp=x&team=a,3");
    const base = presetBaseline(["DEF"]);
    expect(d.x).toBe(base.x);
    expect(d.y).toBe(base.y);
    expect(d.positions).toEqual(["DEF"]);
    expect(d.top).toBe(DEFAULT_PLOT_STATE.top);
    expect(d.from).toBe(DEFAULT_PLOT_STATE.from);
    expect(d.xScale).toBe(base.xScale);
    expect(d.minMinutes).toBe(base.minMinutes);
    expect(d.maxPrice).toBeNull();
    expect(d.teamIds).toEqual([3]);
  });
  it("clamps top to 5..100", () => {
    expect(decodePlotState("top=1").top).toBe(5);
    expect(decodePlotState("top=999").top).toBe(100);
  });
  it("accepts a leading ?", () => {
    expect(decodePlotState("?x=price").x).toBe("price");
  });
});

describe("registry", () => {
  it("stat keys are unique and every preset refers to real stats", () => {
    const keys = PLOT_STATS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of PLOT_PRESETS) {
      expect(getStat(p.x)).toBeDefined();
      expect(getStat(p.y)).toBeDefined();
    }
  });
  it("the default axes are real stats", () => {
    expect(getStat(DEFAULT_PLOT_STATE.x)).toBeDefined();
    expect(getStat(DEFAULT_PLOT_STATE.y)).toBeDefined();
  });
});

describe("quadrantPicks", () => {
  // x = ownership, y = total points; medians given explicitly
  const players = build(
    [
      el({ id: 1, selected_by_percent: "2.0", total_points: 50 }),   // top-left, strong
      el({ id: 2, selected_by_percent: "8.0", total_points: 41 }),   // top-left, weaker
      el({ id: 3, selected_by_percent: "60.0", total_points: 10 }),  // bottom-right, strong avoid
      el({ id: 4, selected_by_percent: "30.0", total_points: 30 }),  // bottom-right, milder
      el({ id: 5, selected_by_percent: "70.0", total_points: 60 }),  // top-right
      el({ id: 6, selected_by_percent: "1.0", total_points: 5 }),    // bottom-left
    ],
    [],
  );
  const picks = quadrantPicks(players, "ownership", "total_points", 25, 35, 3);
  it("top-left = low x, high y, best first", () => {
    expect(picks.tl.map((p) => p.id)).toEqual([1, 2]);
  });
  it("bottom-right = high x, low y, worst first", () => {
    expect(picks.br.map((p) => p.id)).toEqual([3, 4]);
  });
  it("limits to n and skips players missing either value", () => {
    expect(quadrantPicks(players, "ownership", "total_points", 25, 35, 1).tl).toHaveLength(1);
    const noProj = quadrantPicks(players, "ownership", "xpts_total", 25, 35, 3);
    expect(noProj.tl).toEqual([]);
    expect(noProj.br).toEqual([]);
  });
});

describe("new stats", () => {
  const [p] = build([el({ saves_per_90: 3.2, clean_sheets_per_90: 0.4, expected_goals_conceded_per_90: 1.05, goals_conceded_per_90: 0.8, defensive_contribution: 41 })], []);
  it("come straight from the FPL fields", () => {
    expect(p.values.saves_90).toBe(3.2);
    expect(p.values.cs_90).toBe(0.4);
    expect(p.values.xgc_90).toBe(1.05);
    expect(p.values.gc_90).toBe(0.8);
    expect(p.values.dc).toBe(41);
  });
});

describe("position presets", () => {
  it("no or several positions show the general presets, differentials first", () => {
    expect(presetsForPositions([])[0].id).toBe("differentials");
    expect(presetsForPositions(["DEF", "MID"])[0].id).toBe("differentials");
    expect(presetsForPositions([]).every((p) => p.positions.length === 0)).toBe(true);
  });
  it("one position shows only that position's presets, default first", () => {
    for (const pos of PLOT_POSITIONS) {
      const list = presetsForPositions([pos]);
      expect(list.length).toBeGreaterThanOrEqual(3);
      expect(list.every((p) => p.positions.length === 1 && p.positions[0] === pos)).toBe(true);
    }
  });
  it("each position opens on a different default graph", () => {
    const defaults = PLOT_POSITIONS.map((pos) => {
      const b = presetBaseline([pos]);
      return `${b.x}|${b.y}`;
    });
    expect(new Set(defaults).size).toBe(PLOT_POSITIONS.length);
  });
  it("preset ids are unique and every preset uses real stats", () => {
    const ids = PLOT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PLOT_PRESETS) {
      expect(getStat(p.x), p.id).toBeDefined();
      expect(getStat(p.y), p.id).toBeDefined();
    }
  });
  it("per-90 presets set a minutes floor so tiny samples do not dominate", () => {
    for (const p of PLOT_PRESETS) {
      const per90 = [p.x, p.y].some((k) => /_90$/.test(k));
      if (per90) expect(p.minMinutes ?? 0, p.id).toBeGreaterThan(0);
    }
  });
  it("stateForPreset applies axes, scales and minutes floor but keeps other filters", () => {
    const base = { ...DEFAULT_PLOT_STATE, teamIds: [3], maxPrice: 7, top: 40 };
    const preset = PLOT_PRESETS.find((p) => p.id === "def-attack")!;
    const next = stateForPreset(base, preset);
    expect([next.x, next.y, next.xScale, next.yScale, next.minMinutes]).toEqual([preset.x, preset.y, preset.xScale, preset.yScale, preset.minMinutes ?? 0]);
    expect([next.teamIds, next.maxPrice, next.top]).toEqual([[3], 7, 40]);
    expect(next.positions).toEqual(["DEF"]);
  });
  it("a general preset leaves the chosen positions alone", () => {
    const next = stateForPreset({ ...DEFAULT_PLOT_STATE, positions: ["DEF", "MID"] }, PLOT_PRESETS.find((p) => p.id === "value")!);
    expect(next.positions).toEqual(["DEF", "MID"]);
  });
  it("stateForPosition selects the position and opens its default graph; null returns to All", () => {
    const def = stateForPosition({ ...DEFAULT_PLOT_STATE, top: 40 }, "DEF");
    const b = presetBaseline(["DEF"]);
    expect(def.positions).toEqual(["DEF"]);
    expect([def.x, def.y]).toEqual([b.x, b.y]);
    expect(def.top).toBe(40);
    const all = stateForPosition(def, null);
    expect(all.positions).toEqual([]);
    expect([all.x, all.y]).toEqual([DEFAULT_PLOT_STATE.x, DEFAULT_PLOT_STATE.y]);
  });
});

describe("URL state with position defaults", () => {
  it("a single position with no axes in the link opens that position's default graph", () => {
    const d = decodePlotState("pos=GKP");
    const b = presetBaseline(["GKP"]);
    expect([d.x, d.y, d.xScale, d.yScale, d.minMinutes]).toEqual([b.x, b.y, b.xScale, b.yScale, b.minMinutes]);
  });
  it("a position at its default graph encodes as just the position and round-trips", () => {
    const s = stateForPosition(DEFAULT_PLOT_STATE, "MID");
    expect(encodePlotState(s)).toBe("pos=MID");
    expect(decodePlotState("pos=MID")).toEqual(s);
  });
  it("an off-default graph for a position keeps its axes in the link", () => {
    const s = { ...stateForPosition(DEFAULT_PLOT_STATE, "FWD"), x: "price", y: "form" };
    const decoded = decodePlotState(encodePlotState(s));
    expect(decoded).toEqual(s);
  });
  it("going back to the general graph while a position is selected also round-trips", () => {
    const s = { ...DEFAULT_PLOT_STATE, positions: ["DEF"] as any };
    expect(decodePlotState(encodePlotState(s))).toEqual(s);
  });
});

describe("more quick views", () => {
  const ids = (positions: Array<"GKP" | "DEF" | "MID" | "FWD">) => presetsForPositions(positions).map((p) => p.id);

  it("the default graph of every list is unchanged", () => {
    expect(ids([])[0]).toBe("differentials");
    expect(ids(["GKP"])[0]).toBe("gk-value");
    expect(ids(["DEF"])[0]).toBe("def-attack");
    expect(ids(["MID"])[0]).toBe("mid-creators");
    expect(ids(["FWD"])[0]).toBe("fwd-finishing");
  });

  it("the general list offers market movers, form vs projection, in-form differentials, season value, points per 90 and bonus", () => {
    for (const id of ["market", "form-xpts", "form-diff", "season-value", "efficiency", "bonus"]) expect(ids([]), id).toContain(id);
    expect(presetsForPositions([]).length).toBeGreaterThanOrEqual(10);
  });

  it("each position list has at least seven quick views, including form, season value and minutes", () => {
    for (const pos of PLOT_POSITIONS) {
      const list = presetsForPositions([pos]);
      expect(list.length, pos).toBeGreaterThanOrEqual(7);
      const axes = list.map((p) => `${p.x}|${p.y}`);
      expect(axes, pos).toContain("price|form");
      expect(axes, pos).toContain("price|total_points");
      expect(axes, pos).toContain("xmins_avg|xpts_avg");
    }
  });

  it("no two quick views in one list plot the same pair of stats (each is found by its axes)", () => {
    for (const positions of [[], ["GKP"], ["DEF"], ["MID"], ["FWD"]] as Array<Array<"GKP" | "DEF" | "MID" | "FWD">>) {
      const keys = presetsForPositions(positions).map((p) => `${p.x}|${p.y}`);
      expect(new Set(keys).size, positions.join() || "all").toBe(keys.length);
    }
  });

  it("market movers plots net transfers against projected points", () => {
    const p = PLOT_PRESETS.find((x) => x.id === "market")!;
    expect([p.x, p.y]).toEqual(["net_transfers", "xpts_total"]);
  });

  it("every quick view has a title, a label short enough for a pill, and a hint", () => {
    for (const p of PLOT_PRESETS) {
      expect(p.title.length, p.id).toBeGreaterThan(5);
      expect(p.label.length, p.id).toBeLessThanOrEqual(26);
      expect(p.hint.length, p.id).toBeGreaterThan(20);
    }
  });
});
