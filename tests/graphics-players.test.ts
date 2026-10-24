import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC,
  GRAPHIC_TEMPLATES,
  buildCaption,
  decodeSpec,
  encodeSpec,
  footerNote,
  isEmptyGraphic,
  usesProjections,
  type GraphicElement,
  type GraphicSpec,
} from "../shared/graphics";
import { defaultSelectionPatch, needsDefaults } from "../shared/graphic-defaults";
import {
  PROJECTION_PARTS,
  buildPlayerHistory,
  buildPlayerProjections,
  buildTopScorers,
  defaultHistoryGameweeks,
  playerGraphicLink,
  resolveHistoryGameweeks,
  type HistoryRowInput,
  type LiveScorerInput,
  type PlayerProjectionInput,
} from "../shared/graphics-players";

const teamShortById = new Map<number, string>([[1, "ARS"], [2, "AVL"], [3, "LIV"], [4, "MCI"]]);

const el = (id: number, name: string, team: number, type: number, extra: Record<string, unknown> = {}): GraphicElement => ({
  id, web_name: name, team, element_type: type, now_cost: 70, selected_by_percent: "10.0", ...extra,
});

const elements: GraphicElement[] = [
  el(1, "Raya", 1, 1, { now_cost: 55 }), el(2, "Martinez", 2, 1, { now_cost: 50 }),
  el(3, "Saliba", 1, 2, { now_cost: 62 }), el(4, "Gabriel", 1, 2, { now_cost: 61 }), el(5, "Konate", 3, 2, { status: "d" }), el(6, "Gvardiol", 4, 2, { status: "i" }),
  el(7, "Saka", 1, 3, { now_cost: 100, selected_by_percent: "45.5" }), el(8, "Salah", 3, 3, { now_cost: 135 }), el(9, "Cherki", 4, 3),
  el(10, "Haaland", 4, 4, { now_cost: 150, selected_by_percent: "77.5" }), el(11, "Isak", 3, 4), el(12, "Watkins", 2, 4),
];

const proj = (id: number, perGw: Record<string, number>, parts: Record<string, Record<string, number>> = {}): PlayerProjectionInput =>
  ({ playerId: id, gameweekProjections: perGw, ...parts });

const projections: PlayerProjectionInput[] = [
  proj(1, { "9": 4.0, "10": 4.2 }, { pointsFromCleanSheets: { "9": 1.2, "10": 1.1 }, pointsFromSaves: { "9": 0.6, "10": 0.7 }, pointsFromBonus: { "9": 0.4, "10": 0.4 } }),
  proj(2, { "9": 3.8 }),
  proj(3, { "9": 4.5, "10": 4.1 }, { pointsFromCleanSheets: { "9": 1.4, "10": 1.2 }, pointsFromGoals: { "9": 0.5, "10": 0.4 }, pointsFromAssists: { "9": 0.2, "10": 0.1 }, pointsFromDefensiveContributions: { "9": 0.9, "10": 0.8 } }),
  proj(4, { "9": 4.5, "10": 4.1 }),
  proj(5, { "9": 3.0, "10": 3.0 }),
  proj(6, { "9": 9.9, "10": 9.9 }),
  proj(7, { "9": 6.1, "10": 6.4, "11": 50 }, { pointsFromGoals: { "9": 1.9, "10": 2.0, "11": 9 }, pointsFromAssists: { "9": 1.2, "10": 1.1, "11": 9 }, pointsFromBonus: { "9": 0.8, "10": 0.9, "11": 9 } }),
  proj(8, { "9": 7.4, "10": 7.0 }),
  proj(9, { "10": 5.5 }),
  proj(10, { "9": 8.1, "10": 7.7 }),
  proj(11, { "9": 5.2, "10": 5.3 }),
];

const base = { elements, projections, teamShortById, gameweeks: [9, 10], pos: null as null, top: 5, perGroup: 2 };

describe("buildPlayerProjections: one position", () => {
  const c = buildPlayerProjections({ ...base, pos: "MID", top: 3 });
  it("lists only that position, best first, with ranks", () => {
    expect(c.single).toBe("MID");
    expect(c.groups).toHaveLength(1);
    expect(c.groups[0].rows.map((r) => r.name)).toEqual(["Salah", "Saka", "Cherki"]);
    expect(c.groups[0].rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
  it("totals exactly the chosen gameweeks (GW11 is ignored) and skips missing gameweeks", () => {
    const rows = c.groups[0].rows;
    expect(rows.find((r) => r.name === "Saka")!.xpts).toBe(12.5);
    expect(rows.find((r) => r.name === "Salah")!.xpts).toBe(14.4);
    expect(rows.find((r) => r.name === "Cherki")!.xpts).toBe(5.5); // only GW10 has a projection
  });
  it("shows the components for that position, summed over the chosen gameweeks only", () => {
    expect(c.partLabels).toEqual(PROJECTION_PARTS.MID.map((p) => p.label));
    const saka = c.groups[0].rows.find((r) => r.name === "Saka")!;
    expect(saka.parts).toEqual([3.9, 2.3, 1.7]); // goals, assists, bonus (GW11 values excluded)
  });
  it("combines goals and assists into Attack for defenders and uses clean sheets and defensive contributions", () => {
    const d = buildPlayerProjections({ ...base, pos: "DEF", top: 3 });
    expect(d.partLabels).toEqual(PROJECTION_PARTS.DEF.map((p) => p.label));
    const saliba = d.groups[0].rows.find((r) => r.name === "Saliba")!;
    const byLabel = Object.fromEntries(d.partLabels.map((l, i) => [l, saliba.parts[i]]));
    expect(byLabel["Clean sheet"]).toBe(2.6);
    expect(byLabel["Attack"]).toBe(1.2);
  });
  it("leaves out injured, suspended, unavailable and not-in-squad players, and flags doubtful ones", () => {
    const d = buildPlayerProjections({ ...base, pos: "DEF", top: 10 });
    const names = d.groups[0].rows.map((r) => r.name);
    expect(names).not.toContain("Gvardiol"); // injured, even with the highest projection
    expect(names).toContain("Konate");
    expect(d.groups[0].rows.find((r) => r.name === "Konate")!.doubtful).toBe(true);
    expect(d.groups[0].rows.find((r) => r.name === "Saliba")!.doubtful).toBe(false);
  });
  it("breaks ties by player id, and leaves out players with no projection in the range", () => {
    const d = buildPlayerProjections({ ...base, pos: "DEF", top: 10 });
    const order = d.groups[0].rows.map((r) => r.name);
    expect(order.indexOf("Saliba")).toBeLessThan(order.indexOf("Gabriel")); // 8.6 each: id 3 before id 4
    const none = buildPlayerProjections({ ...base, gameweeks: [20], pos: "MID", top: 5 });
    expect(none.groups[0].rows).toEqual([]);
  });
  it("formats price and ownership like the other graphics", () => {
    const f = buildPlayerProjections({ ...base, pos: "FWD", top: 1 }).groups[0].rows[0];
    expect([f.name, f.price, f.ownership, f.teamShort]).toEqual(["Haaland", "£15.0m", "77.5%", "MCI"]);
  });
});

describe("buildPlayerProjections: all positions", () => {
  const c = buildPlayerProjections({ ...base, perGroup: 2 });
  it("gives the four positions in order, the best few of each", () => {
    expect(c.single).toBeNull();
    expect(c.groups.map((g) => g.position)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(c.groups.map((g) => g.rows.map((r) => r.name))).toEqual([["Raya", "Martinez"], ["Saliba", "Gabriel"], ["Salah", "Saka"], ["Haaland", "Isak"]]);
    expect(c.partLabels).toEqual([]);
    expect(c.groups.every((g) => g.rows.every((r) => r.parts.length === 0))).toBe(true);
  });
  it("returns an empty group, not a missing one, when a position has nothing", () => {
    const only = buildPlayerProjections({ ...base, projections: projections.filter((p) => p.playerId !== 1 && p.playerId !== 2) });
    expect(only.groups[0].position).toBe("GKP");
    expect(only.groups[0].rows).toEqual([]);
  });
});

describe("buildTopScorers", () => {
  const live: LiveScorerInput[] = [
    { id: 10, stats: { total_points: 17, minutes: 90, goals_scored: 2, assists: 0, bonus: 3 }, explain: [{ fixture: 1, stats: [{ identifier: "minutes", points: 2, value: 90 }, { identifier: "goals_scored", points: 8, value: 2 }, { identifier: "bonus", points: 3, value: 3 }] }, { fixture: 2, stats: [{ identifier: "goals_scored", points: 4, value: 1 }] }] },
    { id: 8, stats: { total_points: 17, minutes: 90, goals_scored: 1, assists: 2, bonus: 2 }, explain: [{ fixture: 3, stats: [{ identifier: "minutes", points: 2, value: 90 }, { identifier: "goals_scored", points: 5, value: 1 }, { identifier: "assists", points: 6, value: 2 }, { identifier: "yellow_cards", points: -1, value: 1 }, { identifier: "bonus", points: 2, value: 2 }, { identifier: "defensive_contribution", points: 2, value: 12 }] }] },
    { id: 1, stats: { total_points: 9, minutes: 90, goals_scored: 0, assists: 0, bonus: 3 }, explain: [{ fixture: 4, stats: [{ identifier: "minutes", points: 2, value: 90 }, { identifier: "clean_sheets", points: 4, value: 1 }, { identifier: "bonus", points: 3, value: 3 }] }] },
    { id: 7, stats: { total_points: 12, minutes: 0, goals_scored: 0, assists: 0, bonus: 0 } }, // points without minutes: cannot be real, ignored
    { id: 9, stats: { total_points: 0, minutes: 90, goals_scored: 0, assists: 0, bonus: 0 } },
    { id: 999, stats: { total_points: 20, minutes: 90, goals_scored: 3, assists: 0, bonus: 3 } }, // not in the player list
  ];
  const c = buildTopScorers({ elements, live, teamShortById, gameweek: 7, pos: null, top: 5 });
  it("ranks by points; level points go to the bigger goal involvement, then the lower id", () => {
    expect(c.rows.map((r) => r.name)).toEqual(["Salah", "Haaland", "Raya"]); // Salah 3 involvements vs Haaland 2
    expect(c.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(c.rows.map((r) => r.points)).toEqual([17, 17, 9]);
  });
  it("never lists players who did not play, scored nothing, or are not in the player list", () => {
    const names = c.rows.map((r) => r.name);
    expect(names).not.toContain("Saka");
    expect(names).not.toContain("Cherki");
    expect(c.rows).toHaveLength(3);
  });
  it("explains the points: summed over a double gameweek, biggest first, at most four, minutes only as a fallback", () => {
    const haaland = c.rows.find((r) => r.name === "Haaland")!;
    expect(haaland.chips).toEqual([{ label: "Goals", points: 12 }, { label: "Bonus", points: 3 }]);
    const salah = c.rows.find((r) => r.name === "Salah")!;
    expect(salah.chips.map((x) => x.label)).toEqual(["Assists", "Goals", "Bonus", "Def. contr."]);
    expect(salah.chips).toHaveLength(4); // the -1 card and the 2 minutes points do not fit
    const only = buildTopScorers({ elements, live: [{ id: 2, stats: { total_points: 2, minutes: 90, goals_scored: 0, assists: 0, bonus: 0 }, explain: [{ fixture: 5, stats: [{ identifier: "minutes", points: 2, value: 90 }] }] }], teamShortById, gameweek: 7, pos: null, top: 5 });
    expect(only.rows[0].chips).toEqual([{ label: "Minutes", points: 2 }]);
  });
  it("filters by position and limits to the top N", () => {
    expect(buildTopScorers({ elements, live, teamShortById, gameweek: 7, pos: "FWD", top: 5 }).rows.map((r) => r.name)).toEqual(["Haaland"]);
    expect(buildTopScorers({ elements, live, teamShortById, gameweek: 7, pos: null, top: 2 }).rows).toHaveLength(2);
  });
  it("keeps the gameweek and each player's club, price and minutes", () => {
    expect(c.gameweek).toBe(7);
    expect(c.rows[0]).toMatchObject({ teamShort: "LIV", position: "MID", price: "£13.5m", minutes: 90 });
  });
  it("works without an explain list (chips are empty, not invented)", () => {
    const bare = buildTopScorers({ elements, live: [{ id: 8, stats: { total_points: 8, minutes: 90, goals_scored: 1, assists: 0, bonus: 0 } }], teamShortById, gameweek: 7, pos: null, top: 5 });
    expect(bare.rows[0].chips).toEqual([]);
  });
});

describe("player history", () => {
  const row = (round: number, fixture: number, extra: Partial<HistoryRowInput> = {}): HistoryRowInput => ({
    round, fixture, opponent_team: 2, was_home: true, total_points: 5, minutes: 90, goals_scored: 0, assists: 0, clean_sheets: 0, bonus: 0, team_h_score: 2, team_a_score: 1, ...extra,
  });
  const history: HistoryRowInput[] = [
    row(1, 11, { total_points: 9, goals_scored: 1, assists: 1, bonus: 2, opponent_team: 2 }),
    row(2, 12, { total_points: 2, minutes: 20, opponent_team: 3, was_home: false, team_h_score: 0, team_a_score: 0 }),
    row(4, 14, { total_points: 6, goals_scored: 1, opponent_team: 4, bonus: 1 }),
    row(4, 15, { total_points: 3, minutes: 60, opponent_team: 2, was_home: false, team_h_score: 1, team_a_score: 2 }), // double gameweek
    row(5, 16, { total_points: 0, minutes: 0, opponent_team: 3 }),
    row(6, 17, { total_points: 4, team_h_score: null, team_a_score: null }), // fixture not finished
  ];
  const finished = new Set([11, 12, 14, 15, 16]);
  const element = elements.find((e) => e.id === 7)!;
  const c = buildPlayerHistory({ element, history, finishedFixtureIds: finished, teamShortById, gameweeks: [1, 2, 3, 4, 5, 6] });

  it("draws one bar per chosen gameweek, in order, with blanks where there was no finished match", () => {
    expect(c.bars.map((b) => b.gameweek)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(c.bars.map((b) => b.points)).toEqual([9, 2, null, 9, 0, null]); // GW3 blank, GW6 fixture not finished
  });
  it("adds up a double gameweek and lists both opponents from the player's side", () => {
    const gw4 = c.bars[3];
    expect(gw4.points).toBe(9);
    expect(gw4.minutes).toBe(150);
    expect(gw4.opponents).toEqual([{ short: "MCI", isHome: true, score: "2-1" }, { short: "AVL", isHome: false, score: "2-1" }]);
  });
  it("scores a away match from the player's side", () => {
    expect(c.bars[1].opponents).toEqual([{ short: "LIV", isHome: false, score: "0-0" }]);
  });
  it("totals only the played, finished gameweeks", () => {
    expect(c.totals.points).toBe(20);
    expect(c.totals.goals).toBe(2);
    expect(c.totals.assists).toBe(1);
    expect(c.totals.bonus).toBe(3);
    expect(c.totals.minutes).toBe(90 + 20 + 150);
    expect(c.totals.appearances).toBe(3); // GW5 had 0 minutes
    expect(c.totals.average).toBe(6.7); // 20 / 3
    expect(c.totals.best).toEqual({ gameweek: 1, points: 9 }); // first of the equal best (GW1 and GW4 both 9)
  });
  it("has no average or best when the player has not played", () => {
    const none = buildPlayerHistory({ element, history: [], finishedFixtureIds: finished, teamShortById, gameweeks: [1, 2] });
    expect(none.totals.average).toBeNull();
    expect(none.totals.best).toBeNull();
    expect(none.bars.every((b) => b.points === null)).toBe(true);
  });
  it("names the player with club, price and ownership", () => {
    expect([c.name, c.teamShort, c.position, c.price, c.ownership]).toEqual(["Saka", "ARS", "MID", "£10.0m", "45.5%"]);
  });
});

describe("history gameweeks", () => {
  const results = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it("defaults to the last eight gameweeks that have results", () => {
    expect(defaultHistoryGameweeks(results)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(defaultHistoryGameweeks([1, 2, 3])).toEqual([1, 2, 3]);
    expect(defaultHistoryGameweeks([])).toEqual([]);
  });
  it("uses a chosen range, dropping gameweeks that have no results yet", () => {
    expect(resolveHistoryGameweeks({ from: 4, to: 7 }, results)).toEqual([4, 5, 6, 7]);
    expect(resolveHistoryGameweeks({ from: 9, to: 12 }, results)).toEqual([9, 10]);
  });
  it("falls back to the default when nothing is chosen or the chosen range has no results", () => {
    expect(resolveHistoryGameweeks({ from: 0, to: 0 }, results)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(resolveHistoryGameweeks({ from: 20, to: 22 }, results)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("playerGraphicLink (Share image buttons)", () => {
  it("opens the right template with the gameweek range, position and player", () => {
    const p = decodeSpec(playerGraphicLink({ template: "player-projections", from: 9, to: 12, pos: "MID" }).split("?")[1]);
    expect([p.template, p.from, p.to, p.pos]).toEqual(["player-projections", 9, 12, "MID"]);
    const h = decodeSpec(playerGraphicLink({ template: "player-history", player: 411 }).split("?")[1]);
    expect([h.template, h.players]).toEqual(["player-history", [411]]);
    const t = decodeSpec(playerGraphicLink({ template: "gw-top-scorers", from: 7, to: 7 }).split("?")[1]);
    expect([t.template, t.from, t.to]).toEqual(["gw-top-scorers", 7, 7]);
  });
  it("can open Stat Leaders too (the season-to-date image for the Player Stats page)", () => {
    expect(playerGraphicLink({ template: "stat-leaders" })).toBe("/graphics?t=stat-leaders");
  });
  it("leaves out what is not real so the graphic picks its own default", () => {
    expect(playerGraphicLink({ template: "gw-top-scorers", from: 0, to: 0 })).toBe("/graphics?t=gw-top-scorers");
    expect(playerGraphicLink({ template: "player-history", player: NaN })).toBe("/graphics?t=player-history");
    expect(playerGraphicLink({ template: "player-projections", from: 9 })).toBe("/graphics?t=player-projections"); // needs both ends
  });
});

describe("the new templates in the graphics spec", () => {
  const ids = ["player-projections", "gw-top-scorers", "player-history"] as const;
  it("are registered", () => {
    for (const id of ids) expect(GRAPHIC_TEMPLATES.find((t) => t.id === id), id).toBeTruthy();
  });
  it("round-trip through the link", () => {
    const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "player-projections", from: 9, to: 11, pos: "FWD", top: 7 };
    expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
    const h: GraphicSpec = { ...DEFAULT_SPEC, template: "player-history", players: [411], from: 3, to: 9 };
    expect(decodeSpec(encodeSpec(h))).toEqual(h);
  });
  it("only projections are marked as estimates", () => {
    expect(usesProjections({ ...DEFAULT_SPEC, template: "player-projections" })).toBe(true);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "gw-top-scorers" })).toBe(false);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "player-history" })).toBe(false);
    expect(footerNote({ ...DEFAULT_SPEC, template: "player-projections" }, "GW9")).toContain("estimates");
  });
  it("Player History opens on the best projected player when none is chosen", () => {
    const spec = { ...DEFAULT_SPEC, template: "player-history" as const };
    expect(needsDefaults(spec)).toBe(true);
    expect(needsDefaults({ ...spec, players: [3] })).toBe(false);
    const patch = defaultSelectionPatch(spec, { elements: elements as any, totals: new Map([[7, 12.5], [10, 15.8], [8, 14.4]]), fixtures: [], gameweek: 9, tickerRows: [] });
    expect(patch).toEqual({ players: [10] });
  });
  it("the other two never need a default (they are driven by data)", () => {
    expect(needsDefaults({ ...DEFAULT_SPEC, template: "player-projections" })).toBe(false);
    expect(needsDefaults({ ...DEFAULT_SPEC, template: "gw-top-scorers" })).toBe(false);
  });
});

describe("captions and empty graphics", () => {
  const specFor = (template: GraphicSpec["template"]): GraphicSpec => ({ ...DEFAULT_SPEC, template });
  const mid = buildPlayerProjections({ ...base, pos: "MID", top: 3 });
  const all = buildPlayerProjections({ ...base, perGroup: 2 });
  const scorers = buildTopScorers({ elements, live: [{ id: 10, stats: { total_points: 17, minutes: 90, goals_scored: 2, assists: 0, bonus: 3 } }, { id: 8, stats: { total_points: 14, minutes: 90, goals_scored: 1, assists: 1, bonus: 2 } }], teamShortById, gameweek: 7, pos: null, top: 5 });
  const hist = buildPlayerHistory({ element: elements.find((e) => e.id === 10)!, history: [{ round: 7, fixture: 1, opponent_team: 2, was_home: true, total_points: 17, minutes: 90, goals_scored: 2, assists: 0, clean_sheets: 0, bonus: 3, team_h_score: 3, team_a_score: 2 }], finishedFixtureIds: new Set([1]), teamShortById, gameweeks: [7] });

  it("projection captions use the on-image numbers and fit 256 characters", () => {
    const a = buildCaption({ kind: "player-projections", projections: mid, gwLabel: "GW9-10", subtitle: "" }, specFor("player-projections"));
    expect(a).toContain("MID");
    expect(a).toContain("Salah 14.4");
    expect(a).toContain("#GW9");
    expect(a.length).toBeLessThanOrEqual(256);
    const b = buildCaption({ kind: "player-projections", projections: all, gwLabel: "GW9-10", subtitle: "" }, specFor("player-projections"));
    expect(b).toContain("Haaland 15.8");
    expect(b).toContain("Raya");
    expect(b.length).toBeLessThanOrEqual(256);
  });
  it("a top-scorers caption gives the real points", () => {
    const c = buildCaption({ kind: "gw-top-scorers", scorers, gwLabel: "GW7", subtitle: "" }, specFor("gw-top-scorers"));
    expect(c).toContain("Haaland 17");
    expect(c).toContain("Salah 14");
    expect(c).toContain("#GW7");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("a history caption gives the totals", () => {
    const c = buildCaption({ kind: "player-history", history: hist, gwLabel: "GW7" }, specFor("player-history"));
    expect(c).toContain("Haaland");
    expect(c).toContain("17 pts");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("a history over several gameweeks is tagged with the latest one, not the first", () => {
    const row = (round: number, fixture: number) => ({ round, fixture, opponent_team: 2, was_home: true, total_points: 6, minutes: 90, goals_scored: 0, assists: 0, clean_sheets: 0, bonus: 0, team_h_score: 1, team_a_score: 0 });
    const long = buildPlayerHistory({ element: elements.find((e) => e.id === 10)!, history: [row(3, 1), row(4, 2), row(5, 3)], finishedFixtureIds: new Set([1, 2, 3]), teamShortById, gameweeks: [3, 4, 5, 6] });
    const c = buildCaption({ kind: "player-history", history: long, gwLabel: "GW3-6" }, specFor("player-history"));
    expect(c).toContain("#GW5"); // GW6 has no finished match for him
    expect(c).not.toContain("#GW3 ");
  });
  it("empty graphics are detected", () => {
    expect(isEmptyGraphic({ kind: "player-projections", projections: mid, gwLabel: "GW9-10", subtitle: "" })).toBe(false);
    const none = buildPlayerProjections({ ...base, gameweeks: [30], pos: "MID", top: 3 });
    expect(isEmptyGraphic({ kind: "player-projections", projections: none, gwLabel: "GW30", subtitle: "" })).toBe(true);
    const noneAll = buildPlayerProjections({ ...base, gameweeks: [30] });
    expect(isEmptyGraphic({ kind: "player-projections", projections: noneAll, gwLabel: "GW30", subtitle: "" })).toBe(true);
    expect(isEmptyGraphic({ kind: "gw-top-scorers", scorers, gwLabel: "GW7", subtitle: "" })).toBe(false);
    expect(isEmptyGraphic({ kind: "gw-top-scorers", scorers: { ...scorers, rows: [] }, gwLabel: "GW7", subtitle: "" })).toBe(true);
    expect(isEmptyGraphic({ kind: "player-history", history: hist, gwLabel: "GW7" })).toBe(false);
    const blank = buildPlayerHistory({ element: elements[0], history: [], finishedFixtureIds: new Set(), teamShortById, gameweeks: [1] });
    expect(isEmptyGraphic({ kind: "player-history", history: blank, gwLabel: "GW1" })).toBe(true);
  });
});
