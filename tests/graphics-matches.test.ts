import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC,
  GRAPHIC_SIZES,
  GRAPHIC_TEMPLATES,
  buildCaption,
  decodeSpec,
  encodeSpec,
  footerNote,
  isEmptyGraphic,
  usesProjections,
  type GraphicData,
  type GraphicElement,
  type GraphicSpec,
} from "../shared/graphics";
import {
  MATCH_LIST_LIMIT,
  buildMatchPredictions,
  buildMatchPreview,
  buildMatchReport,
  buildMatchResults,
  completedGameweeks,
  DEFENSIVE_LIST_LIMIT,
  earnsDefensivePoints,
  matchGraphicLink,
  normaliseProbabilities,
  predictionGameweeks,
  resolveMatch,
  resolvePredictionGameweek,
  resolveResultsGameweek,
  resultGameweeks,
  type MatchFixtureInput,
  type MatchModelInput,
} from "../shared/graphics-matches";

const teamShortById = new Map<number, string>([[1, "ARS"], [2, "AVL"], [3, "BOU"], [4, "BRE"], [5, "CHE"], [6, "LIV"]]);
const teamNameById = new Map<number, string>([[1, "Arsenal"], [2, "Aston Villa"], [3, "Bournemouth"], [4, "Brentford"], [5, "Chelsea"], [6, "Liverpool"]]);

const el = (id: number, name: string, team: number, type: number, extra: Record<string, unknown> = {}): GraphicElement => ({
  id, web_name: name, team, element_type: type, now_cost: 70, ...extra,
});
const elements: GraphicElement[] = [
  el(1, "Saka", 1, 3), el(2, "Havertz", 1, 4), el(3, "Saliba", 1, 2), el(4, "Odegaard", 1, 3), el(5, "Gabriel", 1, 2),
  el(11, "Salah", 6, 3), el(12, "Isak", 6, 4), el(13, "Konate", 6, 2), el(14, "Alisson", 6, 1, { status: "i" }),
  el(21, "Watkins", 2, 4), el(22, "Martinez", 2, 1),
];

function fx(id: number, event: number | null, h: number, a: number, extra: Partial<MatchFixtureInput> = {}): MatchFixtureInput {
  return { id, event, team_h: h, team_a: a, kickoff_time: `2026-10-${String(20 + (id % 8)).padStart(2, "0")}T15:00:00Z`, started: false, finished: false, finished_provisional: false, team_h_score: null, team_a_score: null, stats: [], ...extra };
}
const done = (id: number, event: number, h: number, a: number, hs: number, as: number, stats: MatchFixtureInput["stats"] = []): MatchFixtureInput =>
  fx(id, event, h, a, { started: true, finished: true, finished_provisional: true, team_h_score: hs, team_a_score: as, stats });

const fixtures: MatchFixtureInput[] = [
  done(1, 7, 1, 2, 2, 0),
  done(2, 7, 3, 4, 1, 1),
  done(3, 8, 5, 6, 0, 3),
  fx(4, 8, 1, 6, { started: true }), // live: neither a prediction nor a result
  fx(5, 8, 2, 3), // still to come in the current gameweek
  fx(6, 9, 1, 3),
  fx(7, 9, 6, 2),
  fx(8, 9, 4, 5),
  fx(9, null, 2, 1), // TBC
];

const model: MatchModelInput = {
  goals: [
    { teamId: 1, fixtureDetails: { "9": [{ opponent: "BOU", isHome: true, goals: 2.1 }] } },
    { teamId: 3, fixtureDetails: { "9": [{ opponent: "ARS", isHome: false, goals: 0.8 }] } },
    { teamId: 6, fixtureDetails: { "9": [{ opponent: "AVL", isHome: true, goals: 1.9 }] } },
    { teamId: 2, fixtureDetails: { "9": [{ opponent: "LIV", isHome: false, goals: 1.0 }] } },
  ],
  cs: [
    { teamShort: "ARS", fixtureDetails: { "9": [{ opponent: "BOU", isHome: true, cleanSheetOdds: 41.2 }] } },
    { teamShort: "BOU", fixtureDetails: { "9": [{ opponent: "ARS", isHome: false, cleanSheetOdds: 12.5 }] } },
    { teamShort: "LIV", fixtureDetails: { "9": [{ opponent: "AVL", isHome: true, cleanSheetOdds: 33 }] } },
    { teamShort: "AVL", fixtureDetails: { "9": [{ opponent: "LIV", isHome: false, cleanSheetOdds: 20 }] } },
  ],
  odds: [{ homeTeam: "Arsenal", awayTeam: "Bournemouth", homeWinProb: 0.7, drawProb: 0.2, awayWinProb: 0.1 }],
};

describe("which gameweeks and fixtures count", () => {
  it("predictions cover only fixtures that have not started and have a gameweek", () => {
    expect(predictionGameweeks(fixtures)).toEqual([8, 9]);
    const content = buildMatchPredictions({ fixtures, gameweek: 8, model, teamShortById, teamNameById, page: 1, limit: 10 });
    expect(content.rows.map((r) => r.id)).toEqual([5]);
  });
  it("results cover only finished fixtures (live and unfinished ones never appear)", () => {
    expect(resultGameweeks(fixtures)).toEqual([7, 8]);
    const content = buildMatchResults({ fixtures, gameweek: 8, elements, teamShortById, teamNameById, page: 1, limit: 10 });
    expect(content.rows.map((r) => r.id)).toEqual([3]);
  });
  it("provisionally finished fixtures count as results", () => {
    const list = [fx(1, 3, 1, 2, { finished: false, finished_provisional: true, started: true, team_h_score: 1, team_a_score: 0 })];
    expect(resultGameweeks(list)).toEqual([3]);
    expect(predictionGameweeks(list)).toEqual([]);
  });
  it("the default prediction gameweek is the first with fixtures to play, the default results gameweek the latest COMPLETED one", () => {
    expect(resolvePredictionGameweek(0, fixtures)).toBe(8);
    // GW8 has one finished match but a live one and one still to come, so GW7 (all played) is the default
    expect(resolveResultsGameweek(0, fixtures)).toBe(7);
    expect(completedGameweeks(fixtures)).toEqual([7]);
  });
  it("when no gameweek is complete yet, the default results gameweek is the latest with any result", () => {
    const early = [done(1, 1, 1, 2, 1, 0), fx(2, 1, 3, 4), fx(3, 2, 5, 6)];
    expect(completedGameweeks(early)).toEqual([]);
    expect(resolveResultsGameweek(0, early)).toBe(1);
  });
  it("TBC fixtures (no gameweek) never stop a gameweek from being complete", () => {
    expect(completedGameweeks([done(1, 3, 1, 2, 1, 0), fx(2, null, 3, 4)])).toEqual([3]);
  });
  it("a chosen gameweek is kept only when it has something to show, otherwise the default is used", () => {
    expect(resolvePredictionGameweek(9, fixtures)).toBe(9);
    expect(resolvePredictionGameweek(7, fixtures)).toBe(8); // GW7 is finished
    expect(resolveResultsGameweek(8, fixtures)).toBe(8); // an in-progress gameweek can still be chosen
    expect(resolveResultsGameweek(9, fixtures)).toBe(7); // GW9 has no results
  });
  it("returns 0 when there is nothing at all", () => {
    expect(resolvePredictionGameweek(0, [])).toBe(0);
    expect(resolveResultsGameweek(5, [])).toBe(0);
  });
});

describe("normaliseProbabilities", () => {
  it("returns whole percentages that always sum to 100", () => {
    const p = normaliseProbabilities(0.3333, 0.3333, 0.3334)!;
    expect(p.home + p.draw + p.away).toBe(100);
    const q = normaliseProbabilities(0.80681, 0.13226, 0.06093)!;
    expect(q).toEqual({ home: 81, draw: 13, away: 6 });
    expect(q.home + q.draw + q.away).toBe(100);
  });
  it("rescales probabilities that do not sum to exactly 1 (bookmaker margin left in)", () => {
    const p = normaliseProbabilities(0.6, 0.3, 0.3)!;
    expect(p).toEqual({ home: 50, draw: 25, away: 25 });
  });
  it("is null when any probability is missing or all are zero", () => {
    expect(normaliseProbabilities(null, 0.2, 0.3)).toBeNull();
    expect(normaliseProbabilities(0.5, undefined as any, 0.3)).toBeNull();
    expect(normaliseProbabilities(0, 0, 0)).toBeNull();
  });
});

describe("buildMatchPredictions", () => {
  const content = buildMatchPredictions({ fixtures, gameweek: 9, model, teamShortById, teamNameById, page: 1, limit: 10 });
  it("lists the gameweek's fixtures in kick-off order and never TBC fixtures", () => {
    expect(content.gameweek).toBe(9);
    expect(content.total).toBe(3);
    expect(content.rows.map((r) => r.id)).toEqual([6, 7, 8].sort((a, b) => {
      const ka = fixtures.find((f) => f.id === a)!.kickoff_time!;
      const kb = fixtures.find((f) => f.id === b)!.kickoff_time!;
      return ka.localeCompare(kb) || a - b;
    }));
  });
  it("copies expected goals and clean-sheet chances from the model for the matching opponent", () => {
    const row = content.rows.find((r) => r.id === 6)!;
    expect(row.home).toMatchObject({ id: 1, short: "ARS", name: "Arsenal", xg: 2.1, cs: 41.2 });
    expect(row.away).toMatchObject({ id: 3, short: "BOU", name: "Bournemouth", xg: 0.8, cs: 12.5 });
  });
  it("uses win/draw/win percentages when the market has odds, null when it does not", () => {
    expect(content.rows.find((r) => r.id === 6)!.probs).toEqual({ home: 70, draw: 20, away: 10 });
    expect(content.rows.find((r) => r.id === 7)!.probs).toBeNull();
  });
  it("shows a missing model value as null, never a made-up number", () => {
    const row = content.rows.find((r) => r.id === 8)!;
    expect(row.home.xg).toBeNull();
    expect(row.away.cs).toBeNull();
  });
  it("splits a long gameweek over pages and says how many", () => {
    const many = Array.from({ length: 12 }, (_, i) => fx(100 + i, 20, 1 + (i % 6), 1 + ((i + 1) % 6)));
    const p1 = buildMatchPredictions({ fixtures: many, gameweek: 20, model: { goals: [], cs: [], odds: [] }, teamShortById, teamNameById, page: 1, limit: 10 });
    const p2 = buildMatchPredictions({ fixtures: many, gameweek: 20, model: { goals: [], cs: [], odds: [] }, teamShortById, teamNameById, page: 2, limit: 10 });
    expect([p1.rows.length, p2.rows.length, p1.pages, p1.total]).toEqual([10, 2, 2, 12]);
    expect(new Set([...p1.rows, ...p2.rows].map((r) => r.id)).size).toBe(12);
  });
  it("clamps a page number that is out of range", () => {
    const c = buildMatchPredictions({ fixtures, gameweek: 9, model, teamShortById, teamNameById, page: 99, limit: 10 });
    expect(c.page).toBe(1);
    expect(c.rows.length).toBe(3);
  });
  it("a gameweek with no fixtures to play gives no rows", () => {
    expect(buildMatchPredictions({ fixtures, gameweek: 7, model, teamShortById, teamNameById, page: 1, limit: 10 }).rows).toEqual([]);
  });
  it("labels kick-off in UK time", () => {
    const row = buildMatchPredictions({ fixtures: [fx(50, 10, 1, 2, { kickoff_time: "2026-10-24T16:30:00Z" })], gameweek: 10, model, teamShortById, teamNameById, page: 1, limit: 10 }).rows[0];
    expect(row.kickoffLabel).toBe("Sat 24 Oct · 17:30");
  });
  it("fits every size: list limits are 10 / 10 / 6", () => {
    expect(MATCH_LIST_LIMIT).toEqual({ square: 10, portrait: 10, landscape: 6 });
  });
});

describe("buildMatchResults", () => {
  const stats: MatchFixtureInput["stats"] = [
    { identifier: "goals_scored", a: [], h: [{ value: 2, element: 2 }, { value: 1, element: 1 }] },
    { identifier: "own_goals", a: [{ value: 1, element: 22 }], h: [] },
    { identifier: "assists", a: [], h: [{ value: 1, element: 4 }] },
  ];
  const list = [done(1, 5, 1, 2, 4, 0, stats), done(2, 5, 5, 6, 1, 1), done(3, 5, 3, 4, 0, 2), fx(4, 5, 2, 3)];
  const content = buildMatchResults({ fixtures: list, gameweek: 5, elements, teamShortById, teamNameById, page: 1, limit: 10 });
  it("shows the real score and the outcome", () => {
    const r1 = content.rows.find((r) => r.id === 1)!;
    expect([r1.home.score, r1.away.score, r1.outcome]).toEqual([4, 0, "home"]);
    expect(content.rows.find((r) => r.id === 2)!.outcome).toBe("draw");
    expect(content.rows.find((r) => r.id === 3)!.outcome).toBe("away");
  });
  it("lists scorers (most goals first), multiple goals as a count, and own goals for the side that benefits", () => {
    const r1 = content.rows.find((r) => r.id === 1)!;
    expect(r1.homeScorers).toEqual(["Havertz (2)", "Saka", "Martinez (og)"]);
    expect(r1.awayScorers).toEqual([]);
  });
  it("totals goals and outcomes over the whole gameweek, not just the page", () => {
    expect(content.total).toBe(3);
    expect(content.goals).toBe(4 + 2 + 2);
    expect([content.homeWins, content.draws, content.awayWins]).toEqual([1, 1, 1]);
    const small = buildMatchResults({ fixtures: list, gameweek: 5, elements, teamShortById, teamNameById, page: 1, limit: 2 });
    expect([small.rows.length, small.pages, small.goals]).toEqual([2, 2, 8]);
  });
  it("does not break on a scorer who is not in the player list", () => {
    const odd = done(9, 6, 1, 2, 1, 0, [{ identifier: "goals_scored", a: [], h: [{ value: 1, element: 99999 }] }]);
    const c = buildMatchResults({ fixtures: [odd], gameweek: 6, elements, teamShortById, teamNameById, page: 1, limit: 10 });
    expect(c.rows[0].homeScorers).toEqual(["Unknown"]);
  });
});

describe("buildMatchPreview", () => {
  const history: MatchFixtureInput[] = [
    done(31, 1, 1, 2, 3, 0), done(32, 2, 5, 1, 1, 1), done(33, 3, 1, 4, 0, 1), done(34, 4, 6, 1, 2, 2), done(35, 5, 1, 3, 2, 1), done(36, 6, 2, 1, 0, 4),
    done(41, 1, 6, 2, 1, 0), done(42, 6, 6, 3, 2, 0),
    fx(40, 9, 1, 6),
  ];
  const projections = [
    { playerId: 1, gameweekProjections: { "9": 6.2 } }, { playerId: 2, gameweekProjections: { "9": 5.1 } },
    { playerId: 3, gameweekProjections: { "9": 4.4 } }, { playerId: 4, gameweekProjections: { "9": 3.3 } },
    { playerId: 11, gameweekProjections: { "9": 7.4 } }, { playerId: 12, gameweekProjections: { "9": 5.8 } },
    { playerId: 14, gameweekProjections: { "9": 9.9 } }, // injured: excluded
  ];
  const model2: MatchModelInput = {
    goals: [
      { teamId: 1, fixtureDetails: { "9": [{ opponent: "LIV", isHome: true, goals: 1.4 }] } },
      { teamId: 6, fixtureDetails: { "9": [{ opponent: "ARS", isHome: false, goals: 1.3 }] } },
    ],
    cs: [], odds: [],
  };
  const content = buildMatchPreview({ fixture: history[history.length - 1], fixtures: history, model: model2, elements, projections, teamShortById, teamNameById })!;
  it("names both clubs, the gameweek and expected goals", () => {
    expect([content.home.short, content.away.short, content.gameweek]).toEqual(["ARS", "LIV", 9]);
    expect([content.home.xg, content.away.xg]).toEqual([1.4, 1.3]);
  });
  it("shows each club's last five finished results, oldest first, from that club's point of view", () => {
    expect(content.home.form.length).toBe(5);
    // Arsenal's finished matches in order of gameweek: GW2 D(1-1 away), GW3 L(0-1), GW4 D(2-2 away), GW5 W(2-1), GW6 W(4-0 away); GW1 (3-0) is the sixth-latest and left out
    expect(content.home.form.map((f) => f.result)).toEqual(["D", "L", "D", "W", "W"]);
    expect(content.home.form[4]).toMatchObject({ opponent: "AVL", isHome: false, score: "4-0" });
    expect(content.away.form.map((f) => f.result)).toEqual(["W", "D", "W"]); // Liverpool: GW1 W, GW4 D, GW6 W (only three played)
  });
  it("lists the three best expected-points players per club, excluding unavailable players", () => {
    expect(content.home.topPlayers.map((p) => p.name)).toEqual(["Saka", "Havertz", "Saliba"]);
    expect(content.away.topPlayers.map((p) => p.name)).toEqual(["Salah", "Isak"]);
    expect(content.home.topPlayers[0]).toMatchObject({ xpts: 6.2, position: "MID" });
  });
  it("is null for a fixture without a gameweek", () => {
    expect(buildMatchPreview({ fixture: fx(60, null, 1, 2), fixtures: history, model: model2, elements, projections, teamShortById, teamNameById })).toBeNull();
  });
});

describe("buildMatchReport", () => {
  const stats: MatchFixtureInput["stats"] = [
    { identifier: "goals_scored", a: [{ value: 1, element: 21 }], h: [{ value: 2, element: 2 }] },
    { identifier: "own_goals", a: [], h: [] },
    { identifier: "assists", a: [], h: [{ value: 1, element: 1 }, { value: 1, element: 4 }] },
    { identifier: "yellow_cards", a: [{ value: 1, element: 22 }], h: [{ value: 1, element: 3 }] },
    { identifier: "red_cards", a: [{ value: 1, element: 21 }], h: [] },
    { identifier: "penalties_missed", a: [], h: [{ value: 1, element: 1 }] },
    { identifier: "bonus", a: [{ value: 1, element: 21 }], h: [{ value: 3, element: 2 }, { value: 2, element: 1 }] },
  ];
  const f = done(70, 8, 1, 2, 2, 1, stats);
  const report = buildMatchReport({ fixture: f, elements, teamShortById, teamNameById })!;
  it("has the real score and both clubs", () => {
    expect([report.home.short, report.home.score, report.away.short, report.away.score]).toEqual(["ARS", 2, "AVL", 1]);
  });
  it("splits goals and assists by side", () => {
    expect(report.goals).toEqual({ home: ["Havertz (2)"], away: ["Watkins"] });
    expect(report.assists).toEqual({ home: ["Odegaard", "Saka"], away: [] });
  });
  it("lists cards with the club: reds first, then yellows, home side before away", () => {
    expect(report.cards).toEqual([
      { name: "Watkins", teamShort: "AVL", kind: "red" },
      { name: "Saliba", teamShort: "ARS", kind: "yellow" },
      { name: "Martinez", teamShort: "AVL", kind: "yellow" },
    ]);
  });
  it("lists bonus points highest first", () => {
    expect(report.bonus).toEqual([
      { name: "Havertz", teamShort: "ARS", points: 3 },
      { name: "Saka", teamShort: "ARS", points: 2 },
      { name: "Watkins", teamShort: "AVL", points: 1 },
    ]);
  });
  it("notes missed penalties", () => {
    expect(report.notes).toEqual(["Saka missed a penalty"]);
  });
  it("has no defensive contributions when FPL gives none", () => {
    expect(report.defensive).toEqual([]);
  });
  it("is null for a match that has not finished", () => {
    expect(buildMatchReport({ fixture: fx(71, 9, 1, 2), elements, teamShortById, teamNameById })).toBeNull();
    expect(buildMatchReport({ fixture: fx(72, 9, 1, 2, { started: true, team_h_score: 1, team_a_score: 0 }), elements, teamShortById, teamNameById })).toBeNull();
  });
});

describe("resolveMatch", () => {
  it("uses the chosen fixture when it is the right kind", () => {
    expect(resolveMatch({ fixture: 7, from: 0 }, fixtures, "upcoming")?.id).toBe(7);
    expect(resolveMatch({ fixture: 3, from: 0 }, fixtures, "finished")?.id).toBe(3);
  });
  it("ignores a chosen fixture of the wrong kind or an unknown one, and falls back to the gameweek's first", () => {
    expect(resolveMatch({ fixture: 1, from: 9 }, fixtures, "upcoming")?.id).toBe(fixtures.filter((f) => f.event === 9).sort((a, b) => a.kickoff_time!.localeCompare(b.kickoff_time!) || a.id - b.id)[0].id);
    expect(resolveMatch({ fixture: 12345, from: 0 }, fixtures, "finished")?.id).toBe(1); // first match of the latest completed gameweek (GW7)
  });
  it("is null when there is nothing of that kind", () => {
    expect(resolveMatch({ fixture: 0, from: 0 }, [], "upcoming")).toBeNull();
    expect(resolveMatch({ fixture: 0, from: 0 }, [fx(1, 1, 1, 2)], "finished")).toBeNull();
  });
});

describe("the new templates in the graphics spec", () => {
  const ids = ["match-predictions", "match-results", "match-preview", "match-report"] as const;
  it("are registered with a label, description and headline", () => {
    for (const id of ids) {
      const t = GRAPHIC_TEMPLATES.find((x) => x.id === id);
      expect(t, id).toBeTruthy();
      expect(t!.label.length).toBeGreaterThan(0);
      expect(t!.description.length).toBeGreaterThan(0);
      expect(t!.headline.length).toBeGreaterThan(0);
    }
  });
  it("round-trip fixture and page through the link", () => {
    for (const id of ids) {
      const spec: GraphicSpec = { ...DEFAULT_SPEC, template: id, from: 9, to: 9, fixture: 123, page: 2 };
      expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
    }
  });
  it("fall back to defaults on bad fixture and page values", () => {
    const s = decodeSpec("?t=match-preview&fx=abc&pg=-3");
    expect([s.template, s.fixture, s.page]).toEqual(["match-preview", 0, 1]);
    expect(decodeSpec("?t=match-report&fx=0&pg=0").page).toBe(1);
    expect(decodeSpec("?pg=999").page).toBe(20);
  });
  it("the default spec has no fixture and page 1, and leaves them out of the link", () => {
    expect([DEFAULT_SPEC.fixture, DEFAULT_SPEC.page]).toEqual([0, 1]);
    expect(encodeSpec(DEFAULT_SPEC)).toBe("");
  });
  it("only predictions and previews are marked as projections", () => {
    expect(usesProjections({ ...DEFAULT_SPEC, template: "match-predictions" })).toBe(true);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "match-preview" })).toBe(true);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "match-results" })).toBe(false);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "match-report" })).toBe(false);
    expect(footerNote({ ...DEFAULT_SPEC, template: "match-predictions" }, "GW9")).toContain("estimates");
    expect(footerNote({ ...DEFAULT_SPEC, template: "match-results" }, "GW8")).not.toContain("estimates");
  });
});

describe("captions and empty graphics", () => {
  const spec = (template: GraphicSpec["template"]): GraphicSpec => ({ ...DEFAULT_SPEC, template });
  const predictions = buildMatchPredictions({ fixtures, gameweek: 9, model, teamShortById, teamNameById, page: 1, limit: 10 });
  const results = buildMatchResults({ fixtures, gameweek: 7, elements, teamShortById, teamNameById, page: 1, limit: 10 });
  const data = (d: GraphicData) => d;

  it("a prediction caption uses only numbers on the image and stays within 256 characters", () => {
    const caption = buildCaption(data({ kind: "match-predictions", predictions, gwLabel: "GW9", subtitle: "" }), spec("match-predictions"));
    expect(caption).toContain("GW9");
    expect(caption).toContain("ARS 2.1-0.8 BOU");
    expect(caption).toContain("#GW9");
    expect(caption).toContain("fpldilemmas.com");
    expect(caption.length).toBeLessThanOrEqual(256);
  });
  it("a results caption gives the real scores", () => {
    const caption = buildCaption(data({ kind: "match-results", results, gwLabel: "GW7", subtitle: "" }), spec("match-results"));
    expect(caption).toContain("ARS 2-0 AVL");
    expect(caption).toContain("BOU 1-1 BRE");
    expect(caption.length).toBeLessThanOrEqual(256);
  });
  it("a preview and a report caption name the match", () => {
    const preview = buildMatchPreview({ fixture: fixtures[5], fixtures, model, elements, projections: [], teamShortById, teamNameById })!;
    const pc = buildCaption(data({ kind: "match-preview", preview, gwLabel: "GW9" }), spec("match-preview"));
    expect(pc).toContain("ARS v BOU");
    const report = buildMatchReport({ fixture: fixtures[0], elements, teamShortById, teamNameById })!;
    const rc = buildCaption(data({ kind: "match-report", report, gwLabel: "GW7" }), spec("match-report"));
    expect(rc).toContain("ARS 2-0 AVL");
    expect(rc.length).toBeLessThanOrEqual(256);
  });
  it("empty prediction and results lists count as empty graphics; a preview or report never does", () => {
    const empty = buildMatchPredictions({ fixtures, gameweek: 7, model, teamShortById, teamNameById, page: 1, limit: 10 });
    expect(isEmptyGraphic({ kind: "match-predictions", predictions: empty, gwLabel: "GW7", subtitle: "" })).toBe(true);
    expect(isEmptyGraphic({ kind: "match-predictions", predictions, gwLabel: "GW9", subtitle: "" })).toBe(false);
    expect(isEmptyGraphic({ kind: "match-results", results, gwLabel: "GW7", subtitle: "" })).toBe(false);
    const none = buildMatchResults({ fixtures, gameweek: 9, elements, teamShortById, teamNameById, page: 1, limit: 10 });
    expect(isEmptyGraphic({ kind: "match-results", results: none, gwLabel: "GW9", subtitle: "" })).toBe(true);
  });
  it("sizes still define footers for the new templates (watermark strip is shared)", () => {
    for (const s of Object.keys(GRAPHIC_SIZES)) expect(footerNote({ ...DEFAULT_SPEC, template: "match-results", size: s as any }, "GW8").length).toBeGreaterThan(0);
  });
});

describe("matchGraphicLink (the Share image buttons on the other pages)", () => {
  it("opens Match Predictions or Match Results on a gameweek", () => {
    const p = decodeSpec(matchGraphicLink({ template: "match-predictions", gameweek: 9 }).split("?")[1]);
    expect([p.template, p.from, p.to]).toEqual(["match-predictions", 9, 9]);
    const r = decodeSpec(matchGraphicLink({ template: "match-results", gameweek: 7 }).split("?")[1]);
    expect([r.template, r.from, r.to]).toEqual(["match-results", 7, 7]);
  });
  it("opens a Match Preview or Match Report on one fixture (and its gameweek)", () => {
    const s = decodeSpec(matchGraphicLink({ template: "match-report", fixture: 55, gameweek: 7 }).split("?")[1]);
    expect([s.template, s.fixture, s.from]).toEqual(["match-report", 55, 7]);
  });
  it("leaves the gameweek out when it is not a real one, so the graphic picks its own default", () => {
    for (const gameweek of [0, -1, NaN, undefined]) {
      const link = matchGraphicLink({ template: "match-predictions", gameweek: gameweek as number | undefined });
      expect(link).toBe("/graphics?t=match-predictions");
    }
  });
  it("always points at the Graphics Maker page", () => {
    expect(matchGraphicLink({ template: "match-preview", fixture: 3 }).startsWith("/graphics?")).toBe(true);
  });
});

describe("defensive contributions in the match report", () => {
  const stats: MatchFixtureInput["stats"] = [
    {
      identifier: "defensive_contribution",
      h: [{ value: 14, element: 3 }, { value: 9, element: 5 }, { value: 12, element: 1 }, { value: 11, element: 4 }, { value: 3, element: 2 }, { value: 0, element: 7 }],
      a: [{ value: 12, element: 22 }, { value: 12, element: 21 }],
    },
  ];
  const report = buildMatchReport({ fixture: done(80, 8, 1, 2, 2, 1, stats), elements, teamShortById, teamNameById })!;

  it("lists the biggest contributors of both sides, most first; level counts go to the home side, then by name", () => {
    expect(report.defensive.map((d) => `${d.name} ${d.value}`)).toEqual(["Saliba 14", "Saka 12", "Martinez 12", "Watkins 12", "Odegaard 11", "Gabriel 9"]);
    expect(report.defensive.map((d) => d.teamShort)).toEqual(["ARS", "ARS", "AVL", "AVL", "ARS", "ARS"]);
  });
  it("shows at most the list limit and never a player with none", () => {
    expect(report.defensive).toHaveLength(DEFENSIVE_LIST_LIMIT);
    expect(report.defensive.map((d) => d.name)).not.toContain("Havertz"); // 3, cut by the limit
    const noZero = buildMatchReport({ fixture: done(81, 8, 1, 2, 0, 0, [{ identifier: "defensive_contribution", h: [{ value: 0, element: 3 }], a: [] }]), elements, teamShortById, teamNameById })!;
    expect(noZero.defensive).toEqual([]);
  });
  it("marks who earned the 2 points: defenders from 10, midfielders and forwards from 12, goalkeepers never", () => {
    const earned = Object.fromEntries(report.defensive.map((d) => [d.name, d.earned]));
    expect(earned).toMatchObject({ Saliba: true, Saka: true, Watkins: true, Martinez: false, Odegaard: false, Gabriel: false });
  });
  it("earnsDefensivePoints follows the same rule the site's CBIT points use", () => {
    expect(earnsDefensivePoints(9, "DEF")).toBe(false);
    expect(earnsDefensivePoints(10, "DEF")).toBe(true);
    expect(earnsDefensivePoints(11, "MID")).toBe(false);
    expect(earnsDefensivePoints(12, "MID")).toBe(true);
    expect(earnsDefensivePoints(11, "FWD")).toBe(false);
    expect(earnsDefensivePoints(12, "FWD")).toBe(true);
    expect(earnsDefensivePoints(40, "GKP")).toBe(false);
    expect(earnsDefensivePoints(40, null)).toBe(false);
  });
  it("copes with a player who is not in the player list", () => {
    const r = buildMatchReport({ fixture: done(82, 8, 1, 2, 1, 0, [{ identifier: "defensive_contribution", h: [{ value: 20, element: 99999 }], a: [] }]), elements, teamShortById, teamNameById })!;
    expect(r.defensive).toEqual([{ name: "Unknown", teamShort: "ARS", value: 20, earned: false }]);
  });
});

describe("other point-scoring components in the match report", () => {
  const stats: MatchFixtureInput["stats"] = [
    { identifier: "saves", h: [{ value: 0, element: 99 }], a: [{ value: 7, element: 22 }] },
    { identifier: "own_goals", h: [{ value: 1, element: 5 }], a: [{ value: 2, element: 21 }] },
    { identifier: "penalties_saved", h: [], a: [{ value: 1, element: 22 }] },
  ];
  const report = buildMatchReport({ fixture: done(90, 8, 1, 2, 3, 0, stats), elements, teamShortById, teamNameById })!;

  it("lists goalkeeper saves, most first, with the points they earn (1 for every 3)", () => {
    expect(report.saves).toEqual([{ name: "Martinez", teamShort: "AVL", value: 7, points: 2 }]);
  });
  it("never lists a goalkeeper with no saves", () => {
    const r = buildMatchReport({ fixture: done(91, 8, 1, 2, 1, 0, [{ identifier: "saves", h: [{ value: 0, element: 22 }], a: [] }]), elements, teamShortById, teamNameById })!;
    expect(r.saves).toEqual([]);
  });
  it("orders level saves home side first, then by name", () => {
    const r = buildMatchReport({ fixture: done(92, 8, 6, 2, 1, 0, [{ identifier: "saves", h: [{ value: 3, element: 14 }], a: [{ value: 3, element: 22 }] }]), elements, teamShortById, teamNameById })!;
    expect(r.saves.map((s) => s.name)).toEqual(["Alisson", "Martinez"]);
    expect(r.saves.map((s) => s.points)).toEqual([1, 1]);
  });
  it("notes own goals after the penalties", () => {
    expect(report.notes).toEqual(["Martinez saved a penalty", "Gabriel scored an own goal", "Watkins scored 2 own goals"]);
  });
  it("lists the clubs that kept a clean sheet: the side that conceded none", () => {
    expect(report.cleanSheets).toEqual(["ARS"]);
    const draw = buildMatchReport({ fixture: done(93, 8, 1, 2, 0, 0), elements, teamShortById, teamNameById })!;
    expect(draw.cleanSheets).toEqual(["ARS", "AVL"]);
    const both = buildMatchReport({ fixture: done(94, 8, 1, 2, 1, 1), elements, teamShortById, teamNameById })!;
    expect(both.cleanSheets).toEqual([]);
    const away = buildMatchReport({ fixture: done(95, 8, 1, 2, 0, 2), elements, teamShortById, teamNameById })!;
    expect(away.cleanSheets).toEqual(["AVL"]);
  });
});

describe("the match report caption carries the other point-scoring components", () => {
  const stats: MatchFixtureInput["stats"] = [
    { identifier: "saves", h: [{ value: 4, element: 14 }], a: [{ value: 7, element: 22 }, { value: 0, element: 99 }] },
    { identifier: "own_goals", h: [{ value: 1, element: 5 }], a: [] },
    { identifier: "penalties_saved", h: [], a: [{ value: 1, element: 22 }] },
  ];
  const spec = { ...DEFAULT_SPEC, template: "match-report" as const };
  const caption = (fixture: MatchFixtureInput) =>
    buildCaption({ kind: "match-report", report: buildMatchReport({ fixture, elements, teamShortById, teamNameById })!, gwLabel: "GW8" }, spec);

  it("names the clean sheets, the saves and the penalty and own-goal notes", () => {
    const c = caption(done(96, 8, 1, 2, 1, 0, stats));
    expect(c).toContain("ARS 1-0 AVL");
    expect(c).toContain("clean sheet: ARS");
    expect(c).toContain("saves: Martinez 7, Alisson 4");
    expect(c).toContain("Martinez saved a penalty");
    expect(c).toContain("Gabriel scored an own goal");
    expect(c.length).toBeLessThanOrEqual(256);
  });
  it("says clean sheets (plural) when both sides kept one, and leaves out whatever did not happen", () => {
    const c = caption(done(97, 8, 1, 2, 0, 0));
    expect(c).toContain("clean sheets: ARS & AVL");
    expect(c).not.toContain("saves");
    expect(c).not.toContain("own goal");
  });
  it("is just the headline when nothing else happened", () => {
    const c = caption(done(98, 8, 1, 2, 1, 1));
    expect(c).toContain("ARS 1-1 AVL");
    expect(c).not.toContain("clean sheet");
  });
});
