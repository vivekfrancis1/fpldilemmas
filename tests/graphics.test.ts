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
