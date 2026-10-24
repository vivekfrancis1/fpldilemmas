import { describe, it, expect } from "vitest";
import { DEFAULT_SPEC, type GraphicElement, type GraphicSpec } from "../shared/graphics";
import { defaultSelectionPatch, easiestRunClubs, needsDefaults, type GraphicDefaultsContext } from "../shared/graphic-defaults";

const el = (id: number, over: Partial<GraphicElement> = {}): GraphicElement =>
  ({ id, web_name: `P${id}`, team: 1, element_type: 3, now_cost: 60, status: "a", selected_by_percent: "10.0", transfers_in_event: 0, news: "", ...over }) as GraphicElement;

const spec = (over: Partial<GraphicSpec> = {}): GraphicSpec => ({ ...DEFAULT_SPEC, ...over });

const baseCtx = (over: Partial<GraphicDefaultsContext> = {}): GraphicDefaultsContext => ({
  elements: [],
  totals: new Map(),
  fixtures: [],
  gameweek: 9,
  tickerRows: [],
  ...over,
});

describe("needsDefaults: only templates with an empty selection get defaults", () => {
  it("players templates: empty players", () => {
    for (const t of ["player-card", "cover", "player-news"] as const) {
      expect(needsDefaults(spec({ template: t }))).toBe(true);
      expect(needsDefaults(spec({ template: t, players: [5] }))).toBe(false);
    }
  });
  it("team templates: empty teams", () => {
    for (const t of ["predicted-lineup"] as const) {
      expect(needsDefaults(spec({ template: t }))).toBe(true);
      expect(needsDefaults(spec({ template: t, teams: [3] }))).toBe(false);
    }
  });
  it("comparisons need two to draw: one carried over from another template is not enough", () => {
    expect(needsDefaults(spec({ template: "player-comparison" }))).toBe(true);
    expect(needsDefaults(spec({ template: "player-comparison", players: [5] }))).toBe(true);
    expect(needsDefaults(spec({ template: "player-comparison", players: [5, 6] }))).toBe(false);
    expect(needsDefaults(spec({ template: "fixtures-comparison" }))).toBe(true);
    expect(needsDefaults(spec({ template: "fixtures-comparison", teams: [3] }))).toBe(true);
    expect(needsDefaults(spec({ template: "fixtures-comparison", teams: [3, 4] }))).toBe(false);
  });
  it("the others have nothing to default (they are data-driven, or Team Reveal loads the saved squad itself)", () => {
    for (const t of ["team-reveal", "captain-picks", "fixture-ticker", "transfer-trends", "team-of-the-week", "stat-leaders", "price-change", "top-differentials", "availability-watch"] as const) {
      expect(needsDefaults(spec({ template: t }))).toBe(false);
    }
  });
});

describe("Player Comparison: the three most transferred in this gameweek", () => {
  const elements = [
    el(1, { transfers_in_event: 500 }), el(2, { transfers_in_event: 900 }), el(3, { transfers_in_event: 200 }), el(4, { transfers_in_event: 100 }),
    el(5, { transfers_in_event: 5000, status: "i" }), el(6, { transfers_in_event: 0 }), el(7, { transfers_in_event: 0 }),
  ];
  const totals = new Map<number, number | null>([[6, 20], [7, 30], [1, 5], [2, 4], [3, 3], [4, 2]]);

  it("picks the top three by transfers in, skipping injured players", () => {
    expect(defaultSelectionPatch(spec({ template: "player-comparison" }), baseCtx({ elements, totals }))).toEqual({ players: [2, 1, 3] });
  });

  it("tops up from the best projections when fewer than three have transfers", () => {
    const few = [el(1, { transfers_in_event: 500 }), el(6), el(7), el(8)];
    const t = new Map<number, number | null>([[6, 20], [7, 30], [8, 10], [1, 99]]);
    expect(defaultSelectionPatch(spec({ template: "player-comparison" }), baseCtx({ elements: few, totals: t }))).toEqual({ players: [1, 7, 6] });
  });

  it("never repeats a player when topping up", () => {
    const few = [el(1, { transfers_in_event: 500 }), el(6)];
    const t = new Map<number, number | null>([[1, 99], [6, 20]]);
    const r = defaultSelectionPatch(spec({ template: "player-comparison" }), baseCtx({ elements: few, totals: t }));
    expect(r?.players).toEqual([1, 6]);
  });

  it("does nothing when the person already chose two or three players", () => {
    expect(defaultSelectionPatch(spec({ template: "player-comparison", players: [9, 8] }), baseCtx({ elements, totals }))).toBeNull();
  });

  it("keeps a single player carried over from another template and adds the trending ones up to three", () => {
    expect(defaultSelectionPatch(spec({ template: "player-comparison", players: [4] }), baseCtx({ elements, totals }))).toEqual({ players: [4, 2, 1] });
    expect(defaultSelectionPatch(spec({ template: "player-comparison", players: [2] }), baseCtx({ elements, totals }))).toEqual({ players: [2, 1, 3] });
  });

  it("does nothing until there is data", () => {
    expect(defaultSelectionPatch(spec({ template: "player-comparison" }), baseCtx())).toBeNull();
  });
});

describe("Player Card and Cover: the best projected players", () => {
  const elements = [el(1), el(2), el(3), el(4, { status: "s" }), el(5)];
  const totals = new Map<number, number | null>([[1, 10], [2, 30], [3, 20], [4, 99], [5, null]]);
  it("the card takes the single best projected, available player", () => {
    expect(defaultSelectionPatch(spec({ template: "player-card" }), baseCtx({ elements, totals }))).toEqual({ players: [2] });
  });
  it("the cover features the best three", () => {
    expect(defaultSelectionPatch(spec({ template: "cover" }), baseCtx({ elements, totals }))).toEqual({ players: [2, 3, 1] });
  });
  it("no projections yet: nothing is chosen (not a random player)", () => {
    expect(defaultSelectionPatch(spec({ template: "player-card" }), baseCtx({ elements, totals: new Map() }))).toBeNull();
  });
});

describe("Player News: the most newsworthy player, else the most transferred in", () => {
  it("prefers the most-owned player with real news", () => {
    const elements = [el(1, { status: "d", news: "Knock", selected_by_percent: "10.0" }), el(2, { status: "i", news: "Out", selected_by_percent: "40.0" }), el(3, { transfers_in_event: 900 })];
    expect(defaultSelectionPatch(spec({ template: "player-news" }), baseCtx({ elements }))).toEqual({ players: [2] });
  });
  it("falls back to the most transferred in when nobody has news", () => {
    const elements = [el(1, { transfers_in_event: 100 }), el(2, { transfers_in_event: 900 })];
    expect(defaultSelectionPatch(spec({ template: "player-news" }), baseCtx({ elements }))).toEqual({ players: [2] });
  });
});

describe("Predicted Lineups: the club whose match is next", () => {
  const fixtures = [
    { event: 9, team_h: 5, team_a: 6, finished: false, kickoff_time: "2026-10-25T14:00:00Z" },
    { event: 9, team_h: 3, team_a: 4, finished: false, kickoff_time: "2026-10-24T11:30:00Z" },
    { event: 8, team_h: 1, team_a: 2, finished: true, kickoff_time: "2026-10-18T14:00:00Z" },
  ];
  it("picks the home team of the earliest unfinished match from the chosen gameweek", () => {
    expect(defaultSelectionPatch(spec({ template: "predicted-lineup" }), baseCtx({ fixtures, gameweek: 9 }))).toEqual({ teams: [3] });
  });
  it("waits for fixtures; does nothing when a club was chosen", () => {
    expect(defaultSelectionPatch(spec({ template: "predicted-lineup" }), baseCtx({ fixtures: undefined }))).toBeNull();
    expect(defaultSelectionPatch(spec({ template: "predicted-lineup", teams: [7] }), baseCtx({ fixtures }))).toBeNull();
  });
});

describe("Fixtures Comparison: the four clubs with the easiest runs", () => {
  const rows = [
    { teamId: 1, short: "AAA", name: "Aaa", avgFdr: 3.4, cells: [] },
    { teamId: 2, short: "BBB", name: "Bbb", avgFdr: 2.6, cells: [] },
    { teamId: 3, short: "CCC", name: "Ccc", avgFdr: null, cells: [] },
    { teamId: 4, short: "DDD", name: "Ddd", avgFdr: 2.8, cells: [] },
    { teamId: 5, short: "EEE", name: "Eee", avgFdr: 2.8, cells: [] },
    { teamId: 6, short: "FFF", name: "Fff", avgFdr: 4.0, cells: [] },
  ];
  it("easiestRunClubs sorts by average difficulty, ignores clubs with no fixtures, ties by name", () => {
    expect(easiestRunClubs(rows as any, 3)).toEqual([2, 4, 5]);
    expect(easiestRunClubs(rows as any, 10)).toEqual([2, 4, 5, 1, 6]);
    expect(easiestRunClubs([], 3)).toEqual([]);
  });
  it("is the default for an empty selection, and waits for the grid", () => {
    expect(defaultSelectionPatch(spec({ template: "fixtures-comparison" }), baseCtx({ tickerRows: rows as any }))).toEqual({ teams: [2, 4, 5, 1] });
    expect(defaultSelectionPatch(spec({ template: "fixtures-comparison" }), baseCtx({ tickerRows: [] }))).toBeNull();
  });
  it("keeps a single club carried over from another template and adds the easiest runs up to four", () => {
    expect(defaultSelectionPatch(spec({ template: "fixtures-comparison", teams: [6] }), baseCtx({ tickerRows: rows as any }))).toEqual({ teams: [6, 2, 4, 5] });
    expect(defaultSelectionPatch(spec({ template: "fixtures-comparison", teams: [2] }), baseCtx({ tickerRows: rows as any }))).toEqual({ teams: [2, 4, 5, 1] });
  });
  it("does nothing when two or more clubs are chosen", () => {
    expect(defaultSelectionPatch(spec({ template: "fixtures-comparison", teams: [1, 6] }), baseCtx({ tickerRows: rows as any }))).toBeNull();
  });
});

describe("templates without defaults", () => {
  it("return null", () => {
    expect(defaultSelectionPatch(spec({ template: "captain-picks" }), baseCtx({ elements: [el(1)] }))).toBeNull();
    expect(defaultSelectionPatch(spec({ template: "team-reveal" }), baseCtx({ elements: [el(1)] }))).toBeNull();
  });
});
