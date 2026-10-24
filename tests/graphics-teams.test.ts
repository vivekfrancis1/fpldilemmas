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
  type GraphicSpec,
} from "../shared/graphics";
import { defaultSelectionPatch, needsDefaults } from "../shared/graphic-defaults";
import type { MatchFixtureInput } from "../shared/graphics-matches";
import {
  TEAM_METRICS,
  buildLeagueTable,
  buildProjectedTable,
  buildTeamHistory,
  buildTeamProjections,
  resolveProjectedEndGameweek,
  teamGraphicLink,
  teamGraphicUrl,
  type StandingsRowInput,
  type TeamProjectionRowInput,
} from "../shared/graphics-teams";

const teamShortById = new Map<number, string>([[1, "ARS"], [2, "AVL"], [3, "LIV"], [4, "MCI"], [5, "CHE"]]);
const teamNameById = new Map<number, string>([[1, "Arsenal"], [2, "Aston Villa"], [3, "Liverpool"], [4, "Man City"], [5, "Chelsea"]]);

const goalsRow = (teamId: number, perGw: Record<string, number[]>): TeamProjectionRowInput => ({
  teamId,
  fixtureDetails: Object.fromEntries(Object.entries(perGw).map(([gw, vs]) => [gw, vs.map((goals) => ({ opponent: "XXX", isHome: true, goals }))])),
});

describe("buildTeamProjections", () => {
  const rows: TeamProjectionRowInput[] = [
    goalsRow(1, { "9": [2.0], "10": [1.6], "11": [9.9] }), // GW11 is outside the range
    goalsRow(2, { "9": [1.0], "10": [1.2] }),
    goalsRow(3, { "9": [1.8, 1.6], "10": [] }), // double gameweek in GW9, blank in GW10
    goalsRow(4, { "9": [2.0], "10": [1.6] }), // same average as Arsenal: ties go by name
    goalsRow(5, { "11": [1.5] }), // no fixture in the range: left out
  ];
  const c = buildTeamProjections({ rows, metric: "goals-for", gameweeks: [9, 10], teamShortById, teamNameById });

  it("ranks the clubs by projected goals per game, best first, ties by name", () => {
    expect(c.rows.map((r) => r.short)).toEqual(["ARS", "MCI", "LIV", "AVL"]);
    expect(c.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
  it("averages only the fixtures inside the range and counts a double gameweek as two games", () => {
    const ars = c.rows.find((r) => r.short === "ARS")!;
    expect([ars.games, ars.total, ars.perGame]).toEqual([2, 3.6, 1.8]);
    const liv = c.rows.find((r) => r.short === "LIV")!;
    expect([liv.games, liv.total, liv.perGame]).toEqual([2, 3.4, 1.7]);
  });
  it("leaves out clubs with no fixture in the range", () => {
    expect(c.rows.map((r) => r.short)).not.toContain("CHE");
  });
  it("names the metric and gives each club a bar share relative to the biggest value", () => {
    expect(c.metric).toBe("goals-for");
    expect(c.rows[0].share).toBe(1);
    const avl = c.rows.find((r) => r.short === "AVL")!;
    expect(avl.share).toBeCloseTo(1.1 / 1.8, 5);
  });
  it("ranks goals conceded fewest first", () => {
    const against: TeamProjectionRowInput[] = [1, 2, 3].map((id, i) => ({ teamId: id, fixtureDetails: { "9": [{ opponent: "X", isHome: true, goalsAgainst: [1.4, 0.8, 1.1][i] }] } }));
    const a = buildTeamProjections({ rows: against, metric: "goals-against", gameweeks: [9], teamShortById, teamNameById });
    expect(a.rows.map((r) => r.short)).toEqual(["AVL", "LIV", "ARS"]);
    expect(TEAM_METRICS["goals-against"].better).toBe("lower");
  });
  it("shows clean sheets as an average chance in percent, with the expected number of clean sheets as the total", () => {
    const cs: TeamProjectionRowInput[] = [{ id: 1, teamShort: "ARS", fixtureDetails: { "9": [{ opponent: "X", isHome: true, cleanSheetOdds: 40 }], "10": [{ opponent: "Y", isHome: false, cleanSheetOdds: 20 }] } }];
    const r = buildTeamProjections({ rows: cs, metric: "clean-sheets", gameweeks: [9, 10], teamShortById, teamNameById }).rows[0];
    expect([r.short, r.perGame, r.total, r.games]).toEqual(["ARS", 30, 0.6, 2]);
  });
  it("reads assists", () => {
    const as: TeamProjectionRowInput[] = [{ teamId: 1, fixtureDetails: { "9": [{ opponent: "X", isHome: true, assists: 1.4 }] } }];
    expect(buildTeamProjections({ rows: as, metric: "assists", gameweeks: [9], teamShortById, teamNameById }).rows[0].perGame).toBe(1.4);
  });
  it("has no rows (not a made-up list) when nothing is in the range", () => {
    expect(buildTeamProjections({ rows, metric: "goals-for", gameweeks: [30], teamShortById, teamNameById }).rows).toEqual([]);
  });
});

describe("tables", () => {
  const team = (id: number, name: string, pts: number, gd: number, gf: number, extra: Partial<StandingsRowInput> = {}): StandingsRowInput => ({
    id, name, shortName: teamShortById.get(id) ?? "XXX", played: 7, wins: 2, draws: 1, losses: 4, goalsFor: gf, goalsAgainst: gf - gd, goalDifference: gd, points: pts, ...extra,
  });
  const twenty: StandingsRowInput[] = Array.from({ length: 20 }, (_, i) => team(100 + i, `Club ${String(i).padStart(2, "0")}`, 60 - i * 2, 20 - i, 50 - i, { position: i + 1, shortName: `C${String(i).padStart(2, "0")}` }));

  it("keeps the order the site gives (its position field), marks the top four and the bottom three", () => {
    const shuffled = [...twenty].reverse();
    const t = buildProjectedTable({ rows: shuffled, endGameweek: 38 });
    expect(t.rows.map((r) => r.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(t.rows.slice(0, 4).every((r) => r.zone === "top4")).toBe(true);
    expect(t.rows.slice(4, 17).every((r) => r.zone === null)).toBe(true);
    expect(t.rows.slice(17).every((r) => r.zone === "relegation")).toBe(true);
  });
  it("without a position, orders by points, goal difference, goals scored, then name", () => {
    const rows = [team(1, "Arsenal", 10, 2, 8), team(2, "Aston Villa", 10, 2, 8), team(3, "Liverpool", 10, 5, 9), team(4, "Man City", 12, 0, 5), team(5, "Chelsea", 10, 2, 9)];
    const t = buildLeagueTable({ rows, venue: "all" });
    expect(t.rows.map((r) => r.short)).toEqual(["MCI", "LIV", "CHE", "ARS", "AVL"]);
  });
  it("gives no zones for a short list", () => {
    const rows = [team(1, "Arsenal", 10, 2, 8), team(2, "Aston Villa", 9, 2, 8), team(3, "Liverpool", 8, 5, 9)];
    expect(buildLeagueTable({ rows, venue: "all" }).rows.every((r) => r.zone === null)).toBe(true);
  });
  it("copies the played, won, drawn, lost, goals and points columns as they are", () => {
    const t = buildLeagueTable({ rows: [team(1, "Arsenal", 17, 6, 14, { played: 7, wins: 5, draws: 2, losses: 0 })], venue: "home" });
    expect(t.rows[0]).toMatchObject({ short: "ARS", name: "Arsenal", played: 7, wins: 5, draws: 2, losses: 0, goalsFor: 14, goalDifference: 6, points: 17 });
    expect(t.venue).toBe("home");
  });
  it("a table where nobody has played is empty, a projected table is not", () => {
    const pre = buildLeagueTable({ rows: twenty.map((r) => ({ ...r, played: 0 })), venue: "all" });
    expect(pre.started).toBe(false);
    expect(buildLeagueTable({ rows: twenty, venue: "all" }).started).toBe(true);
    expect(buildProjectedTable({ rows: [], endGameweek: 38 }).rows).toEqual([]);
  });
  it("the projected table says how many games are played and how many are projected", () => {
    const t = buildProjectedTable({ rows: twenty.map((r) => ({ ...r, actualGames: 7, projectedGames: 31 })), endGameweek: 38 });
    expect([t.actualGames, t.projectedGames, t.endGameweek]).toEqual([7, 31, 38]);
  });
});

describe("resolveProjectedEndGameweek", () => {
  it("keeps a chosen end gameweek between the next gameweek and 38, otherwise the final table (38)", () => {
    expect(resolveProjectedEndGameweek(20, 9)).toBe(20);
    expect(resolveProjectedEndGameweek(9, 9)).toBe(9);
    expect(resolveProjectedEndGameweek(8, 9)).toBe(38);
    expect(resolveProjectedEndGameweek(0, 9)).toBe(38);
    expect(resolveProjectedEndGameweek(39, 9)).toBe(38);
  });
});

describe("buildTeamHistory", () => {
  const done = (id: number, event: number, h: number, a: number, hs: number, as: number, extra: Partial<MatchFixtureInput> = {}): MatchFixtureInput =>
    ({ id, event, team_h: h, team_a: a, kickoff_time: `2026-09-${String(event).padStart(2, "0")}T15:00:00Z`, started: true, finished: true, finished_provisional: true, team_h_score: hs, team_a_score: as, ...extra });
  const fixtures: MatchFixtureInput[] = [
    done(1, 1, 1, 2, 3, 0), done(2, 2, 3, 1, 1, 1), done(3, 3, 1, 4, 0, 2), done(4, 4, 5, 1, 0, 1),
    done(5, 5, 1, 3, 2, 2), done(6, 6, 2, 1, 1, 3), done(7, 7, 1, 5, 4, 0), done(8, 8, 4, 1, 2, 1), done(9, 9, 1, 2, 2, 1),
    done(10, 10, 1, 3, 0, 0, { finished: false, finished_provisional: false, started: true }), // live: not a result
    { id: 11, event: 11, team_h: 1, team_a: 4, kickoff_time: "2026-10-01T15:00:00Z", started: false, finished: false, finished_provisional: false, team_h_score: null, team_a_score: null },
    done(12, 9, 3, 4, 1, 0), // another club's match
  ];
  const standings: StandingsRowInput[] = [
    { id: 1, name: "Arsenal", shortName: "ARS", played: 9, wins: 5, draws: 2, losses: 2, goalsFor: 15, goalsAgainst: 10, goalDifference: 5, points: 17, cleanSheets: 3, expectedGoalsFor: 14.26, expectedGoalsAgainst: 9.84, position: 3 },
    { id: 2, name: "Aston Villa", shortName: "AVL", played: 9, wins: 4, draws: 1, losses: 4, goalsFor: 9, goalsAgainst: 9, goalDifference: 0, points: 13, position: 9 },
  ];
  const base = { teamId: 1, fixtures, standings, teamShortById, teamNameById, from: 0, to: 0 };

  it("lists the club's last eight finished results, oldest first, from the club's point of view", () => {
    const c = buildTeamHistory(base)!;
    expect(c.results.map((r) => r.gameweek)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(c.results.map((r) => r.result)).toEqual(["D", "L", "W", "D", "W", "W", "L", "W"]);
    expect(c.results[0]).toMatchObject({ opponentShort: "LIV", opponentName: "Liverpool", isHome: false, scored: 1, conceded: 1 });
    expect(c.results[6]).toMatchObject({ opponentShort: "MCI", isHome: false, scored: 1, conceded: 2 }); // away at Man City, lost 2-1
  });
  it("never includes a live or unplayed match, or another club's", () => {
    const c = buildTeamHistory(base)!;
    expect(c.results.map((r) => r.gameweek)).not.toContain(10);
    expect(c.results.map((r) => r.gameweek)).not.toContain(11);
    expect(c.results.length).toBe(8);
  });
  it("uses a chosen gameweek range instead of the last eight", () => {
    const c = buildTeamHistory({ ...base, from: 1, to: 3 })!;
    expect(c.results.map((r) => r.gameweek)).toEqual([1, 2, 3]);
  });
  it("falls back to the last eight when the chosen range has no results", () => {
    expect(buildTeamHistory({ ...base, from: 20, to: 22 })!.results.length).toBe(8);
  });
  it("adds up a double gameweek as two results", () => {
    const dgw = [...fixtures, done(13, 9, 5, 1, 1, 1)];
    const c = buildTeamHistory({ ...base, fixtures: dgw, from: 9, to: 9 })!;
    expect(c.results.map((r) => [r.gameweek, r.opponentShort])).toEqual([[9, "AVL"], [9, "CHE"]]);
  });
  it("shows the club's position and season figures from the table", () => {
    const c = buildTeamHistory(base)!;
    expect(c).toMatchObject({ name: "Arsenal", short: "ARS", position: 3, played: 9, wins: 5, draws: 2, losses: 2, points: 17, goalsFor: 15, goalsAgainst: 10, goalDifference: 5, cleanSheets: 3, xgFor: 14.3, xgAgainst: 9.8 });
  });
  it("shows a missing figure as null, never a made-up number", () => {
    const c = buildTeamHistory({ ...base, teamId: 2 })!;
    expect(c.cleanSheets).toBeNull();
    expect(c.xgFor).toBeNull();
    const none = buildTeamHistory({ ...base, standings: [] })!;
    expect(none.position).toBeNull();
    expect(none.points).toBeNull();
  });
  it("counts the form in the window it shows", () => {
    const c = buildTeamHistory(base)!;
    expect(c.window).toEqual({ wins: 4, draws: 2, losses: 2, goalsFor: 14, goalsAgainst: 9 });
  });
  it("is null for an unknown club", () => {
    expect(buildTeamHistory({ ...base, teamId: 99 })).toBeNull();
  });
});

describe("teamGraphicUrl: which data a team graphic needs", () => {
  const spec = (patch: Partial<GraphicSpec>): GraphicSpec => ({ ...DEFAULT_SPEC, ...patch });
  const range = { from: 9, to: 13 };
  it("team projections: the metric's endpoint for the chosen (or default) range", () => {
    expect(teamGraphicUrl(spec({ template: "team-projections", metric: "goals-against", from: 10, to: 12 }), range, 9)).toBe("/api/team-goals-against-projections?startGameweek=10&endGameweek=12");
    expect(teamGraphicUrl(spec({ template: "team-projections" }), range, 9)).toBe("/api/team-goal-projections?startGameweek=9&endGameweek=13");
    expect(teamGraphicUrl(spec({ template: "team-projections", metric: "clean-sheets" }), range, 9)).toContain("/api/team-cs-projections?");
    expect(teamGraphicUrl(spec({ template: "team-projections", metric: "assists" }), range, 9)).toContain("/api/team-assist-projections?");
  });
  it("projected table: the end gameweek, 38 by default", () => {
    expect(teamGraphicUrl(spec({ template: "projected-table" }), range, 9)).toBe("/api/projected-standings?endGameweek=38");
    expect(teamGraphicUrl(spec({ template: "projected-table", from: 20, to: 20 }), range, 9)).toBe("/api/projected-standings?endGameweek=20");
  });
  it("league table and team history: the current standings", () => {
    expect(teamGraphicUrl(spec({ template: "league-table" }), range, 9)).toBe("/api/current-standings?venue=all");
    expect(teamGraphicUrl(spec({ template: "league-table", venue: "away" }), range, 9)).toBe("/api/current-standings?venue=away");
    expect(teamGraphicUrl(spec({ template: "team-history" }), range, 9)).toBe("/api/current-standings?venue=all");
  });
  it("other templates need none", () => {
    expect(teamGraphicUrl(spec({ template: "captain-picks" }), range, 9)).toBeNull();
  });
});

describe("teamGraphicLink (Share image buttons)", () => {
  it("opens the right template with its range, metric, venue and club", () => {
    const p = decodeSpec(teamGraphicLink({ template: "team-projections", metric: "clean-sheets", from: 9, to: 12 }).split("?")[1]);
    expect([p.template, p.metric, p.from, p.to]).toEqual(["team-projections", "clean-sheets", 9, 12]);
    const l = decodeSpec(teamGraphicLink({ template: "league-table", venue: "home" }).split("?")[1]);
    expect([l.template, l.venue]).toEqual(["league-table", "home"]);
    const h = decodeSpec(teamGraphicLink({ template: "team-history", team: 5 }).split("?")[1]);
    expect([h.template, h.teams]).toEqual(["team-history", [5]]);
    const t = decodeSpec(teamGraphicLink({ template: "projected-table", endGameweek: 20 }).split("?")[1]);
    expect([t.template, t.from, t.to]).toEqual(["projected-table", 20, 20]);
  });
  it("leaves out what is not real", () => {
    expect(teamGraphicLink({ template: "team-history", team: NaN })).toBe("/graphics?t=team-history");
    expect(teamGraphicLink({ template: "projected-table", endGameweek: 0 })).toBe("/graphics?t=projected-table");
    expect(teamGraphicLink({ template: "league-table", venue: "all" })).toBe("/graphics?t=league-table");
  });
});

describe("the new templates in the graphics spec", () => {
  const ids = ["team-projections", "projected-table", "league-table", "team-history"] as const;
  it("are registered", () => {
    for (const id of ids) expect(GRAPHIC_TEMPLATES.find((t) => t.id === id), id).toBeTruthy();
  });
  it("round-trip metric and venue through the link, with bad values falling back to defaults", () => {
    const spec: GraphicSpec = { ...DEFAULT_SPEC, template: "team-projections", metric: "assists", from: 9, to: 11 };
    expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
    const v: GraphicSpec = { ...DEFAULT_SPEC, template: "league-table", venue: "away" };
    expect(decodeSpec(encodeSpec(v))).toEqual(v);
    const bad = decodeSpec("?t=team-projections&mt=nonsense&vn=elsewhere");
    expect([bad.metric, bad.venue]).toEqual(["goals-for", "all"]);
    expect(encodeSpec(DEFAULT_SPEC)).toBe("");
  });
  it("projections and the projected table are marked as estimates, the other two are not", () => {
    expect(usesProjections({ ...DEFAULT_SPEC, template: "team-projections" })).toBe(true);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "projected-table" })).toBe(true);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "league-table" })).toBe(false);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "team-history" })).toBe(false);
    expect(footerNote({ ...DEFAULT_SPEC, template: "projected-table" }, "GW38")).toContain("estimates");
  });
  it("Team History opens on the club whose match kicks off next, like Predicted Lineups", () => {
    const spec = { ...DEFAULT_SPEC, template: "team-history" as const };
    expect(needsDefaults(spec)).toBe(true);
    expect(needsDefaults({ ...spec, teams: [3] })).toBe(false);
    const patch = defaultSelectionPatch(spec, {
      elements: [],
      totals: new Map(),
      fixtures: [{ id: 1, event: 9, team_h: 4, team_a: 2, kickoff_time: "2026-10-24T15:00:00Z", started: false, finished: false } as any],
      gameweek: 9,
      tickerRows: [],
    });
    expect(patch).toEqual({ teams: [4] });
  });
  it("the other three never need a default", () => {
    for (const t of ["team-projections", "projected-table", "league-table"] as const) expect(needsDefaults({ ...DEFAULT_SPEC, template: t })).toBe(false);
  });
});

describe("captions and empty graphics", () => {
  const spec = (template: GraphicSpec["template"]): GraphicSpec => ({ ...DEFAULT_SPEC, template });
  const proj = buildTeamProjections({
    rows: [goalsRow(1, { "9": [2.1] }), goalsRow(4, { "9": [2.0] }), goalsRow(3, { "9": [1.9] }), goalsRow(2, { "9": [1.0] })],
    metric: "goals-for", gameweeks: [9], teamShortById, teamNameById,
  });
  const rows: StandingsRowInput[] = [
    { id: 4, name: "Man City", shortName: "MCI", played: 7, wins: 7, draws: 0, losses: 0, goalsFor: 19, goalsAgainst: 7, goalDifference: 12, points: 21 },
    { id: 1, name: "Arsenal", shortName: "ARS", played: 7, wins: 5, draws: 2, losses: 0, goalsFor: 14, goalsAgainst: 5, goalDifference: 9, points: 17 },
    { id: 3, name: "Liverpool", shortName: "LIV", played: 7, wins: 5, draws: 1, losses: 1, goalsFor: 12, goalsAgainst: 6, goalDifference: 6, points: 16 },
  ];
  const league = buildLeagueTable({ rows, venue: "all" });
  const projected = buildProjectedTable({ rows, endGameweek: 38 });

  it("a team projections caption gives the best three, per game", () => {
    const c = buildCaption({ kind: "team-projections", teams: proj, gwLabel: "GW9", subtitle: "" }, spec("team-projections"));
    expect(c).toContain("ARS 2.10");
    expect(c).toContain("MCI 2.00");
    expect(c).toContain("LIV 1.90");
    expect(c).toContain("#GW9");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("a projected table caption says it is projected and gives points", () => {
    const c = buildCaption({ kind: "projected-table", table: projected, gwLabel: "GW38", subtitle: "" }, spec("projected-table"));
    expect(c.toLowerCase()).toContain("projected");
    expect(c).toContain("MCI 21");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("a league table caption gives the real top three", () => {
    const c = buildCaption({ kind: "league-table", table: league, gwLabel: "GW7", subtitle: "" }, spec("league-table"));
    expect(c).toContain("MCI 21");
    expect(c).toContain("ARS 17");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("a team history caption gives the form and the position", () => {
    const fixtures: MatchFixtureInput[] = [1, 2, 3].map((i) => ({ id: i, event: i, team_h: 1, team_a: 2, kickoff_time: `2026-09-0${i}T15:00:00Z`, started: true, finished: true, team_h_score: i === 2 ? 0 : 2, team_a_score: i === 2 ? 0 : 1 }));
    const h = buildTeamHistory({ teamId: 1, fixtures, standings: [{ ...rows[1], position: 2 }], teamShortById, teamNameById, from: 0, to: 0 })!;
    const c = buildCaption({ kind: "team-history", history: h, gwLabel: "GW1-3" }, spec("team-history"));
    expect(c).toContain("Arsenal");
    expect(c).toContain("WDW");
    expect(c).toContain("#GW3"); // the latest gameweek shown, not the first of the range
    expect(c).not.toContain("#GW1 ");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("empty graphics are detected", () => {
    expect(isEmptyGraphic({ kind: "team-projections", teams: proj, gwLabel: "GW9", subtitle: "" })).toBe(false);
    expect(isEmptyGraphic({ kind: "team-projections", teams: { ...proj, rows: [] }, gwLabel: "GW9", subtitle: "" })).toBe(true);
    expect(isEmptyGraphic({ kind: "league-table", table: league, gwLabel: "GW7", subtitle: "" })).toBe(false);
    expect(isEmptyGraphic({ kind: "league-table", table: buildLeagueTable({ rows: rows.map((r) => ({ ...r, played: 0 })), venue: "all" }), gwLabel: "GW0", subtitle: "" })).toBe(true);
    expect(isEmptyGraphic({ kind: "projected-table", table: projected, gwLabel: "GW38", subtitle: "" })).toBe(false);
    expect(isEmptyGraphic({ kind: "projected-table", table: buildProjectedTable({ rows: [], endGameweek: 38 }), gwLabel: "GW38", subtitle: "" })).toBe(true);
    const none = buildTeamHistory({ teamId: 1, fixtures: [], standings: [], teamShortById, teamNameById, from: 0, to: 0 })!;
    expect(isEmptyGraphic({ kind: "team-history", history: none, gwLabel: "" })).toBe(true);
  });
});
