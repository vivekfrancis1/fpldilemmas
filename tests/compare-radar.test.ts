import { describe, it, expect } from "vitest";
import {
  RADAR_AXES,
  DEFAULT_RADAR_AXES,
  MIN_RADAR_AXES,
  MAX_RADAR_AXES,
  MIN_RADAR_MINUTES,
  radarValue,
  buildRadarSeries,
  polarPoint,
  parseRadarAxes,
  encodeRadarAxes,
  type RadarElement,
} from "../shared/compare-radar";

const el = (over: Partial<RadarElement> = {}): RadarElement => ({
  minutes: 900,
  total_points: 90,
  goals_scored: 9,
  assists: 4,
  bonus: 18,
  threat: "450.0",
  creativity: "270.0",
  influence: "360.0",
  expected_goals_per_90: 0.5,
  expected_assists_per_90: 0.2,
  expected_goal_involvements_per_90: 0.7,
  defensive_contribution_per_90: 1.5,
  ...over,
});

describe("radar axes registry", () => {
  it("has unique keys and the default set is valid", () => {
    const keys = RADAR_AXES.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(DEFAULT_RADAR_AXES.length).toBeGreaterThanOrEqual(MIN_RADAR_AXES);
    expect(DEFAULT_RADAR_AXES.length).toBeLessThanOrEqual(MAX_RADAR_AXES);
    for (const k of DEFAULT_RADAR_AXES) expect(keys).toContain(k);
  });
  it("offers no axis the FPL API cannot supply (no big chances / key passes / box touches)", () => {
    const text = RADAR_AXES.map((a) => `${a.key} ${a.label}`).join(" ").toLowerCase();
    for (const banned of ["big chance", "key pass", "box touch", "corner"]) expect(text).not.toContain(banned);
  });
});

describe("radarValue", () => {
  it("passes through FPL per-90 fields", () => {
    expect(radarValue("xg_90", el(), null)).toBe(0.5);
    expect(radarValue("xa_90", el(), null)).toBe(0.2);
    expect(radarValue("xgi_90", el(), null)).toBe(0.7);
    expect(radarValue("dc_90", el(), null)).toBe(1.5);
  });
  it("computes exact per-90 ratios from season totals", () => {
    expect(radarValue("threat_90", el(), null)).toBeCloseTo(45, 6); // 450 / 900 * 90
    expect(radarValue("creativity_90", el(), null)).toBeCloseTo(27, 6);
    expect(radarValue("influence_90", el(), null)).toBeCloseTo(36, 6);
    expect(radarValue("goals_90", el(), null)).toBeCloseTo(0.9, 6);
    expect(radarValue("assists_90", el(), null)).toBeCloseTo(0.4, 6);
    expect(radarValue("bonus_90", el(), null)).toBeCloseTo(1.8, 6);
    expect(radarValue("points_90", el(), null)).toBeCloseTo(9, 6);
  });
  it("returns the supplied xPts per gameweek for the projection axis", () => {
    expect(radarValue("xpts_gw", el(), 5.25)).toBe(5.25);
    expect(radarValue("xpts_gw", el(), null)).toBeNull();
  });
  it("gives null for per-90 axes below the minutes floor, but not for xPts", () => {
    const small = el({ minutes: MIN_RADAR_MINUTES - 1 });
    for (const k of ["xg_90", "threat_90", "goals_90", "points_90", "dc_90"]) expect(radarValue(k, small, 4)).toBeNull();
    expect(radarValue("xpts_gw", small, 4)).toBe(4);
  });
  it("allows exactly the minutes floor", () => {
    expect(radarValue("goals_90", el({ minutes: MIN_RADAR_MINUTES, goals_scored: 2 }), null)).toBeCloseTo(1, 6);
  });
  it("is null for unknown keys and unparsable strings", () => {
    expect(radarValue("nope", el(), 1)).toBeNull();
    expect(radarValue("threat_90", el({ threat: "" }), null)).toBeNull();
  });
});

describe("buildRadarSeries", () => {
  const players = [
    { id: 1, element: el({ expected_goals_per_90: 0.8 }), xptsPerGw: 6 },
    { id: 2, element: el({ expected_goals_per_90: 0.4 }), xptsPerGw: 3 },
    { id: 3, element: el({ minutes: 50 }), xptsPerGw: null },
  ];
  const out = buildRadarSeries(players, ["xg_90", "xpts_gw"]);

  it("returns one value per axis per player in input order", () => {
    expect(out.series.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(out.series[0].raw).toEqual([0.8, 6]);
    expect(out.axes.map((a) => a.key)).toEqual(["xg_90", "xpts_gw"]);
  });
  it("scales so the best player on each axis is exactly 1 and others are proportional", () => {
    expect(out.series[0].scaled).toEqual([1, 1]);
    expect(out.series[1].scaled[0]).toBeCloseTo(0.5, 6);
    expect(out.series[1].scaled[1]).toBeCloseTo(0.5, 6);
  });
  it("plots missing values at 0 and keeps raw null", () => {
    expect(out.series[2].raw).toEqual([null, null]);
    expect(out.series[2].scaled).toEqual([0, 0]);
  });
  it("ignores missing values when finding the maximum", () => {
    expect(out.max).toEqual([0.8, 6]);
  });
  it("scales to 0 when every value on an axis is 0 or missing", () => {
    const z = buildRadarSeries([{ id: 1, element: el({ expected_goals_per_90: 0 }), xptsPerGw: 0 }], ["xg_90", "xpts_gw"]);
    expect(z.series[0].scaled).toEqual([0, 0]);
  });
  it("drops unknown axis keys", () => {
    expect(buildRadarSeries(players, ["xg_90", "bogus"]).axes.map((a) => a.key)).toEqual(["xg_90"]);
  });
});

describe("polarPoint", () => {
  it("puts axis 0 straight up and goes clockwise", () => {
    const p0 = polarPoint(100, 100, 50, 0, 4);
    expect(p0.x).toBeCloseTo(100, 6);
    expect(p0.y).toBeCloseTo(50, 6);
    const p1 = polarPoint(100, 100, 50, 1, 4);
    expect(p1.x).toBeCloseTo(150, 6);
    expect(p1.y).toBeCloseTo(100, 6);
    const p2 = polarPoint(100, 100, 50, 2, 4);
    expect(p2.x).toBeCloseTo(100, 6);
    expect(p2.y).toBeCloseTo(150, 6);
  });
  it("radius 0 is the centre", () => {
    const p = polarPoint(10, 20, 0, 3, 7);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(20, 6);
  });
});

describe("axis URL param", () => {
  it("round trips a custom selection in registry order", () => {
    const sel = ["bonus_90", "xg_90", "xa_90"];
    const decoded = parseRadarAxes(encodeRadarAxes(sel));
    expect(decoded).toEqual(["xg_90", "xa_90", "bonus_90"].sort((a, b) => RADAR_AXES.findIndex((x) => x.key === a) - RADAR_AXES.findIndex((x) => x.key === b)));
  });
  it("falls back to the default for missing, junk or too-short input", () => {
    expect(parseRadarAxes(null)).toEqual(DEFAULT_RADAR_AXES);
    expect(parseRadarAxes("")).toEqual(DEFAULT_RADAR_AXES);
    expect(parseRadarAxes("zzz,yyy")).toEqual(DEFAULT_RADAR_AXES);
    expect(parseRadarAxes("xg_90,xa_90")).toEqual(DEFAULT_RADAR_AXES);
  });
  it("dedupes, drops unknown keys and caps the count", () => {
    const all = RADAR_AXES.map((a) => a.key).join(",");
    expect(parseRadarAxes(all).length).toBe(MAX_RADAR_AXES);
    expect(parseRadarAxes("xg_90,xg_90,xa_90,bogus,threat_90")).toEqual(["xg_90", "xa_90", "threat_90"]);
  });
  it("encodes the default selection as an empty string so URLs stay short", () => {
    expect(encodeRadarAxes(DEFAULT_RADAR_AXES)).toBe("");
  });
});
