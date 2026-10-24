import { describe, it, expect } from "vitest";
import {
  COLOR_MODES,
  DEFAULT_PLOT_STATE,
  SIZE_MODES,
  colorCategory,
  colorLegend,
  decodePlotState,
  dotRadius,
  encodePlotState,
  fitLine,
  mineRows,
  parseManagerId,
  sizeValue,
  trendOutliers,
  withMine,
  type PlotPlayer,
} from "../shared/player-plot";

const pl = (over: Partial<PlotPlayer> & { id: number }): PlotPlayer => ({
  name: `P${over.id}`,
  teamId: 1,
  teamShort: "ARS",
  position: "MID",
  available: true,
  status: "a",
  minutes: 900,
  price: 7.5,
  ownership: 12,
  values: { xg: 1, xpts_total: 10 },
  ...over,
});

describe("link state: my team, colour, size, trend", () => {
  it("defaults are not written to the link and decode back", () => {
    expect(encodePlotState(DEFAULT_PLOT_STATE)).toBe("");
    const d = decodePlotState("");
    expect(d).toMatchObject({ mine: "", color: "club", size: "none", trend: false });
  });

  it("round trips each new setting", () => {
    const s = { ...DEFAULT_PLOT_STATE, mine: "577434", color: "position" as const, size: "ownership" as const, trend: true };
    const q = encodePlotState(s);
    expect(q).toContain("my=577434");
    expect(q).toContain("cb=position");
    expect(q).toContain("sz=ownership");
    expect(q).toContain("tr=1");
    expect(decodePlotState(q)).toMatchObject({ mine: "577434", color: "position", size: "ownership", trend: true });
  });

  it("junk values fall back to the defaults", () => {
    const d = decodePlotState("my=abc&cb=rainbow&sz=huge&tr=maybe");
    expect(d).toMatchObject({ mine: "", color: "club", size: "none", trend: false });
    expect(decodePlotState("my=0").mine).toBe("");
    expect(decodePlotState("my=123456789012").mine).toBe("");
  });

  it("parseManagerId accepts digits or an FPL entry link", () => {
    expect(parseManagerId("577434")).toBe("577434");
    expect(parseManagerId(" 577434 ")).toBe("577434");
    expect(parseManagerId("https://fantasy.premierleague.com/entry/577434/event/8")).toBe("577434");
    expect(parseManagerId("")).toBe("");
    expect(parseManagerId("hello")).toBe("");
    expect(parseManagerId("0")).toBe("");
  });
});

describe("colour and size modes", () => {
  it("lists the modes the page offers", () => {
    expect(COLOR_MODES.map((m) => m.id)).toEqual(["club", "position", "price", "ownership"]);
    expect(SIZE_MODES.map((m) => m.id)).toEqual(["none", "ownership", "price", "minutes"]);
  });

  it("colour categories: position, price band, ownership band", () => {
    expect(colorCategory(pl({ id: 1, position: "FWD" }), "position")).toBe("FWD");
    expect(colorCategory(pl({ id: 1, price: 4.9 }), "price")).toBe("p1");
    expect(colorCategory(pl({ id: 1, price: 5.0 }), "price")).toBe("p2");
    expect(colorCategory(pl({ id: 1, price: 6.9 }), "price")).toBe("p2");
    expect(colorCategory(pl({ id: 1, price: 7.0 }), "price")).toBe("p3");
    expect(colorCategory(pl({ id: 1, price: 10.0 }), "price")).toBe("p4");
    expect(colorCategory(pl({ id: 1, ownership: 4.9 }), "ownership")).toBe("o1");
    expect(colorCategory(pl({ id: 1, ownership: 15 }), "ownership")).toBe("o3");
    expect(colorCategory(pl({ id: 1, ownership: 30 }), "ownership")).toBe("o4");
    expect(colorCategory(pl({ id: 1 }), "club")).toBeNull();
  });

  it("every category has a legend entry with a distinct colour; club has no legend", () => {
    for (const mode of ["position", "price", "ownership"] as const) {
      const legend = colorLegend(mode);
      expect(legend.length).toBeGreaterThanOrEqual(4);
      expect(new Set(legend.map((l) => l.color)).size).toBe(legend.length);
      for (const l of legend) expect(l.label.length).toBeGreaterThan(0);
    }
    expect(colorLegend("club")).toEqual([]);
    const cats = (["position", "price", "ownership"] as const).flatMap((m) => colorLegend(m).map((l) => l.key));
    expect(colorCategory(pl({ id: 1, position: "GKP" }), "position")).toBe(colorLegend("position")[0].key);
    expect(new Set(cats).size).toBe(cats.length);
  });

  it("sizeValue reads the chosen stat", () => {
    const p = pl({ id: 1, ownership: 40, price: 11, minutes: 1800 });
    expect(sizeValue(p, "ownership")).toBe(40);
    expect(sizeValue(p, "price")).toBe(11);
    expect(sizeValue(p, "minutes")).toBe(1800);
    expect(sizeValue(p, "none")).toBeNull();
  });

  it("dotRadius: base size with no size mode; otherwise grows with the value between 0.7x and 1.9x the base", () => {
    expect(dotRadius(null, 0, 100, 6)).toBe(6);
    expect(dotRadius(0, 0, 100, 6)).toBeCloseTo(4.2, 5);
    expect(dotRadius(100, 0, 100, 6)).toBeCloseTo(11.4, 5);
    expect(dotRadius(25, 0, 100, 6)).toBeGreaterThan(dotRadius(10, 0, 100, 6));
    expect(dotRadius(50, 10, 10, 6)).toBe(6); // no spread: all the same size
    expect(dotRadius(500, 0, 100, 6)).toBeCloseTo(11.4, 5); // clamped
  });
});

describe("fitLine and trendOutliers", () => {
  it("fits a straight line and reports how well it fits", () => {
    const f = fitLine([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }, { x: 4, y: 9 }])!;
    expect(f.slope).toBeCloseTo(2, 10);
    expect(f.intercept).toBeCloseTo(1, 10);
    expect(f.r2).toBeCloseTo(1, 10);
    expect(f.n).toBe(4);
  });

  it("r2 is lower for a scattered cloud", () => {
    const f = fitLine([{ x: 1, y: 1 }, { x: 2, y: 5 }, { x: 3, y: 2 }, { x: 4, y: 6 }, { x: 5, y: 3 }])!;
    expect(f.r2).toBeGreaterThan(0);
    expect(f.r2).toBeLessThan(0.5);
  });

  it("no line from fewer than three points or when x never changes", () => {
    expect(fitLine([])).toBeNull();
    expect(fitLine([{ x: 1, y: 1 }, { x: 2, y: 2 }])).toBeNull();
    expect(fitLine([{ x: 2, y: 1 }, { x: 2, y: 5 }, { x: 2, y: 9 }])).toBeNull();
  });

  it("outliers: the players furthest above and below the line, largest first, with their distance", () => {
    const line = { slope: 1, intercept: 0, r2: 0.5, n: 5 };
    const players = [
      pl({ id: 1, values: { a: 1, b: 1 } }),   // on the line
      pl({ id: 2, values: { a: 2, b: 6 } }),   // +4
      pl({ id: 3, values: { a: 3, b: 4 } }),   // +1
      pl({ id: 4, values: { a: 4, b: 0 } }),   // -4
      pl({ id: 5, values: { a: 5, b: 3 } }),   // -2
      pl({ id: 6, values: { a: null, b: 9 } }), // missing x: ignored
    ];
    const out = trendOutliers(players, "a", "b", line, 2);
    expect(out.above.map((o) => o.player.id)).toEqual([2, 3]);
    expect(out.above[0].residual).toBeCloseTo(4, 10);
    expect(out.below.map((o) => o.player.id)).toEqual([4, 5]);
    expect(out.below[0].residual).toBeCloseTo(-4, 10);
  });
});

describe("my team", () => {
  const all = [
    pl({ id: 1, values: { xg: 1, xpts_total: 10 } }),
    pl({ id: 2, values: { xg: 2, xpts_total: 20 } }),
    pl({ id: 3, values: { xg: 3, xpts_total: 30 } }),
    pl({ id: 4, values: { xg: null, xpts_total: 5 } }),
  ];

  it("withMine adds squad players that are not on the chart, keeping the rest first", () => {
    const shown = [all[0]];
    const out = withMine(shown, all, new Set([2, 3]), "xg", "xpts_total");
    expect(out.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("withMine leaves players already shown alone and skips squad players missing a stat", () => {
    const out = withMine([all[0], all[1]], all, new Set([2, 4]), "xg", "xpts_total");
    expect(out.map((p) => p.id)).toEqual([1, 2]);
  });

  it("an empty squad changes nothing", () => {
    const shown = [all[0]];
    expect(withMine(shown, all, new Set(), "xg", "xpts_total")).toBe(shown);
  });

  it("mineRows lists the squad best-first by the vertical stat and says who is on the chart", () => {
    const rows = mineRows(all, new Set([1, 3, 4]), "xg", "xpts_total", new Set([1]));
    expect(rows.map((r) => r.player.id)).toEqual([3, 1, 4]);
    expect(rows[0]).toMatchObject({ x: 3, y: 30, onChart: false });
    expect(rows[1]).toMatchObject({ x: 1, y: 10, onChart: true });
    expect(rows[2]).toMatchObject({ x: null, y: 5, onChart: false });
  });
});

import { plotCsv } from "../shared/player-plot";

describe("plotCsv (the plotted players as a spreadsheet)", () => {
  const rows = [
    pl({ id: 1, name: "Haaland", teamShort: "MCI", position: "FWD", price: 15.7, ownership: 76.9, values: { xg: 6.2, xpts_total: 30.5 } }),
    pl({ id: 2, name: "Saka, B.", teamShort: "ARS", position: "MID", price: 10.1, ownership: 31.4, available: false, values: { xg: null, xpts_total: 22 } }),
    pl({ id: 3, name: "Cherki", teamShort: "MCI", position: "MID", price: 8, ownership: 39, values: { xg: 2, xpts_total: 33.7 } }),
  ];

  it("has a header with the plotted stats' names, then one row per player, best first by the vertical stat", () => {
    const lines = plotCsv(rows, "xg", "xpts_total", new Set()).split("\r\n");
    expect(lines[0]).toBe('Player,Team,Position,Price (£m),Ownership (%),Expected goals (xG),"Projected points (xPts, range total)",Your team,Available');
    expect(lines).toHaveLength(4);
    expect(lines[1].startsWith("Cherki,MCI,MID,8,39,2,33.7")).toBe(true);
    expect(lines[2].startsWith("Haaland,MCI,FWD,15.7,76.9,6.2,30.5")).toBe(true);
  });

  it("writes raw numbers, leaves a missing stat empty (never 0), quotes names with commas", () => {
    const lines = plotCsv(rows, "xg", "xpts_total", new Set()).split("\r\n");
    expect(lines[3]).toBe('"Saka, B.",ARS,MID,10.1,31.4,,22,No,No');
  });

  it("marks the squad when a team is shown", () => {
    const lines = plotCsv(rows, "xg", "xpts_total", new Set([1])).split("\r\n");
    expect(lines.find((l) => l.startsWith("Haaland"))).toContain(",Yes,");
    expect(lines.find((l) => l.startsWith("Cherki"))).toContain(",No,");
  });
});

describe("plotCsv polish", () => {
  const one = [pl({ id: 1, name: "Isak", price: 9, ownership: 14, values: { xpts_total: 25.759999999999998, xg: 1.23456789, price: 9, ownership: 14 } })];

  it("rounds away floating-point noise", () => {
    const line = plotCsv(one, "xg", "xpts_total", new Set()).split("\r\n")[1];
    expect(line).toContain(",1.2346,25.76,");
    expect(line).not.toContain("25.7599");
  });

  it("does not repeat price or ownership when one is an axis", () => {
    const header = plotCsv(one, "ownership", "xpts_total", new Set()).split("\r\n")[0];
    expect(header.match(/Ownership/g)).toHaveLength(1);
    expect(plotCsv(one, "ownership", "price", new Set()).split("\r\n")[0]).toBe("Player,Team,Position,Price (£m),Ownership (%),Your team,Available");
  });
});

describe("image headline in the link", () => {
  it("is empty by default and round trips", () => {
    expect(decodePlotState("").headline).toBe("");
    expect(encodePlotState(DEFAULT_PLOT_STATE)).toBe("");
    const q = encodePlotState({ ...DEFAULT_PLOT_STATE, headline: "Who to buy for GW9 & why" });
    expect(decodePlotState(q).headline).toBe("Who to buy for GW9 & why");
  });

  it("is cut to 60 characters and control characters are dropped", () => {
    expect(decodePlotState(`h=${"x".repeat(100)}`).headline.length).toBe(60);
    expect(decodePlotState("h=Hello%00%0AWorld").headline).toBe("Hello World");
  });
});
