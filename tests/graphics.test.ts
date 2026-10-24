import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC,
  GRAPHIC_SIZES,
  GRAPHIC_STATS,
  GRAPHIC_TEMPLATES,
  GRAPHIC_THEMES,
  WATERMARK_SITE,
  buildComparison,
  buildDifferentials,
  buildFixturesGrid,
  buildPlayerCard,
  buildPredictedLineup,
  buildTeamReveal,
  buildCover,
  buildNewsQuote,
  buildCaptainPicks,
  buildFixtureTicker,
  buildTransferTrends,
  buildTeamOfTheWeek,
  buildStatLeaders,
  buildAvailabilityWatch,
  isEmptyGraphic,
  MIN_WATCH_OWNERSHIP,
  buildCaption,
  buildCaptionsFile,
  formatDeadline,
  GAMEWEEK_PACK,
  normaliseAccent,
  normaliseHandle,
  packFileName,
  packSpecs,
  packZipName,
  withAccent,
  type GraphicData,
  formatCount,
  LEADER_STATS,
  formatNewsDate,
  quoteFont,
  coverTitleFont,
  canAddToSquad,
  squadCounts,
  squadFromPicks,
  suggestSquadSetup,
  buildPriceChanges,
  contrastRatio,
  decodeSpec,
  encodeSpec,
  fdrColor,
  footerHeight,
  footerNote,
  gameweekLabel,
  graphicFileName,
  resolveHeadline,
  resolveTheme,
  usesProjections,
  watermarkText,
  type GraphicElement,
  type GraphicSpec,
} from "../shared/graphics";
import { teamColor } from "../client/src/lib/team-colors";

function el(over: Partial<GraphicElement> & { id: number }): GraphicElement {
  return {
    web_name: `P${over.id}`,
    team: 1,
    element_type: 3,
    now_cost: 80,
    selected_by_percent: "12.5",
    form: "5.5",
    points_per_game: "6.1",
    total_points: 60,
    minutes: 900,
    goals_scored: 5,
    assists: 3,
    clean_sheets: 2,
    saves: 0,
    goals_conceded: 8,
    bonus: 7,
    bps: 200,
    ict_index: "90.1",
    threat: "400",
    creativity: "300",
    influence: "200",
    status: "a",
    ...over,
  } as GraphicElement;
}

describe("spec <-> URL", () => {
  it("round trips every template", () => {
    for (const t of GRAPHIC_TEMPLATES) {
      const spec: GraphicSpec = {
        ...DEFAULT_SPEC,
        template: t.id,
        size: "portrait",
        theme: "light",
        headline: "My edit",
        players: [11, 22],
        teams: [3, 4, 5],
        stats: ["now_cost", "form"],
        from: 8,
        to: 12,
        pos: "MID",
        maxOwn: 5,
        top: 7,
        date: "2026-10-20",
      };
      expect(decodeSpec(encodeSpec(spec))).toEqual(decodeSpec(encodeSpec(decodeSpec(encodeSpec(spec)))));
      const back = decodeSpec(encodeSpec(spec));
      expect(back.template).toBe(t.id);
      expect(back.size).toBe("portrait");
      expect(back.theme).toBe("light");
      expect(back.headline).toBe("My edit");
      expect(back.stats).toEqual(["now_cost", "form"]);
      expect(back.from).toBe(8);
      expect(back.to).toBe(12);
      expect(back.pos).toBe("MID");
      expect(back.maxOwn).toBe(5);
      expect(back.top).toBe(7);
      expect(back.date).toBe("2026-10-20");
    }
  });

  it("empty or junk input gives the defaults", () => {
    expect(decodeSpec("")).toEqual(DEFAULT_SPEC);
    expect(decodeSpec("?t=nope&size=huge&theme=pink&from=abc&to=-4&pos=XYZ&own=999&top=0&d=yesterday&p=a,b&tm=0,x&s=bogus")).toEqual(DEFAULT_SPEC);
  });

  it("accepts a leading ? and keeps default values out of the link", () => {
    expect(encodeSpec(DEFAULT_SPEC)).toBe("");
    expect(decodeSpec("?t=price-change").template).toBe("price-change");
    expect(encodeSpec({ ...DEFAULT_SPEC, template: "price-change" })).toBe("t=price-change");
  });

  it("limits how many players and teams each template keeps", () => {
    expect(decodeSpec("t=player-card&p=1,2,3").players).toEqual([1]);
    expect(decodeSpec("t=player-comparison&p=1,2,3,4,5").players).toEqual([1, 2, 3]);
    expect(decodeSpec("t=fixtures-comparison&tm=1,2,3,4,5,6").teams).toEqual([1, 2, 3, 4]);
  });

  it("drops duplicate ids, unknown stat keys, and caps stats at 8", () => {
    expect(decodeSpec("t=player-comparison&p=5,5,6").players).toEqual([5, 6]);
    expect(decodeSpec("s=form,bogus,form,now_cost").stats).toEqual(["form", "now_cost"]);
    const many = GRAPHIC_STATS.map((s) => s.key).join(",");
    expect(decodeSpec(`s=${many}`).stats.length).toBe(8);
  });

  it("keeps gameweek ranges sane: to is never before from, at most 8 gameweeks", () => {
    expect(decodeSpec("from=10&to=4")).toMatchObject({ from: 10, to: 10 });
    expect(decodeSpec("from=3&to=30")).toMatchObject({ from: 3, to: 10 });
    expect(decodeSpec("from=0&to=0")).toMatchObject({ from: 0, to: 0 });
  });

  it("clamps ownership cap (1-100), Top N (3-10), headline length", () => {
    expect(decodeSpec("own=0").maxOwn).toBe(DEFAULT_SPEC.maxOwn);
    expect(decodeSpec("own=100").maxOwn).toBe(100);
    expect(decodeSpec("top=2").top).toBe(3);
    expect(decodeSpec("top=50").top).toBe(10);
    expect(decodeSpec(`h=${"x".repeat(200)}`).headline.length).toBe(60);
  });
});

describe("sizes, themes, watermark", () => {
  it("has the three agreed sizes", () => {
    expect(GRAPHIC_SIZES.square).toMatchObject({ width: 1080, height: 1080 });
    expect(GRAPHIC_SIZES.portrait).toMatchObject({ width: 1080, height: 1350 });
    expect(GRAPHIC_SIZES.landscape).toMatchObject({ width: 1200, height: 675 });
  });

  it("every graphic carries the FPL Dilemmas watermark with the site address", () => {
    expect(WATERMARK_SITE).toBe("fpldilemmas.com");
    expect(watermarkText()).toContain("FPL DILEMMAS");
    expect(watermarkText()).toContain("fpldilemmas.com");
  });

  it("reserves a footer strip for the watermark at every size, smaller than 10% of the height", () => {
    for (const s of Object.keys(GRAPHIC_SIZES) as Array<keyof typeof GRAPHIC_SIZES>) {
      const h = footerHeight(s);
      expect(h).toBeGreaterThanOrEqual(40);
      expect(h / GRAPHIC_SIZES[s].height).toBeLessThan(0.1);
    }
  });

  it("every theme has readable text on its background", () => {
    for (const id of GRAPHIC_THEMES) {
      const t = resolveTheme(id, null);
      for (const bg of [t.bg, t.bg2]) {
        expect(contrastRatio(t.text, bg)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(t.muted, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.accent, bg)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("the club theme uses the club colour as the accent and stays readable for every club", () => {
    const clubs = ["ARS", "AVL", "BOU", "BRE", "BHA", "BUR", "CHE", "COV", "CRY", "EVE", "FUL", "HUL", "IPS", "LEE", "LIV", "MCI", "MUN", "NEW", "NFO", "SUN", "TOT", "WHU", "WOL"];
    for (const short of clubs) {
      const t = resolveTheme("club", teamColor(short));
      for (const bg of [t.bg, t.bg2]) {
        expect(contrastRatio(t.accent, bg)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(t.text, bg)).toBeGreaterThanOrEqual(7);
      }
    }
    // a bright club colour is used as is
    expect(resolveTheme("club", "#FDB913").accent.toLowerCase()).toBe("#fdb913");
  });

  it("the club theme falls back to the default look with no club", () => {
    expect(resolveTheme("club", null)).toEqual(resolveTheme("indigo", null));
  });

  it("official FDR colours: 1-5, values outside are clamped", () => {
    expect(fdrColor(2).bg).not.toBe(fdrColor(4).bg);
    expect(fdrColor(0)).toEqual(fdrColor(1));
    expect(fdrColor(9)).toEqual(fdrColor(5));
    expect(fdrColor(3.4)).toEqual(fdrColor(3));
  });

  it("footer note says projections are estimates only for graphics that use them", () => {
    const withProj = { ...DEFAULT_SPEC, template: "top-differentials" as const };
    const without = { ...DEFAULT_SPEC, template: "price-change" as const };
    expect(usesProjections(withProj)).toBe(true);
    expect(usesProjections(without)).toBe(false);
    expect(footerNote(withProj, "GW10-14")).toContain("estimates");
    expect(footerNote(without, null)).not.toContain("estimates");
    expect(footerNote(withProj, "GW10-14")).toContain("GW10-14");
  });

  it("comparison and player card use projections only when xPts is shown", () => {
    expect(usesProjections({ ...DEFAULT_SPEC, template: "player-card" })).toBe(true);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "player-comparison", stats: ["now_cost", "form"] })).toBe(false);
    expect(usesProjections({ ...DEFAULT_SPEC, template: "player-comparison", stats: ["xpts", "form"] })).toBe(true);
  });

  it("headline defaults per template and can be overridden", () => {
    expect(resolveHeadline({ ...DEFAULT_SPEC, template: "price-change" })).toBe("Price Changes");
    expect(resolveHeadline({ ...DEFAULT_SPEC, template: "price-change", headline: "  Rises tonight  " })).toBe("Rises tonight");
  });

  it("gameweek label and file name", () => {
    expect(gameweekLabel(12, 12)).toBe("GW12");
    expect(gameweekLabel(12, 16)).toBe("GW12-16");
    expect(graphicFileName({ ...DEFAULT_SPEC, template: "price-change" }, ["2026-10-20"])).toBe("fpl-dilemmas-price-change-2026-10-20.png");
  });
});

describe("buildPlayerCard", () => {
  const fixtures = [
    { event: 8, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, finished: false },
    { event: 9, team_h: 3, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 3, finished: false },
    { event: 9, team_h: 1, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 3, finished: false },
  ];
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"], [3, "BOU"], [4, "BRE"]]);
  const card = buildPlayerCard({
    element: el({ id: 10, web_name: "Saka", now_cost: 101, selected_by_percent: "31.4" }),
    teamShortById,
    teamNameById: new Map([[1, "Arsenal"]]),
    gameweekProjections: { "8": 5.123, "9": 6.0, "10": 4.0 },
    gameweeks: [8, 9, 10],
    fixtures,
  });

  it("shows source values: price is now_cost/10, ownership is the FPL number", () => {
    expect(card.name).toBe("Saka");
    expect(card.price).toBe("£10.1m");
    expect(card.tiles.find((t) => t.label === "Selected by")?.value).toBe("31.4%");
    expect(card.tiles.find((t) => t.label === "Form")?.value).toBe("5.5");
    expect(card.tiles.find((t) => t.label === "Total points")?.value).toBe("60");
    expect(card.position).toBe("MID");
    expect(card.teamShort).toBe("ARS");
  });

  it("xPts uses exactly the chosen gameweeks and skips missing ones", () => {
    expect(card.xpts.total).toBe(15.12);
    expect(card.xpts.perGameweek.map((g) => g.gameweek)).toEqual([8, 9, 10]);
    const partial = buildPlayerCard({
      element: el({ id: 10 }), teamShortById, teamNameById: new Map(), gameweekProjections: { "8": 5 }, gameweeks: [8, 9], fixtures: [],
    });
    expect(partial.xpts.total).toBe(5);
    expect(partial.xpts.perGameweek[1].value).toBeNull();
    const none = buildPlayerCard({
      element: el({ id: 10 }), teamShortById, teamNameById: new Map(), gameweekProjections: undefined, gameweeks: [8, 9], fixtures: [],
    });
    expect(none.xpts.total).toBeNull();
  });

  it("fixtures: opponent, home/away, official difficulty; double gameweeks list both; blanks are empty", () => {
    expect(card.fixtures[0]).toEqual({ gameweek: 8, items: [{ opponent: "AVL", isHome: true, difficulty: 2 }] });
    expect(card.fixtures[1].items).toEqual([
      { opponent: "BOU", isHome: false, difficulty: 3 },
      { opponent: "BRE", isHome: true, difficulty: 2 },
    ]);
    expect(card.fixtures[2].items).toEqual([]);
  });

  it("position-specific tiles: GKP shows saves, MID shows goals and assists", () => {
    const gk = buildPlayerCard({ element: el({ id: 1, element_type: 1, saves: 22 }), teamShortById, teamNameById: new Map(), gameweekProjections: {}, gameweeks: [], fixtures: [] });
    expect(gk.tiles.map((t) => t.label)).toContain("Saves");
    expect(gk.tiles.map((t) => t.label)).not.toContain("Assists");
    expect(card.tiles.map((t) => t.label)).toContain("Assists");
  });
});

describe("buildComparison", () => {
  const a = el({ id: 1, web_name: "A", now_cost: 80, total_points: 70, goals_conceded: 12 });
  const b = el({ id: 2, web_name: "B", now_cost: 95, total_points: 50, goals_conceded: 6 });
  const xpts = new Map<number, number | null>([[1, 22.5], [2, 22.5]]);
  const teamShortById = new Map([[1, "ARS"]]);

  it("highlights the best value per row; lower-is-better stats are reversed", () => {
    const c = buildComparison({ elements: [a, b], statKeys: ["total_points", "goals_conceded"], xptsByPlayer: xpts, teamShortById });
    expect(c.rows.find((r) => r.key === "total_points")?.best).toEqual([0]);
    expect(c.rows.find((r) => r.key === "goals_conceded")?.best).toEqual([1]);
  });

  it("neutral stats (price, ownership) and ties are never highlighted", () => {
    const c = buildComparison({ elements: [a, b], statKeys: ["now_cost", "selected_by_percent", "xpts"], xptsByPlayer: xpts, teamShortById });
    for (const r of c.rows) expect(r.best).toEqual([]);
  });

  it("formats values and shows a dash for missing xPts", () => {
    const c = buildComparison({ elements: [a, b], statKeys: ["now_cost", "xpts"], xptsByPlayer: new Map([[1, 10.04], [2, null]]), teamShortById });
    expect(c.rows[0].values).toEqual(["£8.0m", "£9.5m"]);
    expect(c.rows[1].values).toEqual(["10.0", "—"]);
    expect(c.rows[1].best).toEqual([]);
  });

  it("keeps the order of players and stats chosen", () => {
    const c = buildComparison({ elements: [b, a], statKeys: ["form", "total_points"], xptsByPlayer: xpts, teamShortById });
    expect(c.columns.map((x) => x.name)).toEqual(["B", "A"]);
    expect(c.rows.map((r) => r.key)).toEqual(["form", "total_points"]);
  });

  it("falls back to default stats when none are chosen", () => {
    const c = buildComparison({ elements: [a, b], statKeys: [], xptsByPlayer: xpts, teamShortById });
    expect(c.rows.length).toBeGreaterThanOrEqual(5);
  });
});

describe("buildFixturesGrid", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"], [3, "BOU"]]);
  const teamNameById = new Map([[1, "Arsenal"], [2, "Aston Villa"], [3, "Bournemouth"]]);
  const fixtures = [
    { event: 8, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, finished: false },
    { event: 9, team_h: 3, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 3, finished: false },
    { event: 9, team_h: 1, team_a: 3, team_h_difficulty: 2, team_a_difficulty: 3, finished: false },
    { event: null, team_h: 2, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 3, finished: false },
  ];
  const scheduled = fixtures.filter((f) => f.event !== null);
  const grid = buildFixturesGrid({ teamIds: [1, 2], gameweeks: [8, 9], fixtures: scheduled, teamShortById, teamNameById });

  it("one row per team in the chosen order, one cell per gameweek", () => {
    expect(grid.rows.map((r) => r.short)).toEqual(["ARS", "AVL"]);
    expect(grid.rows[0].cells.map((c) => c.gameweek)).toEqual([8, 9]);
    expect(grid.gameweeks).toEqual([8, 9]);
  });

  it("double gameweeks hold both fixtures; blanks are flagged blank, not TBC, when nothing is unscheduled", () => {
    expect(grid.rows[0].cells[1].fixtures.length).toBe(2);
    expect(grid.rows[1].cells[1].fixtures.length).toBe(0);
    expect(grid.rows[1].cells[1].status).toBe("blank");
  });

  it("a team with an unscheduled fixture shows TBC instead of blank", () => {
    const villa = buildFixturesGrid({ teamIds: [2], gameweeks: [9], fixtures, teamShortById, teamNameById });
    expect(villa.rows[0].cells[0].status).toBe("tbc");
  });

  it("average difficulty counts every fixture (a double counts twice) and is null with none", () => {
    expect(grid.rows[0].avgFdr).toBeCloseTo((2 + 3 + 2) / 3, 5);
    const none = buildFixturesGrid({ teamIds: [3], gameweeks: [20], fixtures: [], teamShortById, teamNameById });
    expect(none.rows[0].avgFdr).toBeNull();
  });
});

describe("buildPriceChanges", () => {
  const change = (name: string, delta: number, date: string, ownership: number) => ({
    player_id: Math.round(Math.random() * 1e6), player_name: name, team_name: "Arsenal", position: "MID",
    old_price: 80, current_price: 80 + delta, price_change: delta, change_date: date, ownership,
  });
  const rows = [
    change("Rise Low", 1, "2026-10-20", 2),
    change("Rise High", 1, "2026-10-20", 30),
    change("Fall", -1, "2026-10-20", 10),
    change("Old rise", 1, "2026-10-19", 50),
    change("No change", 0, "2026-10-20", 50),
  ];

  it("uses the latest day with changes by default and splits risers and fallers", () => {
    const r = buildPriceChanges({ changes: rows, date: null, limit: 8 });
    expect(r.date).toBe("2026-10-20");
    expect(r.risers.map((x) => x.name)).toEqual(["Rise High", "Rise Low"]);
    expect(r.fallers.map((x) => x.name)).toEqual(["Fall"]);
    expect(r.risers[0].change).toBe("+£0.1m");
    expect(r.fallers[0].change).toBe("-£0.1m");
    expect(r.risers[0].price).toBe("£8.1m");
  });

  it("can show a chosen day and lists the available days newest first", () => {
    const r = buildPriceChanges({ changes: rows, date: "2026-10-19", limit: 8 });
    expect(r.risers.map((x) => x.name)).toEqual(["Old rise"]);
    expect(r.availableDates).toEqual(["2026-10-20", "2026-10-19"]);
  });

  it("limits each list and reports how many more there were", () => {
    const many = Array.from({ length: 12 }, (_, i) => change(`R${i}`, 1, "2026-10-20", i));
    const r = buildPriceChanges({ changes: many, date: null, limit: 5 });
    expect(r.risers.length).toBe(5);
    expect(r.moreRisers).toBe(7);
    expect(r.moreFallers).toBe(0);
  });

  it("empty state: no data gives null date and empty lists", () => {
    const r = buildPriceChanges({ changes: [], date: null, limit: 8 });
    expect(r.date).toBeNull();
    expect(r.risers).toEqual([]);
    expect(r.fallers).toEqual([]);
    expect(r.availableDates).toEqual([]);
  });

  it("an unknown day gives empty lists, not another day's data", () => {
    const r = buildPriceChanges({ changes: rows, date: "2026-01-01", limit: 8 });
    expect(r.risers).toEqual([]);
  });
});

describe("buildDifferentials", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
  const elements = [
    el({ id: 1, web_name: "Low", selected_by_percent: "3.0", team: 1 }),
    el({ id: 2, web_name: "Mid", selected_by_percent: "9.9", team: 2 }),
    el({ id: 3, web_name: "Edge", selected_by_percent: "10.0", team: 1 }),
    el({ id: 4, web_name: "Template", selected_by_percent: "40", team: 1 }),
    el({ id: 5, web_name: "Injured", selected_by_percent: "2", status: "i" }),
    el({ id: 6, web_name: "Gone", selected_by_percent: "2", status: "u" }),
    el({ id: 7, web_name: "Doubt", selected_by_percent: "2", status: "d" }),
    el({ id: 8, web_name: "Def", selected_by_percent: "2", element_type: 2 }),
    el({ id: 9, web_name: "NoProj", selected_by_percent: "2" }),
  ];
  const proj = (id: number, xs: Record<string, number>) => ({ playerId: id, gameweekProjections: xs });
  const projections = [
    proj(1, { "8": 4, "9": 4, "10": 99 }),
    proj(2, { "8": 6, "9": 5 }),
    proj(3, { "8": 20 }),
    proj(4, { "8": 30 }),
    proj(5, { "8": 25 }),
    proj(6, { "8": 25 }),
    proj(7, { "8": 3 }),
    proj(8, { "8": 7, "9": 7 }),
  ];
  const base = { elements, projections, teamShortById, from: 8, to: 9, pos: null, maxOwn: 10, top: 5 } as const;

  it("only players owned by less than the cap, ranked by xPts over exactly the chosen range", () => {
    const r = buildDifferentials(base);
    expect(r.map((x) => x.name)).toEqual(["Def", "Mid", "Low", "Doubt"]);
    expect(r[2].xpts).toBe(8);
  });

  it("leaves out injured, unavailable and players with no projection; flags doubtful ones", () => {
    const names = buildDifferentials(base).map((x) => x.name);
    expect(names).not.toContain("Injured");
    expect(names).not.toContain("Gone");
    expect(names).not.toContain("NoProj");
    expect(buildDifferentials(base).find((x) => x.name === "Doubt")?.doubtful).toBe(true);
    expect(buildDifferentials(base).find((x) => x.name === "Low")?.doubtful).toBe(false);
  });

  it("filters by position and respects Top N, with ranks starting at 1", () => {
    const def = buildDifferentials({ ...base, pos: "DEF" });
    expect(def.map((x) => x.name)).toEqual(["Def"]);
    const top2 = buildDifferentials({ ...base, top: 2 });
    expect(top2.map((x) => x.rank)).toEqual([1, 2]);
  });

  it("shows source values: price from now_cost, ownership as FPL gives it", () => {
    const low = buildDifferentials(base).find((x) => x.name === "Low")!;
    expect(low.price).toBe("£8.0m");
    expect(low.ownership).toBe("3.0%");
    expect(low.teamShort).toBe("ARS");
    expect(low.position).toBe("MID");
  });
});

describe("buildPredictedLineup", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
  const teamNameById = new Map([[1, "Arsenal"], [2, "Aston Villa"]]);
  // team 1: 2 GKP (one never plays), 5 DEF, 5 MID, 3 FWD. Opponent player must never appear.
  const mk = (id: number, type: number, team = 1, extra: Partial<GraphicElement> = {}) => el({ id, element_type: type, team, web_name: `N${id}`, ...extra });
  const elements = [
    mk(1, 1), mk(2, 1),
    ...[11, 12, 13, 14, 15].map((i) => mk(i, 2)),
    ...[21, 22, 23, 24, 25].map((i) => mk(i, 3)),
    ...[31, 32, 33].map((i) => mk(i, 4)),
    mk(99, 3, 2),
  ];
  const mins: Record<number, number> = { 1: 90, 2: 0, 11: 90, 12: 90, 13: 88, 14: 85, 15: 50, 21: 90, 22: 89, 23: 80, 24: 70, 25: 10, 31: 90, 32: 60, 33: 30, 99: 90 };
  const projections = Object.entries(mins).map(([id, m]) => ({ playerId: Number(id), xMinsPerGW: { "8": m, "9": 0 } as Record<string, number> }));
  const fixtures = [{ event: 8, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, finished: false }];
  const run = (over: Record<string, unknown> = {}) =>
    buildPredictedLineup({ teamId: 1, gameweek: 8, elements, projections, teamShortById, teamNameById, fixtures, ...over } as any);

  it("picks the legal XI with the most expected minutes, in formation order", () => {
    const l = run();
    expect(l.complete).toBe(true);
    expect(l.formation).toBe("4-4-2");
    expect(l.rows.map((r) => r.position)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(l.rows.map((r) => r.players.length)).toEqual([1, 4, 4, 2]);
    expect(l.rows[1].players.map((p) => p.id)).toEqual([11, 12, 13, 14]);
    expect(l.rows[3].players.map((p) => p.id)).toEqual([31, 32]);
  });

  it("only uses the chosen team and the chosen gameweek's expected minutes", () => {
    const l = run();
    expect(l.rows.flatMap((r) => r.players).map((p) => p.id)).not.toContain(99);
    const other = run({ gameweek: 9 });
    expect(other.complete).toBe(false);
  });

  it("shows whole expected minutes, capped at 90, and the bench is the next players with minutes", () => {
    const l = run({ projections: projections.map((p) => (p.playerId === 11 ? { ...p, xMinsPerGW: { "8": 94.6 } } : p)) });
    expect(l.rows[1].players[0].xMins).toBe(90);
    expect(l.bench.map((p) => p.id)).toEqual([15, 33, 25]);
    expect(l.bench.map((p) => p.xMins)).toEqual([50, 30, 10]);
    expect(l.bench.every((p) => p.xMins > 0)).toBe(true);
  });

  it("flags injured and doubtful players and shows the chance of playing; unavailable players are left out", () => {
    const els = elements.map((e) => (e.id === 12 ? { ...e, status: "d" } : e.id === 13 ? { ...e, status: "i" } : e.id === 14 ? { ...e, status: "u" } : e));
    const prj = projections.map((p) => (p.playerId === 12 ? { ...p, chanceOfPlayingNextRound: 75 } : p));
    const l = run({ elements: els, projections: prj });
    const all = l.rows.flatMap((r) => r.players);
    expect(all.find((p) => p.id === 12)).toMatchObject({ flag: "doubtful", chance: 75 });
    expect(all.find((p) => p.id === 13)?.flag).toBe("injured");
    expect(all.map((p) => p.id)).not.toContain(14);
    expect(all.find((p) => p.id === 11)).toMatchObject({ flag: null, chance: null });
  });

  it("is incomplete, not invented, when fewer than 11 players have expected minutes", () => {
    const few = projections.map((p) => (p.playerId > 20 ? { ...p, xMinsPerGW: { "8": 0 } } : p));
    const l = run({ projections: few });
    expect(l.complete).toBe(false);
    expect(l.formation).toBeNull();
    expect(l.rows.flatMap((r) => r.players).length).toBeLessThan(11);
  });

  it("lists the fixture(s): opponent and venue; blank and double gameweeks are flagged", () => {
    expect(run().fixtures).toEqual([{ opponent: "AVL", isHome: true }]);
    expect(run().doubleGameweek).toBe(false);
    expect(run({ gameweek: 9 }).blank).toBe(true);
    const dbl = run({ fixtures: [...fixtures, { event: 8, team_h: 2, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 3, finished: false }] });
    expect(dbl.doubleGameweek).toBe(true);
    expect(dbl.fixtures.length).toBe(2);
  });

  it("names the team", () => {
    const l = run();
    expect(l.teamShort).toBe("ARS");
    expect(l.teamName).toBe("Arsenal");
    expect(l.gameweek).toBe(8);
  });
});

describe("predicted lineup spec", () => {
  it("is a template that uses projections and keeps one team and one gameweek in the link", () => {
    expect(GRAPHIC_TEMPLATES.map((t) => t.id)).toContain("predicted-lineup");
    const spec = { ...DEFAULT_SPEC, template: "predicted-lineup" as const, teams: [5], from: 9, to: 9 };
    expect(usesProjections(spec)).toBe(true);
    expect(footerNote(spec, "GW9")).toContain("estimates");
    const back = decodeSpec(encodeSpec(spec));
    expect(back).toMatchObject({ template: "predicted-lineup", teams: [5], from: 9, to: 9 });
    expect(resolveHeadline(spec)).toBe("Predicted Lineup");
  });
});

describe("team reveal: spec", () => {
  const base = { ...DEFAULT_SPEC, template: "team-reveal" as const };
  it("is a template with squad, bench, captain, vice, chip and manager in the link", () => {
    expect(GRAPHIC_TEMPLATES.map((t) => t.id)).toContain("team-reveal");
    expect(resolveHeadline(base)).toBe("Team Reveal");
    expect(usesProjections(base)).toBe(false);
    const spec = { ...base, squad: [1, 2, 11, 12, 13], bench: [2, 13], captain: 11, vice: 12, chip: "3xc" as const, manager: "Steve's Team", from: 9, to: 9 };
    const back = decodeSpec(encodeSpec(spec));
    expect(back).toMatchObject({ template: "team-reveal", squad: [1, 2, 11, 12, 13], bench: [2, 13], captain: 11, vice: 12, chip: "3xc", manager: "Steve's Team", from: 9, to: 9 });
  });

  it("defaults are left out of the link", () => {
    expect(encodeSpec(base)).toBe("t=team-reveal");
    expect(DEFAULT_SPEC).toMatchObject({ squad: [], bench: [], captain: 0, vice: 0, chip: "", manager: "" });
  });

  it("drops bench, captain and vice ids that are not in the squad; captain and vice differ", () => {
    const d = decodeSpec("t=team-reveal&sq=1,2,3&bn=2,99&cap=99&vc=3");
    expect(d.bench).toEqual([2]);
    expect(d.captain).toBe(0);
    expect(d.vice).toBe(3);
    const same = decodeSpec("t=team-reveal&sq=1,2,3&cap=2&vc=2");
    expect(same.captain).toBe(2);
    expect(same.vice).toBe(0);
  });

  it("keeps at most 15 unique squad ids, 4 bench ids, a known chip, and 40 characters of manager name", () => {
    const ids = Array.from({ length: 20 }, (_, i) => i + 1).join(",");
    expect(decodeSpec(`sq=${ids}&bn=1,2,3,4,5,6`).squad.length).toBe(15);
    expect(decodeSpec(`sq=${ids}&bn=1,2,3,4,5,6`).bench).toEqual([1, 2, 3, 4]);
    expect(decodeSpec("sq=1,1,2").squad).toEqual([1, 2]);
    expect(decodeSpec("chip=bboost").chip).toBe("bboost");
    expect(decodeSpec("chip=magic").chip).toBe("");
    expect(decodeSpec(`mgr=${"y".repeat(100)}`).manager.length).toBe(40);
  });
});

describe("team reveal: squad rules and builder", () => {
  const spots: Array<[number, number, number]> = [
    // id, element_type, team
    [1, 1, 1], [2, 1, 2],
    [11, 2, 3], [12, 2, 4], [13, 2, 5], [14, 2, 6], [15, 2, 7],
    [21, 3, 8], [22, 3, 9], [23, 3, 10], [24, 3, 11], [25, 3, 12],
    [31, 4, 13], [32, 4, 14], [33, 4, 15],
  ];
  const elements = [
    ...spots.map(([id, type, team]) => el({ id, element_type: type, team, web_name: `N${id}`, now_cost: 50 })),
    el({ id: 41, element_type: 2, team: 3, web_name: "N41", now_cost: 45 }),
    el({ id: 42, element_type: 2, team: 3, web_name: "N42", now_cost: 45 }),
    el({ id: 43, element_type: 3, team: 3, web_name: "N43", now_cost: 45 }),
  ];
  const teamShortById = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, `T${i + 1}`] as [number, string]));
  const squad = spots.map(([id]) => id);
  const bench = [2, 15, 25, 33];
  const fixtures = [
    { event: 9, team_h: 3, team_a: 20, team_h_difficulty: 2, team_a_difficulty: 4, finished: false },
    { event: 9, team_h: 19, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 5, finished: false },
    { event: 9, team_h: 1, team_a: 18, team_h_difficulty: 2, team_a_difficulty: 4, finished: false },
  ];
  const run = (over: Record<string, unknown> = {}) =>
    buildTeamReveal({ elements, squad, bench, captain: 21, vice: 31, chip: "", gameweek: 9, fixtures, teamShortById, ...over } as any);

  it("a valid squad is complete: XI in formation rows, bench goalkeeper first, value is the sum of prices", () => {
    const r = run();
    expect(r.complete).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.formation).toBe("4-4-2");
    expect(r.rows.map((x) => x.position)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(r.rows.map((x) => x.players.length)).toEqual([1, 4, 4, 2]);
    expect(r.bench.map((p) => p.id)).toEqual([2, 15, 25, 33]);
    expect(r.squadValue).toBe("£75.0m");
    expect(r.gameweek).toBe(9);
  });

  it("marks captain and vice, shows price and the gameweek fixtures (double gameweek lists both)", () => {
    const r = run();
    const all = r.rows.flatMap((x) => x.players);
    expect(all.find((p) => p.id === 21)).toMatchObject({ isCaptain: true, isVice: false });
    expect(all.find((p) => p.id === 31)).toMatchObject({ isCaptain: false, isVice: true });
    expect(all.find((p) => p.id === 11)).toMatchObject({ isCaptain: false, isVice: false, price: "£5.0m", teamShort: "T3" });
    expect(all.find((p) => p.id === 11)!.fixtures).toEqual([
      { opponent: "T20", isHome: true, difficulty: 2 },
      { opponent: "T19", isHome: false, difficulty: 5 },
    ]);
    expect(all.find((p) => p.id === 12)!.fixtures).toEqual([]);
  });

  it("tells you what is missing, per position, and shows no pitch", () => {
    const r = run({ squad: [1, 11, 12, 21], bench: [] });
    expect(r.complete).toBe(false);
    expect(r.problems).toContain("Pick 2 goalkeepers (1/2)");
    expect(r.problems).toContain("Pick 5 defenders (2/5)");
    expect(r.problems).toContain("Pick 5 midfielders (1/5)");
    expect(r.problems).toContain("Pick 3 forwards (0/3)");
    expect(r.rows.flatMap((x) => x.players)).toEqual([]);
    expect(r.formation).toBeNull();
  });

  it("flags too many in a position and more than three from one club", () => {
    const tooMany = run({ squad: [...squad, 41], bench });
    expect(tooMany.problems).toContain("Too many defenders (6/5)");
    const club = run({ squad: [1, 2, 11, 41, 42, 43, 21, 22, 23, 24, 25, 31, 32, 33, 15], bench: [2, 15, 25, 33] });
    expect(club.problems.some((p) => p.startsWith("Max 3 players from one club"))).toBe(true);
    expect(club.problems.join(" ")).toContain("T3");
  });

  it("the bench must be one goalkeeper and three outfield players, and leave a legal XI", () => {
    expect(run({ bench: [15, 25, 33, 32] }).problems).toContain("Bench needs exactly 1 goalkeeper and 3 outfield players");
    expect(run({ bench: [2, 13, 14, 15] }).problems.some((p) => p.startsWith("Starting XI needs"))).toBe(true);
    expect(run({ bench: [2, 15] }).problems).toContain("Bench needs exactly 1 goalkeeper and 3 outfield players");
  });

  it("needs a captain who is in the squad; a vice is optional", () => {
    expect(run({ captain: 0 }).problems).toContain("Choose a captain");
    expect(run({ captain: 999 }).problems).toContain("Choose a captain");
    expect(run({ vice: 0 }).complete).toBe(true);
  });

  it("ignores ids that are not real players", () => {
    const r = run({ squad: [...squad, 9999] });
    expect(r.complete).toBe(true);
  });

  it("names the chip", () => {
    expect(run({ chip: "freehit" }).chipLabel).toBe("Free Hit");
    expect(run({ chip: "bboost" }).chipLabel).toBe("Bench Boost");
    expect(run({ chip: "3xc" }).chipLabel).toBe("Triple Captain");
    expect(run({ chip: "wildcard" }).chipLabel).toBe("Wildcard");
    expect(run({ chip: "" }).chipLabel).toBeNull();
  });

  it("counts positions and explains why a player cannot be added", () => {
    expect(squadCounts(elements, squad)).toEqual({ GKP: 2, DEF: 5, MID: 5, FWD: 3 });
    expect(canAddToSquad({ elements, squad: [1], id: 2 })).toEqual({ ok: true, reason: null });
    expect(canAddToSquad({ elements, squad: [1, 2], id: 1 }).ok).toBe(false);
    expect(canAddToSquad({ elements, squad: [1, 2], id: 1 }).reason).toMatch(/already/i);
    expect(canAddToSquad({ elements, squad: [1, 2], id: 2 }).ok).toBe(false);
    const gk = el({ id: 3, element_type: 1, team: 9 });
    expect(canAddToSquad({ elements: [...elements, gk], squad: [1, 2], id: 3 })).toEqual({ ok: false, reason: "You already have 2 goalkeepers" });
    expect(canAddToSquad({ elements, squad, id: 41 }).reason).toBe("Your squad is full (15 players)");
    const three = [11, 41, 42];
    expect(canAddToSquad({ elements: [...elements, el({ id: 44, element_type: 3, team: 3 })], squad: three, id: 44 })).toEqual({ ok: false, reason: "Max 3 players from one club" });
    expect(canAddToSquad({ elements: [...elements, el({ id: 44, element_type: 3, team: 3 })], squad: three, id: 44, teamShortById }).reason).toBe("Max 3 players from T3");
  });

  it("loads a squad from FPL picks: order by position, bench is 12-15, captain and vice", () => {
    const picks = [
      { element: 33, position: 15, is_captain: false, is_vice_captain: false },
      { element: 1, position: 1, is_captain: false, is_vice_captain: false },
      { element: 21, position: 5, is_captain: true, is_vice_captain: false },
      { element: 2, position: 12, is_captain: false, is_vice_captain: false },
      { element: 31, position: 9, is_captain: false, is_vice_captain: true },
    ];
    expect(squadFromPicks(picks)).toEqual({ squad: [1, 21, 31, 2, 33], bench: [2, 33], captain: 21, vice: 31 });
    expect(squadFromPicks([])).toEqual({ squad: [], bench: [], captain: 0, vice: 0 });
  });

  it("suggests a bench, captain and vice from xPts: best XI, captain best, vice second best in the XI", () => {
    const xpts = new Map<number, number | null>(squad.map((id) => [id, 1]));
    xpts.set(2, 0.5); xpts.set(15, 0.2); xpts.set(25, 0.3); xpts.set(33, 0.4); // clear bench
    xpts.set(22, 9); xpts.set(31, 7);
    const s = suggestSquadSetup({ elements, squad, xptsById: xpts });
    expect([...s.bench].sort((a, b) => a - b)).toEqual([2, 15, 25, 33]);
    expect(s.bench[0]).toBe(2);
    expect(s.captain).toBe(22);
    expect(s.vice).toBe(31);
    expect(suggestSquadSetup({ elements, squad: squad.slice(0, 10), xptsById: xpts })).toEqual({ bench: [], captain: 0, vice: 0 });
  });
});

describe("cover generator", () => {
  const base = { ...DEFAULT_SPEC, template: "cover" as const };

  it("is a template with a subtitle and a tag in the link; defaults are left out", () => {
    expect(GRAPHIC_TEMPLATES.map((t) => t.id)).toContain("cover");
    expect(encodeSpec(base)).toBe("t=cover");
    expect(DEFAULT_SPEC).toMatchObject({ subtitle: "", tag: "" });
    const spec = { ...base, headline: "GW9 Preview", subtitle: "Captains, differentials and the best budget picks", tag: "Deadline tonight", players: [411, 399, 13], theme: "midnight" as const, size: "landscape" as const };
    expect(decodeSpec(encodeSpec(spec))).toMatchObject({ template: "cover", headline: "GW9 Preview", subtitle: spec.subtitle, tag: "Deadline tonight", players: [411, 399, 13], theme: "midnight", size: "landscape" });
  });

  it("limits the subtitle to 80 characters, the tag to 24, and the featured players to 3", () => {
    expect(decodeSpec(`t=cover&sub=${"s".repeat(200)}`).subtitle.length).toBe(80);
    expect(decodeSpec(`t=cover&tag=${"t".repeat(200)}`).tag.length).toBe(24);
    expect(decodeSpec("t=cover&p=1,2,3,4,5").players).toEqual([1, 2, 3]);
  });

  it("has a default headline, no projections and no footer note (the watermark is the footer)", () => {
    expect(resolveHeadline(base)).toBe("Gameweek Preview");
    expect(resolveHeadline({ ...base, headline: "  Free Hit Draft  " })).toBe("Free Hit Draft");
    expect(usesProjections(base)).toBe(false);
    expect(footerNote(base, null)).toBe("");
  });

  it("builds the cover text trimmed, with the default headline, and the featured players in order", () => {
    const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
    const els = [el({ id: 10, team: 1, web_name: "Saka", element_type: 3 }), el({ id: 20, team: 2, web_name: "Watkins", element_type: 4 })];
    const c = buildCover({ spec: { ...base, headline: "", subtitle: "  Who to captain  ", tag: " GW9 ", players: [20, 999, 10] }, elements: els, teamShortById });
    expect(c.headline).toBe("Gameweek Preview");
    expect(c.subtitle).toBe("Who to captain");
    expect(c.tag).toBe("GW9");
    expect(c.players).toEqual([
      { id: 20, name: "Watkins", teamShort: "AVL", position: "FWD" },
      { id: 10, name: "Saka", teamShort: "ARS", position: "MID" },
    ]);
    const empty = buildCover({ spec: base, elements: els, teamShortById });
    expect(empty.subtitle).toBe("");
    expect(empty.tag).toBe("");
    expect(empty.players).toEqual([]);
  });

  it("title font gets smaller as the headline gets longer, within sensible bounds, and is smaller on landscape", () => {
    for (const size of ["square", "portrait", "landscape"] as const) {
      let prev = Infinity;
      for (let n = 1; n <= 60; n++) {
        const f = coverTitleFont("x".repeat(n), size);
        expect(f).toBeLessThanOrEqual(prev);
        prev = f;
      }
      expect(coverTitleFont("GW9", size)).toBeGreaterThan(coverTitleFont("x".repeat(60), size) * 2);
      expect(coverTitleFont("x".repeat(60), size)).toBeGreaterThanOrEqual(36);
    }
    expect(coverTitleFont("GW9 Preview", "landscape")).toBeLessThan(coverTitleFont("GW9 Preview", "square"));
    expect(coverTitleFont("   ", "square")).toBe(coverTitleFont("x", "square"));
  });
});

describe("player news quote", () => {
  const base = { ...DEFAULT_SPEC, template: "player-news" as const };
  const teamShortById = new Map([[1, "ARS"]]);
  const teamNameById = new Map([[1, "Arsenal"]]);
  const news = (over: Partial<GraphicElement> = {}) =>
    el({ id: 7, web_name: "Saka", first_name: "Bukayo", second_name: "Saka", team: 1, element_type: 3, status: "d", news: "Thigh injury - 50% chance of playing", news_added: "2026-10-21T20:30:09.540957Z", chance_of_playing_next_round: 50, ...over });
  const run = (specOver: Record<string, unknown> = {}, elOver: Partial<GraphicElement> = {}) =>
    buildNewsQuote({ spec: { ...base, players: [7], ...specOver } as any, elements: [news(elOver)], teamShortById, teamNameById });

  it("is a template with a quote and a source in the link; defaults are left out", () => {
    expect(GRAPHIC_TEMPLATES.map((t) => t.id)).toContain("player-news");
    expect(encodeSpec(base)).toBe("t=player-news");
    expect(DEFAULT_SPEC).toMatchObject({ quote: "", source: "" });
    const spec = { ...base, players: [7], quote: "He trained fully today", source: "Arteta press conference" };
    expect(decodeSpec(encodeSpec(spec))).toMatchObject({ template: "player-news", players: [7], quote: "He trained fully today", source: "Arteta press conference" });
  });

  it("keeps one player, a quote of at most 280 characters and a source of at most 60", () => {
    expect(decodeSpec("t=player-news&p=1,2,3").players).toEqual([1]);
    expect(decodeSpec(`t=player-news&q=${"q".repeat(500)}`).quote.length).toBe(280);
    expect(decodeSpec(`t=player-news&src=${"s".repeat(500)}`).source.length).toBe(60);
  });

  it("has a default headline, no projections, and a footer that says where the words come from", () => {
    expect(resolveHeadline(base)).toBe("Player News");
    expect(usesProjections(base)).toBe(false);
    expect(footerNote(base, null)).toBe("Source: official FPL player news");
    expect(footerNote({ ...base, quote: "Back next week" }, null)).toBe("Quote entered by the creator");
    expect(footerNote({ ...base, quote: "   " }, null)).toBe("Source: official FPL player news");
  });

  it("uses the official FPL news by default, with its date and chance of playing", () => {
    const n = run();
    expect(n.kind).toBe("official");
    expect(n.quote).toBe("Thigh injury - 50% chance of playing");
    expect(n.source).toBe("Official FPL news · 21 Oct 2026");
    expect(n.statusLabel).toBe("Doubtful");
    expect(n.tone).toBe("warn");
    expect(n.chance).toBe(50);
    expect(n.player).toEqual({ id: 7, name: "Saka", fullName: "Bukayo Saka", teamShort: "ARS", teamName: "Arsenal", position: "MID" });
  });

  it("a typed quote replaces the news and is attributed only to what the creator typed", () => {
    const n = run({ quote: "  Bukayo is back in training  ", source: "Arteta, pre-match press conference" });
    expect(n.kind).toBe("custom");
    expect(n.quote).toBe("Bukayo is back in training");
    expect(n.source).toBe("Arteta, pre-match press conference");
    expect(run({ quote: "Back soon" }).source).toBe("");
  });

  it("says plainly when there is no news and no typed quote", () => {
    const n = run({}, { news: "", news_added: null, status: "a", chance_of_playing_next_round: null });
    expect(n.kind).toBe("none");
    expect(n.quote).toBe("");
    expect(n.statusLabel).toBe("Available");
    expect(n.tone).toBe("ok");
    expect(n.chance).toBeNull();
    expect(run({ quote: "Fit and firing" }, { news: "", news_added: null, status: "a" }).kind).toBe("custom");
  });

  it("maps FPL status to a label and a tone", () => {
    const status = (st: string) => run({}, { status: st });
    expect([status("a").statusLabel, status("a").tone]).toEqual(["Available", "ok"]);
    expect([status("i").statusLabel, status("i").tone]).toEqual(["Injured", "bad"]);
    expect([status("s").statusLabel, status("s").tone]).toEqual(["Suspended", "bad"]);
    expect([status("u").statusLabel, status("u").tone]).toEqual(["Unavailable", "bad"]);
    expect([status("n").statusLabel, status("n").tone]).toEqual(["Not in squad", "bad"]);
  });

  it("chance of playing only shows a real number below 100", () => {
    expect(run({}, { chance_of_playing_next_round: 100 }).chance).toBeNull();
    expect(run({}, { chance_of_playing_next_round: 0 }).chance).toBe(0);
    expect(run({}, { chance_of_playing_next_round: null }).chance).toBeNull();
  });

  it("no player gives no card", () => {
    expect(buildNewsQuote({ spec: base, elements: [news()], teamShortById, teamNameById })).toBeNull();
    expect(buildNewsQuote({ spec: { ...base, players: [999] }, elements: [news()], teamShortById, teamNameById })).toBeNull();
  });

  it("formats the news date as day, month and year (UTC), or nothing if it is not a date", () => {
    expect(formatNewsDate("2026-10-21T20:30:09.540957Z")).toBe("21 Oct 2026");
    expect(formatNewsDate("2026-01-05T00:10:00Z")).toBe("5 Jan 2026");
    expect(formatNewsDate("nonsense")).toBeNull();
    expect(formatNewsDate(null)).toBeNull();
  });

  it("quote font shrinks with length, within bounds, and is smaller on landscape", () => {
    for (const size of ["square", "portrait", "landscape"] as const) {
      let prev = Infinity;
      for (let n = 1; n <= 280; n += 3) {
        const f = quoteFont("x".repeat(n), size);
        expect(f).toBeLessThanOrEqual(prev);
        prev = f;
      }
      expect(quoteFont("Out for the season", size)).toBeGreaterThan(quoteFont("x".repeat(280), size));
      expect(quoteFont("x".repeat(280), size)).toBeGreaterThanOrEqual(24);
    }
    expect(quoteFont("Back next week", "landscape")).toBeLessThan(quoteFont("Back next week", "square"));
  });
});

describe("five more templates: spec", () => {
  const ids = ["captain-picks", "fixture-ticker", "transfer-trends", "team-of-the-week", "stat-leaders"] as const;
  it("are templates with their own default headlines", () => {
    expect(GRAPHIC_TEMPLATES.map((t) => t.id)).toEqual(expect.arrayContaining([...ids]));
    expect(ids.map((t) => resolveHeadline({ ...DEFAULT_SPEC, template: t }))).toEqual(["Captain Picks", "Fixture Ticker", "Transfer Trends", "Team of the Week", "Stat Leaders"]);
  });

  it("only captain picks uses projections", () => {
    expect(usesProjections({ ...DEFAULT_SPEC, template: "captain-picks" })).toBe(true);
    for (const t of ["fixture-ticker", "transfer-trends", "team-of-the-week", "stat-leaders"] as const) expect(usesProjections({ ...DEFAULT_SPEC, template: t })).toBe(false);
  });

  it("the stat for Stat Leaders lives in the link; unknown stats fall back to the default", () => {
    expect(DEFAULT_SPEC.stat).toBe("goals_scored");
    expect(encodeSpec({ ...DEFAULT_SPEC, template: "stat-leaders" })).toBe("t=stat-leaders");
    expect(encodeSpec({ ...DEFAULT_SPEC, template: "stat-leaders", stat: "assists", pos: "MID", top: 7 })).toBe("t=stat-leaders&pos=MID&top=7&st=assists");
    expect(decodeSpec("t=stat-leaders&st=assists").stat).toBe("assists");
    expect(decodeSpec("t=stat-leaders&st=bogus").stat).toBe("goals_scored");
    expect(LEADER_STATS.map((x) => x.key)).toEqual(expect.arrayContaining(["goals_scored", "assists", "expected_goals", "expected_assists", "bonus", "clean_sheets", "points_per_game"]));
  });
});

describe("buildCaptainPicks", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"], [3, "BOU"]]);
  const mk = (id: number, over: Partial<GraphicElement> = {}) => el({ id, web_name: `P${id}`, team: 1, element_type: 3, now_cost: 100 + id, selected_by_percent: "20.0", status: "a", ...over });
  const elements = [
    mk(1), mk(2, { team: 2, element_type: 4 }), mk(3, { team: 3, status: "d" }), mk(4, { status: "i" }), mk(5, { status: "u" }), mk(6), mk(7, { element_type: 2 }),
  ];
  const proj = (playerId: number, x: Record<string, number>) => ({ playerId, gameweekProjections: x });
  const projections = [
    proj(1, { "9": 6, "10": 99 }), proj(2, { "9": 8.126 }), proj(3, { "9": 7 }), proj(4, { "9": 20 }), proj(5, { "9": 20 }), proj(7, { "9": 5 }),
  ];
  const fixtures = [
    { event: 9, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4, finished: false },
    { event: 9, team_h: 3, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 3, finished: false },
  ];
  const run = (over: Record<string, unknown> = {}) => buildCaptainPicks({ elements, projections, teamShortById, fixtures, gameweek: 9, top: 5, pos: null, ...over } as any);

  it("ranks by xPts for the chosen gameweek only", () => {
    const r = run();
    expect(r.map((x) => x.name)).toEqual(["P2", "P3", "P1", "P7"]);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3, 4]);
    expect(r.find((x) => x.name === "P1")!.xpts).toBe(6);
  });

  it("leaves out injured, unavailable and unprojected players; flags doubtful ones", () => {
    const names = run().map((x) => x.name);
    expect(names).not.toContain("P4");
    expect(names).not.toContain("P5");
    expect(names).not.toContain("P6");
    expect(run().find((x) => x.name === "P3")!.doubtful).toBe(true);
    expect(run().find((x) => x.name === "P2")!.doubtful).toBe(false);
  });

  it("shows price, ownership, captain points (xPts doubled) and the gameweek fixtures", () => {
    const p2 = run().find((x) => x.name === "P2")!;
    expect(p2).toMatchObject({ price: "£10.2m", ownership: "20.0%", xpts: 8.13, captainPoints: 16.25, teamShort: "AVL", position: "FWD" });
    expect(p2.fixtures).toEqual([{ opponent: "ARS", isHome: false, difficulty: 4 }]);
    expect(run().find((x) => x.name === "P1")!.fixtures).toEqual([
      { opponent: "AVL", isHome: true, difficulty: 2 },
      { opponent: "BOU", isHome: false, difficulty: 3 },
    ]);
  });

  it("respects the position filter and Top N", () => {
    expect(run({ pos: "DEF" }).map((x) => x.name)).toEqual(["P7"]);
    expect(run({ top: 2 }).map((x) => x.name)).toEqual(["P2", "P3"]);
  });
});

describe("buildFixtureTicker", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"], [3, "BOU"], [4, "BRE"]]);
  const teamNameById = new Map([[1, "Arsenal"], [2, "Aston Villa"], [3, "Bournemouth"], [4, "Brentford"]]);
  const fixtures = [
    { event: 8, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 5, finished: false },
    { event: 8, team_h: 3, team_a: 4, team_h_difficulty: 3, team_a_difficulty: 2, finished: false },
  ];
  const t = buildFixtureTicker({ teamIds: [1, 2, 3, 4], gameweeks: [8, 9], fixtures, teamShortById, teamNameById });

  it("sorts teams by average difficulty, easiest first, and puts teams with no fixtures last", () => {
    // ARS 2, BRE 2, BOU 3, AVL 5; every team has one fixture in GW8 and none in GW9
    expect(t.rows.map((r) => r.short)).toEqual(["ARS", "BRE", "BOU", "AVL"]);
    const none = buildFixtureTicker({ teamIds: [1, 2, 3], gameweeks: [20], fixtures: [], teamShortById, teamNameById });
    expect(none.rows.map((r) => r.short)).toEqual(["ARS", "AVL", "BOU"]);
    const mixed = buildFixtureTicker({ teamIds: [3, 1], gameweeks: [8], fixtures: [fixtures[0]], teamShortById, teamNameById });
    expect(mixed.rows.map((r) => r.short)).toEqual(["ARS", "BOU"]);
  });

  it("keeps the gameweeks and the per-gameweek cells", () => {
    expect(t.gameweeks).toEqual([8, 9]);
    expect(t.rows[0].cells.map((c) => c.gameweek)).toEqual([8, 9]);
    expect(t.rows[0].cells[0].fixtures).toEqual([{ opponent: "AVL", isHome: true, difficulty: 2 }]);
  });
});

describe("buildTransferTrends and formatCount", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
  const mk = (id: number, inn: number, out: number, over: Partial<GraphicElement> = {}) =>
    el({ id, web_name: `P${id}`, team: id % 2 ? 1 : 2, element_type: 3, now_cost: 50 + id, selected_by_percent: `${id}.0`, transfers_in_event: inn, transfers_out_event: out, ...over });
  const elements = [mk(1, 261437, 100), mk(2, 5000, 361762), mk(3, 0, 0), mk(4, 8450, 5), mk(5, 100, 9000, { element_type: 4 }), mk(6, 90, 80)];

  it("lists the most transferred in and the most transferred out, biggest first, without zeros", () => {
    const r = buildTransferTrends({ elements, teamShortById, pos: null, top: 5 });
    expect(r.ins.map((x) => x.name)).toEqual(["P1", "P4", "P2", "P5", "P6"]);
    expect(r.outs.map((x) => x.name)).toEqual(["P2", "P5", "P1", "P6", "P4"]);
    expect(r.ins.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows price, ownership, position, club and a short count", () => {
    const r = buildTransferTrends({ elements, teamShortById, pos: null, top: 5 });
    expect(r.ins[0]).toMatchObject({ name: "P1", teamShort: "ARS", position: "MID", price: "£5.1m", ownership: "1.0%", count: 261437, countLabel: "261k" });
    expect(r.outs[0].countLabel).toBe("362k");
  });

  it("respects Top N and the position filter", () => {
    expect(buildTransferTrends({ elements, teamShortById, pos: null, top: 2 }).ins.length).toBe(2);
    const f = buildTransferTrends({ elements, teamShortById, pos: "FWD", top: 5 });
    expect(f.ins.map((x) => x.name)).toEqual(["P5"]);
  });

  it("formats counts: whole numbers under 1000, k above, M above a million", () => {
    expect(formatCount(950)).toBe("950");
    expect(formatCount(1000)).toBe("1.0k");
    expect(formatCount(8450)).toBe("8.5k");
    expect(formatCount(12500)).toBe("13k");
    expect(formatCount(261437)).toBe("261k");
    expect(formatCount(999999)).toBe("1.00M");
    expect(formatCount(1250000)).toBe("1.25M");
  });
});

describe("buildTeamOfTheWeek", () => {
  const teamShortById = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, `T${i + 1}`] as [number, string]));
  // [id, element_type, points]
  const players: Array<[number, number, number]> = [
    [1, 1, 9], [2, 1, 3],
    [11, 2, 8], [12, 2, 7], [13, 2, 6], [14, 2, 5], [15, 2, 4], [16, 2, 3],
    [21, 3, 12], [22, 3, 10], [23, 3, 9], [24, 3, 2], [25, 3, 1], [26, 3, 1],
    [31, 4, 11], [32, 4, 6], [33, 4, 2], [34, 4, 1],
  ];
  const elements = players.map(([id, type]) => el({ id, element_type: type, team: id, web_name: `N${id}` }));
  const live = players.map(([id, , pts]) => ({ id, stats: { total_points: pts, minutes: 90 } }));
  const run = (over: Record<string, unknown> = {}) => buildTeamOfTheWeek({ elements, live, teamShortById, gameweek: 7, ...over } as any);

  it("is the best legal XI by actual points, with the captain as the top scorer", () => {
    const r = run();
    expect(r.complete).toBe(true);
    expect(r.formation).toBe("5-3-2");
    expect(r.rows.map((x) => x.position)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(r.rows.map((x) => x.players.length)).toEqual([1, 5, 3, 2]);
    const all = r.rows.flatMap((x) => x.players);
    expect(all.find((p) => p.isCaptain)!.id).toBe(21);
    expect(all.find((p) => p.id === 21)!.points).toBe(12);
    expect(r.gameweek).toBe(7);
  });

  it("totals the XI's points with the captain counted twice", () => {
    expect(run().total).toBe(99);
  });

  it("only picks players who played, and never invents a player", () => {
    const withGlitch = live.map((l) => (l.id === 34 ? { ...l, stats: { total_points: 20, minutes: 0 } } : l));
    const r = run({ live: withGlitch });
    expect(r.rows.flatMap((x) => x.players).map((p) => p.id)).not.toContain(34);
    const few = run({ live: live.map((l) => (l.id < 20 ? l : { ...l, stats: { total_points: 0, minutes: 0 } })) });
    expect(few.complete).toBe(false);
    expect(few.formation).toBeNull();
  });

  it("players missing from the live data are ignored", () => {
    expect(run({ live: live.slice(0, 5) }).complete).toBe(false);
  });
});

describe("buildStatLeaders", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
  const mk = (id: number, over: Partial<GraphicElement> = {}) =>
    el({ id, web_name: `P${id}`, team: id % 2 ? 1 : 2, element_type: 4, now_cost: 70 + id, minutes: 900, total_points: 50, goals_scored: 0, points_per_game: "0.0", ...over });
  const elements = [
    mk(1, { goals_scored: 8 }), mk(2, { goals_scored: 8, total_points: 60 }), mk(3, { goals_scored: 5, element_type: 3 }), mk(4, { goals_scored: 0 }), mk(5, { goals_scored: 2 }),
    mk(6, { points_per_game: "9.0", minutes: 90 }), mk(7, { points_per_game: "6.5", minutes: 900 }), mk(8, { points_per_game: "5.0", minutes: 900 }),
    mk(9, { expected_goals: "4.37" }),
  ];
  const run = (over: Record<string, unknown> = {}) => buildStatLeaders({ elements, statKey: "goals_scored", pos: null, top: 5, teamShortById, ...over } as any);

  it("ranks by the chosen stat; ties go to more total points; zeros are not leaders", () => {
    const r = run();
    expect(r.rows.map((x) => x.name)).toEqual(["P2", "P1", "P3", "P5"]);
    expect(r.rows.map((x) => x.rank)).toEqual([1, 2, 3, 4]);
    expect(r.rows[0].valueLabel).toBe("8");
  });

  it("filters by position, respects Top N, and bar shares are relative to the leader", () => {
    expect(run({ pos: "MID" }).rows.map((x) => x.name)).toEqual(["P3"]);
    expect(run({ top: 2 }).rows.length).toBe(2);
    const r = run();
    expect(r.rows[0].share).toBe(1);
    expect(r.rows[2].share).toBeCloseTo(5 / 8, 5);
  });

  it("rate stats need 180+ minutes so a cameo cannot top the list", () => {
    const r = run({ statKey: "points_per_game" });
    expect(r.rows.map((x) => x.name)).toEqual(["P7", "P8"]);
    expect(r.minutesRule).toBe(true);
    expect(run().minutesRule).toBe(false);
  });

  it("formats values and shows source fields: decimals one place, price and club", () => {
    const r = run({ statKey: "expected_goals" });
    expect(r.rows[0]).toMatchObject({ name: "P9", valueLabel: "4.4", teamShort: "ARS", price: "£7.9m", position: "FWD" });
    expect(r.stat).toMatchObject({ key: "expected_goals" });
  });

  it("an unknown stat gives no rows", () => {
    expect(run({ statKey: "nonsense" }).rows).toEqual([]);
  });
});

describe("creator handle and accent", () => {
  it("validates a handle: letters, digits, underscore, up to 15, one leading @ stripped; anything else is none", () => {
    expect(normaliseHandle("@steve")).toBe("steve");
    expect(normaliseHandle("  steve_f1 ")).toBe("steve_f1");
    expect(normaliseHandle("FPL_Dilemmas9")).toBe("FPL_Dilemmas9");
    expect(normaliseHandle("a".repeat(15))).toBe("a".repeat(15));
    for (const bad of ["", "@", "@@steve", "bad name", "a".repeat(16), "né", "steve!", "x-y", "@ste ve", "https://x.com/steve"]) expect(normaliseHandle(bad)).toBe("");
  });

  it("validates an accent colour: 6 or 3 hex digits, with or without #, returned as #rrggbb", () => {
    expect(normaliseAccent("#FBBF24")).toBe("#fbbf24");
    expect(normaliseAccent("fbbf24")).toBe("#fbbf24");
    expect(normaliseAccent("#fb2")).toBe("#ffbb22");
    for (const bad of ["", "red", "#12345", "#1234567", "#gggggg", "rgb(1,2,3)"]) expect(normaliseAccent(bad)).toBe("");
  });

  it("handle and accent live in the link; defaults and invalid values are left out", () => {
    expect(DEFAULT_SPEC).toMatchObject({ handle: "", accent: "" });
    expect(encodeSpec({ ...DEFAULT_SPEC, handle: "steve_f", accent: "#fbbf24" })).toBe("handle=steve_f&accent=fbbf24");
    expect(decodeSpec("handle=@steve_f&accent=FBBF24")).toMatchObject({ handle: "steve_f", accent: "#fbbf24" });
    expect(decodeSpec("handle=bad%20name&accent=zzz")).toMatchObject({ handle: "", accent: "" });
    const spec = { ...DEFAULT_SPEC, template: "captain-picks" as const, handle: "x1", accent: "#123456" };
    expect(decodeSpec(encodeSpec(spec))).toMatchObject({ handle: "x1", accent: "#123456" });
  });

  it("an accent never makes a theme unreadable: it is lightened or darkened until it has contrast against the background", () => {
    const accents = ["#fbbf24", "#ff0000", "#00ff00", "#000000", "#ffffff", "#4f46e5", "#ffff00"];
    for (const id of ["indigo", "midnight", "light"] as const) {
      const base = resolveTheme(id, null);
      for (const a of accents) {
        const t = withAccent(base, a);
        for (const bg of [t.bg, t.bg2]) expect(contrastRatio(t.accent, bg)).toBeGreaterThanOrEqual(3);
        expect(t.bg).toBe(base.bg);
        expect(t.text).toBe(base.text);
      }
    }
    const midnight = resolveTheme("midnight", null);
    expect(withAccent(midnight, "#fbbf24").accent.toLowerCase()).toBe("#fbbf24");
    expect(withAccent(midnight, "")).toBe(midnight);
    expect(withAccent(midnight, "nonsense")).toBe(midnight);
  });
});

describe("deadline text and the gameweek pack plan", () => {
  it("formats a deadline in UK time", () => {
    expect(formatDeadline("2026-10-24T16:30:00Z")).toBe("Sat 24 Oct · 17:30"); // BST
    expect(formatDeadline("2026-11-07T17:30:00Z")).toBe("Sat 7 Nov · 17:30"); // GMT
    expect(formatDeadline("nonsense")).toBeNull();
    expect(formatDeadline(null)).toBeNull();
  });

  it("the pack is the standard set for a gameweek, in order, keeping the user's size, theme, handle and accent", () => {
    const base = { ...DEFAULT_SPEC, template: "player-card" as const, size: "portrait" as const, theme: "midnight" as const, handle: "steve", accent: "#fbbf24", headline: "mine", players: [1], teams: [2], quote: "q" };
    const specs = packSpecs(base, 9, { deadline: "2026-10-24T16:30:00Z" });
    expect(specs.map((x) => x.spec.template)).toEqual(["cover", "captain-picks", "top-differentials", "availability-watch", "fixture-ticker", "transfer-trends", "price-change"]);
    expect(GAMEWEEK_PACK.map((x) => x.template)).toEqual(specs.map((x) => x.spec.template));
    for (const { spec } of specs) {
      expect(spec).toMatchObject({ size: "portrait", theme: "midnight", handle: "steve", accent: "#fbbf24" });
      expect(spec.players).toEqual([]);
      expect(spec.teams).toEqual([]);
      expect(spec.quote).toBe("");
      expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
    }
    expect(specs[0].spec).toMatchObject({ headline: "GW9 Deadline", tag: "Sat 24 Oct · 17:30" });
    expect(specs[0].spec.subtitle.length).toBeGreaterThan(0);
    expect(specs[1].spec).toMatchObject({ from: 9, to: 9, headline: "" });
    expect(specs[2].spec).toMatchObject({ from: 9, to: 12 });
    expect(specs[3].spec.template).toBe("availability-watch");
    expect(specs[4].spec).toMatchObject({ from: 9, to: 13 });
  });

  it("the cover has no tag when the deadline is unknown", () => {
    expect(packSpecs(DEFAULT_SPEC, 9, { deadline: null })[0].spec.tag).toBe("");
  });

  it("file names are numbered in pack order, and the zip is named for the gameweek", () => {
    expect(packFileName(0, "cover")).toBe("01-cover.png");
    expect(packFileName(5, "price-change")).toBe("06-price-change.png");
    expect(packZipName(9)).toBe("fpl-dilemmas-gw9-pack.zip");
  });

  it("captions.txt lists each image with its caption, in order", () => {
    const text = buildCaptionsFile([
      { fileName: "01-cover.png", caption: "GW9 deadline #FPL" },
      { fileName: "02-captain-picks.png", caption: "Captains #FPL" },
    ]);
    expect(text.indexOf("01-cover.png")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("01-cover.png")).toBeLessThan(text.indexOf("GW9 deadline #FPL"));
    expect(text.indexOf("GW9 deadline #FPL")).toBeLessThan(text.indexOf("02-captain-picks.png"));
    expect(text.endsWith("\n")).toBe(true);
    expect(text).toContain("\n\n");
  });
});

describe("post captions from the real numbers", () => {
  const spec = (over: Record<string, unknown> = {}) => ({ ...DEFAULT_SPEC, ...over }) as any;
  const tail = "fpldilemmas.com #FPL #FantasyPremierLeague";

  it("captain picks: the top three with their xPts, the gameweek hashtag and the site", () => {
    const data = {
      kind: "captain-picks", gwLabel: "GW8", subtitle: "",
      rows: [
        { rank: 1, name: "Isak", xpts: 7.1 }, { rank: 2, name: "Cherki", xpts: 6.9 }, { rank: 3, name: "João Pedro", xpts: 6.7 }, { rank: 4, name: "Mbeumo", xpts: 6.1 },
      ],
    } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "captain-picks" }));
    expect(c).toContain("GW8");
    expect(c).toContain("Isak 7.1");
    expect(c).toContain("Cherki 6.9");
    expect(c).toContain("João Pedro 6.7");
    expect(c).not.toContain("Mbeumo");
    expect(c).toContain(tail);
    expect(c).toContain("#GW8");
  });

  it("every caption fits an X post (256 characters) and keeps the site and hashtags even when the body is long", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ rank: i + 1, name: `A very long player name number ${i} with plenty of extra words added to force the cut`, xpts: 7.1 }));
    const c = buildCaption({ kind: "captain-picks", gwLabel: "GW8", subtitle: "", rows } as unknown as GraphicData, spec({ template: "captain-picks", handle: "a_creator" }));
    expect(c.length).toBeLessThanOrEqual(256);
    expect(c).toContain(tail);
    expect(c).toContain("…");
  });

  it("adds the creator's handle next to the site when there is one, and not otherwise", () => {
    const data = { kind: "captain-picks", gwLabel: "GW8", subtitle: "", rows: [{ rank: 1, name: "Isak", xpts: 7.1 }] } as unknown as GraphicData;
    expect(buildCaption(data, spec({ template: "captain-picks", handle: "steve_f" }))).toContain("by @steve_f");
    expect(buildCaption(data, spec({ template: "captain-picks" }))).not.toContain("@");
  });

  it("fixture ticker: easiest and toughest runs with their average difficulty", () => {
    const row = (short: string, avg: number | null) => ({ short, avgFdr: avg });
    const data = { kind: "fixture-ticker", gwLabel: "GW8-12", grid: { gameweeks: [8], rows: [row("COV", 2.8), row("CRY", 2.84), row("IPS", 2.9), row("MUN", 3.4), row("LIV", 3.5), row("MCI", 3.6), row("XXX", null)] } } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "fixture-ticker" }));
    expect(c).toContain("COV 2.8");
    expect(c).toContain("CRY 2.8");
    expect(c).toContain("MCI 3.6");
    expect(c).not.toContain("XXX");
  });

  it("transfer trends: the biggest mover in and out with the counts", () => {
    const data = { kind: "transfer-trends", gwLabel: "GW8 transfers so far", subtitle: "", trends: { ins: [{ name: "Tavernier", countLabel: "561k" }, { name: "Cherki", countLabel: "413k" }], outs: [{ name: "Saka", countLabel: "623k" }] } } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "transfer-trends" }));
    expect(c).toContain("Tavernier 561k");
    expect(c).toContain("Saka 623k");
    expect(c).toContain("#FPLTransfers");
  });

  it("price changes: counts and the first names", () => {
    const data = { kind: "price-change", dateLabel: "Confirmed price changes · Thursday, 22 October 2026", prices: { date: "2026-10-22", risers: [{ name: "Calvert-Lewin", change: "+£0.1m" }], fallers: [{ name: "Palacios", change: "-£0.1m" }], moreRisers: 2, moreFallers: 0 } } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "price-change" }));
    expect(c).toContain("Calvert-Lewin");
    expect(c).toContain("Palacios");
    expect(c).toContain("3 risers");
    expect(c).toContain("1 faller");
  });

  it("an empty price day says so rather than inventing moves", () => {
    const data = { kind: "price-change", dateLabel: "Confirmed price changes", prices: { date: null, risers: [], fallers: [], moreRisers: 0, moreFallers: 0 } } as unknown as GraphicData;
    expect(buildCaption(data, spec({ template: "price-change" }))).toContain("No price changes");
  });

  it("team of the week: formation, total and captain", () => {
    const data = { kind: "team-of-the-week", gwLabel: "GW7", totw: { complete: true, formation: "3-4-3", total: 143, rows: [{ position: "MID", players: [{ name: "Neto", points: 15, isCaptain: true }] }] } } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "team-of-the-week" }));
    expect(c).toContain("3-4-3");
    expect(c).toContain("143");
    expect(c).toContain("Neto");
  });

  it("stat leaders: the stat and the top three", () => {
    const data = { kind: "stat-leaders", gwLabel: "Season to date", subtitle: "", statLabel: "Assists", rows: [{ name: "Groß", valueLabel: "6" }, { name: "Gvardiol", valueLabel: "4" }, { name: "Palmer", valueLabel: "4" }, { name: "X", valueLabel: "4" }] } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "stat-leaders" }));
    expect(c).toContain("Assists");
    expect(c).toContain("Groß 6");
    expect(c).not.toContain("X 4");
  });

  it("top differentials: the first three with xPts and ownership", () => {
    const data = { kind: "top-differentials", gwLabel: "GW8-12", subtitle: "", rows: [{ name: "Gakpo", xpts: 25.5, ownership: "6.5%" }, { name: "Belloumi", xpts: 24.7, ownership: "9.1%" }] } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "top-differentials" }));
    expect(c).toContain("Gakpo 25.5 xPts (6.5%)");
    expect(c).toContain("#Differentials");
  });

  it("cover: the headline and subtitle", () => {
    const data = { kind: "cover", cover: { headline: "GW9 Deadline", subtitle: "Captains and fixtures", tag: "Sat 24 Oct", players: [] } } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "cover" }));
    expect(c).toContain("GW9 Deadline");
    expect(c).toContain("Sat 24 Oct");
    expect(c).toContain("Captains and fixtures");
    expect(c).toContain("#GW9");
  });

  it("no caption ends its body with a full stop right before the site or the handle", () => {
    const data = { kind: "fixture-ticker", gwLabel: "GW8", grid: { gameweeks: [8], rows: [{ short: "A", avgFdr: 2 }, { short: "B", avgFdr: 3 }, { short: "C", avgFdr: 4 }, { short: "D", avgFdr: 5 }, { short: "E", avgFdr: 6 }, { short: "F", avgFdr: 7 }] } } as unknown as GraphicData;
    expect(buildCaption(data, spec({ template: "fixture-ticker", handle: "steve" }))).not.toMatch(/\. by @/);
    expect(buildCaption(data, spec({ template: "fixture-ticker" }))).not.toMatch(/\. ·/);
  });

  it("player news: official news is credited to FPL; a typed quote uses only the typed source", () => {
    const official = { kind: "player-news", news: { kind: "official", quote: "Thigh injury - 50% chance of playing", source: "Official FPL news · 21 Oct 2026", player: { name: "Saka", teamShort: "ARS" } } } as unknown as GraphicData;
    expect(buildCaption(official, spec({ template: "player-news" }))).toContain("Saka");
    expect(buildCaption(official, spec({ template: "player-news" }))).toContain("official FPL news");
    const custom = { kind: "player-news", news: { kind: "custom", quote: "Back in training", source: "Arteta, press conference", player: { name: "Saka", teamShort: "ARS" } } } as unknown as GraphicData;
    const c = buildCaption(custom, spec({ template: "player-news" }));
    expect(c).toContain("Back in training");
    expect(c).toContain("Arteta, press conference");
    expect(c).not.toContain("official FPL news");
  });

  it("team reveal: manager, formation, captain and chip", () => {
    const data = { kind: "team-reveal", gwLabel: "GW9", reveal: { complete: true, formation: "4-4-2", chipLabel: "Triple Captain", rows: [{ position: "FWD", players: [{ name: "Haaland", isCaptain: true, isVice: false }] }], bench: [] } } as unknown as GraphicData;
    const c = buildCaption(data, spec({ template: "team-reveal", manager: "Steve F" }));
    expect(c).toContain("Steve F");
    expect(c).toContain("4-4-2");
    expect(c).toContain("Haaland");
    expect(c).toContain("Triple Captain");
  });
});

describe("buildAvailabilityWatch", () => {
  const teamShortById = new Map([[1, "ARS"], [2, "AVL"]]);
  const mk = (id: number, over: Partial<GraphicElement> = {}) =>
    el({ id, web_name: `P${id}`, team: id % 2 ? 1 : 2, element_type: 3, now_cost: 60 + id, selected_by_percent: "20.0", status: "d", news: "Knock - 75% chance of playing", news_added: "2026-10-21T20:30:09Z", chance_of_playing_next_round: 75, ...over });
  const elements = [
    mk(1, { selected_by_percent: "10.0" }),
    mk(2, { selected_by_percent: "40.0", status: "i", chance_of_playing_next_round: 0, news: "Hamstring injury - Unknown return date" }),
    mk(3, { selected_by_percent: "30.0", status: "s", chance_of_playing_next_round: null, news: "Suspended for 1 match" }),
    mk(4, { selected_by_percent: "50.0", status: "a", news: "", chance_of_playing_next_round: null }),
    mk(5, { selected_by_percent: "4.9" }),
    mk(6, { selected_by_percent: "60.0", status: "u", news: "Has left the club" }),
    mk(7, { selected_by_percent: "25.0", element_type: 4 }),
    mk(8, { selected_by_percent: "5.0", news: "x".repeat(200) }),
  ];
  const run = (over: Record<string, unknown> = {}) => buildAvailabilityWatch({ elements, teamShortById, pos: null, top: 8, ...over } as any);

  it("lists injured, doubtful and suspended players owned by at least the floor, most owned first", () => {
    expect(MIN_WATCH_OWNERSHIP).toBe(5);
    expect(run().map((r) => r.name)).toEqual(["P2", "P3", "P7", "P1", "P8"]);
    expect(run().map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("leaves out fit players, players below the floor, and players who have left (unavailable)", () => {
    const names = run().map((r) => r.name);
    for (const gone of ["P4", "P5", "P6"]) expect(names).not.toContain(gone);
  });

  it("shows status, tone, chance of playing (a real number below 100, 0 included) and the FPL news with its date", () => {
    const [p2, p3] = run();
    expect(p2).toMatchObject({ statusLabel: "Injured", tone: "bad", chance: 0, news: "Hamstring injury - Unknown return date", added: "21 Oct 2026", teamShort: "AVL", price: "£6.2m", ownership: "40.0%", position: "MID" });
    expect(p3).toMatchObject({ statusLabel: "Suspended", tone: "bad", chance: null });
    expect(run().find((r) => r.name === "P1")).toMatchObject({ statusLabel: "Doubtful", tone: "warn", chance: 75 });
  });

  it("cuts very long news with an ellipsis", () => {
    const long = run().find((r) => r.name === "P8")!;
    expect(long.news.length).toBeLessThanOrEqual(90);
    expect(long.news.endsWith("…")).toBe(true);
  });

  it("respects the position filter and Top N", () => {
    expect(run({ pos: "FWD" }).map((r) => r.name)).toEqual(["P7"]);
    expect(run({ top: 2 }).map((r) => r.name)).toEqual(["P2", "P3"]);
  });
});

describe("availability watch as a template, caption and pack item", () => {
  it("is a template with its own headline; no projections", () => {
    expect(GRAPHIC_TEMPLATES.map((t) => t.id)).toContain("availability-watch");
    expect(resolveHeadline({ ...DEFAULT_SPEC, template: "availability-watch" })).toBe("Availability Watch");
    expect(usesProjections({ ...DEFAULT_SPEC, template: "availability-watch" })).toBe(false);
  });

  it("the pack includes it after the differentials", () => {
    expect(GAMEWEEK_PACK.map((x) => x.id)).toEqual(["deadline", "captains", "differentials", "availability", "fixtures", "transfers", "prices"]);
  });

  it("caption: the first three with their chance or status, from the real news", () => {
    const data = {
      kind: "availability-watch", gwLabel: "Latest FPL news", subtitle: "",
      rows: [
        { name: "Saka", statusLabel: "Doubtful", chance: 50, news: "Thigh injury" },
        { name: "Semenyo", statusLabel: "Injured", chance: 0, news: "Knee injury" },
        { name: "Szoboszlai", statusLabel: "Injured", chance: null, news: "Hamstring" },
        { name: "Fourth", statusLabel: "Injured", chance: null, news: "x" },
      ],
    } as unknown as GraphicData;
    const c = buildCaption(data, { ...DEFAULT_SPEC, template: "availability-watch" });
    expect(c).toContain("Saka 50%");
    expect(c).toContain("Semenyo 0%");
    expect(c).toContain("Szoboszlai injured");
    expect(c).not.toContain("Fourth");
    expect(c).toContain("#FPLInjuries");
  });
});

describe("isEmptyGraphic (what the pack skips instead of drawing a blank card)", () => {
  const spec = DEFAULT_SPEC;
  it("is true for lists with nothing in them and false when there is something to show", () => {
    const empties = [
      { kind: "captain-picks", rows: [] },
      { kind: "top-differentials", rows: [] },
      { kind: "availability-watch", rows: [] },
      { kind: "stat-leaders", rows: [] },
      { kind: "fixture-ticker", grid: { rows: [] } },
      { kind: "transfer-trends", trends: { ins: [], outs: [] } },
      { kind: "price-change", prices: { date: null, risers: [], fallers: [] } },
    ];
    for (const e of empties) expect(isEmptyGraphic(e as unknown as GraphicData)).toBe(true);
    const full = [
      { kind: "captain-picks", rows: [{}] },
      { kind: "transfer-trends", trends: { ins: [{}], outs: [] } },
      { kind: "price-change", prices: { date: "2026-10-22", risers: [{}], fallers: [] } },
      { kind: "cover", cover: {} },
      { kind: "fixture-ticker", grid: { rows: [{}] } },
    ];
    for (const f of full) expect(isEmptyGraphic(f as unknown as GraphicData)).toBe(false);
    expect(spec).toBe(DEFAULT_SPEC);
  });
});
