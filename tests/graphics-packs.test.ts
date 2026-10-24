import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC,
  GAMEWEEK_PACK,
  REVIEW_PACK,
  decodeSpec,
  encodeSpec,
  packFileName,
  packSpecs,
  packZipName,
  reviewPackSpecs,
  reviewZipName,
  type GraphicSpec,
} from "../shared/graphics";
import { MATCH_LIST_LIMIT, predictionPageCount, resultsPageCount, type MatchFixtureInput } from "../shared/graphics-matches";
import { formExtremes } from "../shared/graphics-teams";
import { graphicDataRequests, loadGraphicData, makeGraphicDataContext, resolveGameweeks } from "../client/src/lib/graphic-data";

const base: GraphicSpec = { ...DEFAULT_SPEC, template: "player-card", size: "portrait", theme: "midnight", handle: "steve", accent: "#fbbf24", headline: "mine", players: [1], teams: [2], quote: "q", fixture: 5, page: 3, stat: "assists", pos: "MID", metric: "assists", venue: "away" };

describe("the Preview pack", () => {
  const specs = packSpecs(base, 9, { deadline: "2026-10-24T16:30:00Z" });
  it("keeps the original seven images first and in order, then adds the projection images", () => {
    expect(GAMEWEEK_PACK.map((x) => x.id).slice(0, 7)).toEqual(["deadline", "captains", "differentials", "availability", "fixtures", "transfers", "prices"]);
    expect(specs.map((x) => x.spec.template)).toEqual([
      "cover", "captain-picks", "top-differentials", "availability-watch", "fixture-ticker", "transfer-trends", "price-change",
      "match-predictions", "team-projections", "team-projections", "player-projections",
    ]);
  });
  it("match predictions and player projections are for the chosen gameweek, the team projections for it and the next four", () => {
    expect(specs[7].spec).toMatchObject({ template: "match-predictions", from: 9, to: 9, page: 1 });
    expect(specs[8].spec).toMatchObject({ template: "team-projections", metric: "goals-for", from: 9, to: 13 });
    expect(specs[9].spec).toMatchObject({ template: "team-projections", metric: "clean-sheets", from: 9, to: 13 });
    expect(specs[10].spec).toMatchObject({ template: "player-projections", from: 9, to: 9, pos: null });
  });
  it("never runs past gameweek 38", () => {
    const late = packSpecs(base, 37, { deadline: null });
    expect(late[8].spec).toMatchObject({ from: 37, to: 38 });
    expect(late[10].spec).toMatchObject({ from: 37, to: 37 });
  });
  it("every image keeps only the user's size, theme, handle and accent, and survives the link round trip", () => {
    for (const { spec } of specs) {
      expect(spec).toMatchObject({ size: "portrait", theme: "midnight", handle: "steve", accent: "#fbbf24" });
      expect([spec.players, spec.teams, spec.quote, spec.fixture, spec.stat, spec.venue]).toEqual([[], [], "", 0, DEFAULT_SPEC.stat, "all"]);
      expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
    }
  });
  it("a long gameweek gets one match-predictions image per page, together, with the pages numbered", () => {
    const paged = packSpecs(base, 9, { deadline: null, matchPages: 3 });
    expect(paged.map((x) => x.spec.template)).toEqual([
      "cover", "captain-picks", "top-differentials", "availability-watch", "fixture-ticker", "transfer-trends", "price-change",
      "match-predictions", "match-predictions", "match-predictions", "team-projections", "team-projections", "player-projections",
    ]);
    expect(paged.slice(7, 10).map((x) => x.spec.page)).toEqual([1, 2, 3]);
    expect(paged.slice(7, 10).map((x) => x.item.label)).toEqual(["Match predictions (page 1 of 3)", "Match predictions (page 2 of 3)", "Match predictions (page 3 of 3)"]);
    expect(new Set(paged.map((x) => x.item.id)).size).toBe(paged.length);
  });
  it("a single page is labelled without page numbers", () => {
    expect(specs[7].item.label).toBe("Match predictions");
  });
  it("file names are numbered in order and the original zip name is unchanged", () => {
    expect(packFileName(7, "match-predictions")).toBe("08-match-predictions.png");
    expect(packZipName(9)).toBe("fpl-dilemmas-gw9-pack.zip");
  });
});

describe("the Review pack", () => {
  const specs = reviewPackSpecs(base, 7, { resultsPages: 1, bestForm: 3, worstForm: 5 });
  it("is the finished gameweek's cover, results, team of the week, top scorers, the table, then the best and worst form", () => {
    expect(REVIEW_PACK.map((x) => x.id)).toEqual(["cover", "results", "totw", "scorers", "table", "form-best", "form-worst"]);
    expect(specs.map((x) => x.spec.template)).toEqual(["cover", "match-results", "team-of-the-week", "gw-top-scorers", "league-table", "team-history", "team-history"]);
  });
  it("is about that gameweek", () => {
    expect(specs[0].spec).toMatchObject({ headline: "GW7 Review" });
    expect(specs[0].spec.subtitle.length).toBeGreaterThan(0);
    expect(specs[1].spec).toMatchObject({ from: 7, to: 7, page: 1 });
    expect(specs[2].spec).toMatchObject({ from: 7, to: 7 });
    expect(specs[3].spec).toMatchObject({ from: 7, to: 7 });
  });
  it("shows the two clubs picked for form", () => {
    expect(specs[5].spec.teams).toEqual([3]);
    expect(specs[6].spec.teams).toEqual([5]);
    expect(specs[5].item.label).toBe("Best form");
    expect(specs[6].item.label).toBe("Worst form");
  });
  it("leaves a form image out when there is no club for it", () => {
    expect(reviewPackSpecs(base, 7, { resultsPages: 1, bestForm: 3, worstForm: null }).map((x) => x.spec.template).filter((t) => t === "team-history")).toHaveLength(1);
    expect(reviewPackSpecs(base, 7, { resultsPages: 1, bestForm: null, worstForm: null }).map((x) => x.spec.template)).toEqual(["cover", "match-results", "team-of-the-week", "gw-top-scorers", "league-table"]);
  });
  it("a long gameweek gets one results image per page", () => {
    const paged = reviewPackSpecs(base, 7, { resultsPages: 2, bestForm: null, worstForm: null });
    expect(paged.map((x) => x.spec.template).slice(0, 3)).toEqual(["cover", "match-results", "match-results"]);
    expect(paged.slice(1, 3).map((x) => x.spec.page)).toEqual([1, 2]);
    expect(paged[1].item.label).toBe("Match results (page 1 of 2)");
    expect(new Set(paged.map((x) => x.item.id)).size).toBe(paged.length);
  });
  it("keeps only the user's size, theme, handle and accent and survives the link round trip", () => {
    for (const { spec } of specs) {
      expect(spec).toMatchObject({ size: "portrait", theme: "midnight", handle: "steve", accent: "#fbbf24" });
      expect([spec.players, spec.quote, spec.fixture, spec.venue]).toEqual([[], "", 0, "all"]);
      expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
    }
  });
  it("has its own zip name", () => {
    expect(reviewZipName(7)).toBe("fpl-dilemmas-gw7-review-pack.zip");
    expect(reviewZipName(7)).not.toBe(packZipName(7));
  });
});

describe("page counts", () => {
  const fx = (id: number, event: number | null, finished: boolean, started = finished): MatchFixtureInput => ({ id, event, team_h: 1, team_a: 2, kickoff_time: "2026-10-24T15:00:00Z", started, finished, finished_provisional: finished, team_h_score: finished ? 1 : null, team_a_score: finished ? 0 : null });
  it("predictions: pages of the size's limit over the gameweek's fixtures still to play", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => fx(i + 1, 9, false));
    expect(predictionPageCount(twelve, 9, MATCH_LIST_LIMIT.square)).toBe(2);
    expect(predictionPageCount(twelve, 9, 6)).toBe(2);
    expect(predictionPageCount(twelve, 9, 12)).toBe(1);
    expect(predictionPageCount(twelve, 10, 10)).toBe(1); // nothing there: still one (empty) page, never zero
  });
  it("results: pages over the gameweek's finished matches only", () => {
    const list = [...Array.from({ length: 7 }, (_, i) => fx(i + 1, 7, true)), fx(50, 7, false)];
    expect(resultsPageCount(list, 7, 6)).toBe(2);
    expect(resultsPageCount(list, 7, 10)).toBe(1);
  });
});

describe("formExtremes: the best and worst form clubs after a gameweek", () => {
  const res = (id: number, event: number, h: number, a: number, hs: number, as: number): MatchFixtureInput =>
    ({ id, event, team_h: h, team_a: a, kickoff_time: `2026-09-${String(event).padStart(2, "0")}T15:00:00Z`, started: true, finished: true, finished_provisional: true, team_h_score: hs, team_a_score: as });
  // five gameweeks among clubs 1-4: club 1 wins everything, club 4 loses everything, 2 and 3 draw each other
  const fixtures: MatchFixtureInput[] = [];
  let id = 1;
  for (let gw = 1; gw <= 5; gw++) {
    fixtures.push(res(id++, gw, 1, 4, 3, 0));
    fixtures.push(res(id++, gw, 2, 3, 1, 1));
  }
  it("picks the club with most points over its last five results, and the one with fewest", () => {
    expect(formExtremes(fixtures, 5, [1, 2, 3, 4])).toEqual({ best: 1, worst: 4 });
  });
  it("only counts results up to and including the gameweek", () => {
    const later = [...fixtures, res(id++, 6, 4, 1, 9, 0)]; // after GW5: ignored
    expect(formExtremes(later, 5, [1, 2, 3, 4])).toEqual({ best: 1, worst: 4 });
  });
  it("uses the last five only: an old bad run does not count against a club that has recovered", () => {
    const list: MatchFixtureInput[] = [];
    let n = 100;
    for (let gw = 1; gw <= 3; gw++) list.push(res(n++, gw, 4, 1, 0, 4)); // club 4 loses early
    for (let gw = 4; gw <= 8; gw++) list.push(res(n++, gw, 4, 1, 2, 0)); // then wins five
    expect(formExtremes(list, 8, [1, 4])).toEqual({ best: 4, worst: 1 });
  });
  it("breaks level points by goal difference over those results, then by the lower club id", () => {
    const list = [res(1, 1, 1, 3, 1, 0), res(2, 1, 2, 4, 5, 0), res(3, 2, 1, 3, 1, 0), res(4, 2, 2, 4, 5, 0), res(5, 3, 1, 3, 1, 0), res(6, 3, 2, 4, 5, 0)];
    // clubs 1 and 2 both have 9 points; club 2 has the better goal difference. Clubs 3 and 4 both have 0; club 4 has the worse.
    expect(formExtremes(list, 3, [1, 2, 3, 4])).toEqual({ best: 2, worst: 4 });
  });
  it("ignores clubs with fewer than three results", () => {
    const list = [res(1, 1, 1, 2, 3, 0), res(2, 2, 1, 2, 3, 0)];
    expect(formExtremes(list, 2, [1, 2])).toEqual({ best: null, worst: null });
  });
  it("never gives the same club as best and worst", () => {
    const list = [res(1, 1, 1, 2, 1, 0), res(2, 2, 1, 3, 1, 0), res(3, 3, 1, 2, 1, 0), res(4, 4, 2, 1, 0, 1)];
    const r = formExtremes(list, 4, [1]);
    expect(r).toEqual({ best: 1, worst: null });
  });
  it("is empty when there are no results", () => {
    expect(formExtremes([], 5, [1, 2])).toEqual({ best: null, worst: null });
  });
});

describe("loading the data a graphic needs (so the packs never depend on what the page had loaded)", () => {
  const bootstrap: any = {
    teams: [{ id: 1, name: "Arsenal", short_name: "ARS" }, { id: 2, name: "Aston Villa", short_name: "AVL" }],
    elements: [{ id: 7, web_name: "Saka", team: 1, element_type: 3, now_cost: 100, status: "a" }],
    events: [
      { id: 7, finished: true, is_current: false, is_next: false },
      { id: 8, finished: false, is_current: true, is_next: false },
      { id: 9, finished: false, is_current: false, is_next: true },
    ],
  };
  const fixtures: any[] = [
    { id: 1, event: 7, team_h: 1, team_a: 2, kickoff_time: "2026-10-17T15:00:00Z", started: true, finished: true, finished_provisional: true, team_h_score: 2, team_a_score: 0, stats: [] },
    { id: 2, event: 9, team_h: 2, team_a: 1, kickoff_time: "2026-10-31T15:00:00Z", started: false, finished: false, finished_provisional: false, team_h_score: null, team_a_score: null },
  ];
  const ctx = makeGraphicDataContext({ bootstrap, projections: [], fixtures, liveElements: undefined, priceChanges: [] });
  const spec = (patch: Partial<GraphicSpec>): GraphicSpec => ({ ...DEFAULT_SPEC, ...patch });

  it("lists exactly the requests a graphic needs, and none for graphics built from the base data", () => {
    expect(graphicDataRequests(spec({ template: "captain-picks" }), ctx)).toEqual([]);
    expect(graphicDataRequests(spec({ template: "match-results" }), ctx)).toEqual([]);
    expect(graphicDataRequests(spec({ template: "match-predictions", from: 9, to: 9 }), ctx)).toEqual([
      "/api/team-goal-projections?startGameweek=9&endGameweek=9",
      "/api/team-cs-projections?startGameweek=9&endGameweek=9",
      "/api/fixture-odds-current",
    ]);
    expect(graphicDataRequests(spec({ template: "team-projections", metric: "clean-sheets", from: 9, to: 13 }), ctx)).toEqual(["/api/team-cs-projections?startGameweek=9&endGameweek=13"]);
    expect(graphicDataRequests(spec({ template: "league-table" }), ctx)).toEqual(["/api/current-standings?venue=all"]);
    expect(graphicDataRequests(spec({ template: "gw-top-scorers", from: 7, to: 7 }), ctx)).toEqual(["/api/event/7/live"]);
    expect(graphicDataRequests(spec({ template: "team-of-the-week" }), ctx)).toEqual(["/api/event/7/live"]); // defaults to the latest finished gameweek
    expect(graphicDataRequests(spec({ template: "player-history", players: [7] }), ctx)).toEqual(["/api/element-summary/7"]);
    expect(graphicDataRequests(spec({ template: "predicted-lineup", teams: [1] }), ctx)).toEqual(["/api/player-detailed-positions"]);
  });

  it("fetches each of them once and puts the results where the graphic builders look", async () => {
    const asked: string[] = [];
    const responses: Record<string, any> = {
      "/api/team-goal-projections?startGameweek=9&endGameweek=9": [{ teamId: 2, fixtureDetails: { "9": [{ opponent: "ARS", isHome: true, goals: 1.1 }] } }],
      "/api/team-cs-projections?startGameweek=9&endGameweek=9": [],
      "/api/fixture-odds-current": { odds: [{ homeTeam: "Aston Villa", awayTeam: "Arsenal", homeWinProb: 0.2, drawProb: 0.3, awayWinProb: 0.5 }] },
    };
    const loaded = await loadGraphicData(spec({ template: "match-predictions", from: 9, to: 9 }), ctx, async (url) => {
      asked.push(url);
      return responses[url];
    });
    expect(asked.sort()).toEqual(Object.keys(responses).sort());
    expect(loaded.matchModelGw).toBe(9);
    expect(loaded.matchModel?.odds).toHaveLength(1);
    expect(loaded.matchModel?.goals).toHaveLength(1);
    // the graphic can now be built
    const { computeGraphicData } = await import("../client/src/lib/graphic-data");
    const { data } = computeGraphicData(spec({ template: "match-predictions", from: 9, to: 9 }), loaded);
    expect(data?.kind).toBe("match-predictions");
  });

  it("carries team data with its URL, live points and a player's history", async () => {
    const team = await loadGraphicData(spec({ template: "league-table" }), ctx, async () => [{ id: 1 }]);
    expect(team.teamData).toEqual({ url: "/api/current-standings?venue=all", data: [{ id: 1 }] });
    const live = await loadGraphicData(spec({ template: "gw-top-scorers", from: 7, to: 7 }), ctx, async () => ({ elements: [{ id: 7, stats: { total_points: 9, minutes: 90 } }] }));
    expect(live.liveElements).toHaveLength(1);
    const hist = await loadGraphicData(spec({ template: "player-history", players: [7] }), ctx, async () => ({ history: [{ round: 7 }] }));
    expect(hist.playerHistory).toEqual({ playerId: 7, history: [{ round: 7 }] });
    const lineup = await loadGraphicData(spec({ template: "predicted-lineup", teams: [1] }), ctx, async () => [
      { fplPlayerId: 7, mainPosition: "LB", otherPositions: ["CB"] },
      { fplPlayerId: 8, mainPosition: "ST", otherPositions: [] },
    ]);
    expect(lineup.detailedPositions).toEqual(new Map([[7, ["LB", "CB"]], [8, ["ST"]]]));
  });

  it("leaves the context as it was when a graphic needs nothing, and does not change the original", async () => {
    let calls = 0;
    const same = await loadGraphicData(spec({ template: "captain-picks" }), ctx, async () => { calls++; return null; });
    expect(calls).toBe(0);
    expect(same).toEqual(ctx);
    await loadGraphicData(spec({ template: "league-table" }), ctx, async () => []);
    expect(ctx.teamData).toBeUndefined();
  });

  it("a failed request fails the load (the pack then says it could not load the data)", async () => {
    await expect(loadGraphicData(spec({ template: "league-table" }), ctx, async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  });
});

describe("Player Projections default range", () => {
  const range = { from: 9, to: 13 };
  it("is one gameweek (the first of the default range) when none is chosen", () => {
    const r = resolveGameweeks({ template: "player-projections", from: 0, to: 0 }, range);
    expect([r.from, r.to, r.gameweeks, r.gwLabel]).toEqual([9, 9, [9], "GW9"]);
  });
  it("follows a chosen first gameweek, still one gameweek", () => {
    const r = resolveGameweeks({ template: "player-projections", from: 11, to: 0 }, range);
    expect([r.from, r.to]).toEqual([11, 11]);
  });
  it("still honours a range the user chose", () => {
    const r = resolveGameweeks({ template: "player-projections", from: 9, to: 12 }, range);
    expect([r.from, r.to]).toEqual([9, 12]);
  });
  it("leaves the other templates on the default range", () => {
    const r = resolveGameweeks({ template: "team-projections", from: 0, to: 0 }, range);
    expect([r.from, r.to]).toEqual([9, 13]);
    const spec = resolveGameweeks({ from: 0, to: 0 }, range);
    expect([spec.from, spec.to]).toEqual([9, 13]);
  });
});
