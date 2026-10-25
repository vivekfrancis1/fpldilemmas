import { describe, it, expect } from "vitest";
import {
  availabilityCard,
  bestPicksCard,
  captainsCard,
  deadlineCard,
  dgwBgwCard,
  hindsightCard,
  priceWatchCard,
  shareFileName,
  statusLabel,
  thingsToCheckCard,
  whatIfCard,
  signedPoints,
  truncateName,
} from "../shared/share-cards";

describe("truncateName", () => {
  it("leaves short names, shortens long ones with an ellipsis", () => {
    expect(truncateName("Haaland", 12)).toBe("Haaland");
    expect(truncateName("Alexander-Arnold-Long-Name", 12)).toBe("Alexander-A…");
    expect(truncateName("Alexander-Arnold-Long-Name", 12).length).toBe(12);
  });
});

describe("captainsCard", () => {
  const players = [
    { name: "Haaland", teamShort: "MCI", xPts: 6.66, captainPoints: 13.32 },
    { name: "Saka", teamShort: "ARS", xPts: 5.8, captainPoints: 11.6 },
  ];

  it("lists players in the order given with xPts and captain points to one decimal", () => {
    const c = captainsCard({ gameweek: 8, players });
    expect(c.title).toBe("Top captain options");
    expect(c.subtitle).toBe("Gameweek 8");
    expect(c.sections[0].rows).toEqual([
      { left: "1. Haaland (MCI)", right: "6.7 xPts · 13.3 cap" },
      { left: "2. Saka (ARS)", right: "5.8 xPts · 11.6 cap" },
    ]);
  });

  it("always says projections are estimates and names the site", () => {
    const c = captainsCard({ gameweek: 8, players });
    expect(c.footer).toContain("fpldilemmas.com");
    expect(c.footer.toLowerCase()).toContain("estimates");
  });

  it("limits to the requested number of rows and handles an empty list", () => {
    expect(captainsCard({ gameweek: 8, players, limit: 1 }).sections[0].rows).toHaveLength(1);
    const empty = captainsCard({ gameweek: 8, players: [] });
    expect(empty.sections[0].rows).toEqual([{ left: "No projections available yet", right: "" }]);
  });
});

describe("hindsightCard", () => {
  const h = {
    gameweek: 7,
    officialPoints: 82,
    bestPossible: 83,
    gap: 1,
    chip: null as string | null,
    captain: { chosen: "Haaland", chosenPoints: 13, best: "Haaland", bestPoints: 13 },
  };

  it("shows points scored, best possible and the difference", () => {
    const c = hindsightCard(h);
    expect(c.title).toBe("Hindsight · GW7");
    const rows = c.sections.flatMap((s) => s.rows);
    expect(rows).toContainEqual({ left: "I scored", right: "82" });
    expect(rows).toContainEqual({ left: "Best possible from my 15", right: "83" });
    expect(rows).toContainEqual({ left: "Difference", right: "1" });
  });

  it("names the chip when one was played", () => {
    expect(JSON.stringify(hindsightCard({ ...h, chip: "bboost" }))).toContain("Bench Boost");
    expect(JSON.stringify(hindsightCard({ ...h, chip: "3xc" }))).toContain("Triple Captain");
  });

  it("says when the captain was the best available, otherwise names both", () => {
    expect(JSON.stringify(hindsightCard(h))).toContain("Best captain available");
    const other = hindsightCard({ ...h, captain: { chosen: "Saka", chosenPoints: 5, best: "Haaland", bestPoints: 13 } });
    expect(JSON.stringify(other)).toContain("Captain: Saka (5) · best was Haaland (13)");
  });

  it("states it is in hindsight, not advice", () => {
    expect(hindsightCard(h).footer.toLowerCase()).toContain("hindsight");
  });
});

describe("shareFileName", () => {
  it("builds a safe PNG name", () => {
    expect(shareFileName(["Template Team", "GW7"])).toBe("fpl-dilemmas-template-team-gw7.png");
  });
});

// ---------- Pre-deadline Brief sections ----------
const bp = (name: string, teamShort: string, position: string, xPts: number) => ({
  playerId: 1, name, position, teamShort, xPts, captainPoints: xPts * 2, ownership: 10, status: "a", chanceOfPlayingNextRound: 100, news: "",
});

describe("bestPicksCard", () => {
  const byPosition = {
    GKP: [bp("Raya", "ARS", "GKP", 5.04), bp("Becker", "LIV", "GKP", 4.8)],
    DEF: [bp("Calafiori", "ARS", "DEF", 5.7)],
    MID: [bp("Mbeumo", "MUN", "MID", 6.3)],
    FWD: [],
  };

  it("one section per position, in GKP/DEF/MID/FWD order, with xPts to one decimal", () => {
    const c = bestPicksCard({ gameweek: 8, byPosition });
    expect(c.title).toBe("Best picks by position");
    expect(c.subtitle).toBe("Gameweek 8");
    expect(c.sections.map((x) => x.heading)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(c.sections[0].rows[0]).toEqual({ left: "Raya (ARS)", right: "5.0 xPts" });
    expect(c.sections[2].rows[0]).toEqual({ left: "Mbeumo (MUN)", right: "6.3 xPts" });
  });

  it("limits each position and shows a dash for a position with no projections", () => {
    const c = bestPicksCard({ gameweek: 8, byPosition, perPosition: 1 });
    expect(c.sections[0].rows).toHaveLength(1);
    expect(c.sections[3].rows).toEqual([{ left: "No projections yet", right: "" }]);
  });

  it("says projections are estimates and names the site", () => {
    const f = bestPicksCard({ gameweek: 8, byPosition }).footer;
    expect(f).toContain("fpldilemmas.com");
    expect(f.toLowerCase()).toContain("estimates");
  });
});

describe("statusLabel", () => {
  it("names the FPL status and adds the chance of playing when below 100", () => {
    expect(statusLabel("i", 0)).toBe("Injured · 0% chance");
    expect(statusLabel("d", 75)).toBe("Doubtful · 75% chance");
    expect(statusLabel("s", null)).toBe("Suspended");
    expect(statusLabel("u", null)).toBe("Unavailable");
    expect(statusLabel("a", 50)).toBe("Doubtful · 50% chance");
    expect(statusLabel("d", 100)).toBe("Doubtful");
  });
});

describe("availabilityCard", () => {
  const a = (name: string, status: string, chance: number | null, ownership = 30) => ({
    playerId: 1, name, position: "MID", teamShort: "LIV", status, chanceOfPlayingNextRound: chance, news: "x", ownership,
  });

  it("lists each flagged player with ownership and status, and cites FPL as the source", () => {
    const c = availabilityCard({ gameweek: 8, players: [a("Salah", "d", 75, 45.2)] });
    expect(c.title).toBe("Availability watch");
    expect(c.subtitle).toBe("Gameweek 8 · players owned by 10%+");
    expect(c.sections[0].rows).toEqual([{ left: "Salah (LIV) · 45%", right: "Doubtful · 75% chance" }]);
    expect(c.footer).toContain("fpldilemmas.com");
    expect(c.footer).toContain("FPL");
  });

  it("limits the list and counts the rest; handles no flags", () => {
    const many = Array.from({ length: 13 }, (_, i) => a(`P${i}`, "i", 0));
    const c = availabilityCard({ gameweek: 8, players: many, limit: 10 });
    expect(c.sections[0].rows).toHaveLength(11);
    expect(c.sections[0].rows[10]).toEqual({ left: "+3 more", right: "" });
    expect(availabilityCard({ gameweek: 8, players: [] }).sections[0].rows).toEqual([{ left: "No injury or suspension flags", right: "" }]);
  });
});

describe("priceWatchCard", () => {
  const r = (name: string, price: number, ownership: number) => ({
    playerId: 1, name, teamShort: "ARS", position: "MID", status: "May rise today", currentPrice: price, ownership, calibrating: false,
  });

  it("two sections with price and ownership, and says these are predictions", () => {
    const c = priceWatchCard({ gameweek: 8, risers: [r("Saka", 101, 31.4)], fallers: [] });
    expect(c.title).toBe("Price-change watch");
    expect(c.sections.map((s) => s.heading)).toEqual(["May rise", "May fall"]);
    expect(c.sections[0].rows).toEqual([{ left: "Saka (ARS)", right: "£10.1m · 31% owned" }]);
    expect(c.sections[1].rows).toEqual([{ left: "None predicted", right: "" }]);
    expect(c.footer.toLowerCase()).toContain("predictions");
  });

  it("limits each list", () => {
    const many = Array.from({ length: 9 }, (_, i) => r(`P${i}`, 60, 5));
    const c = priceWatchCard({ gameweek: 8, risers: many, fallers: many, limit: 5 });
    expect(c.sections[0].rows).toHaveLength(6);
    expect(c.sections[0].rows[5].left).toBe("+4 more");
  });
});

describe("dgwBgwCard", () => {
  const t = (name: string) => ({ teamId: 1, name, shortName: name.slice(0, 3).toUpperCase() });

  it("only sections that have teams, with Double, Blank and TBC kept distinct", () => {
    const c = dgwBgwCard({ gameweek: 9, doubles: [t("Arsenal")], blanks: [], tbc: [t("Spurs")] });
    expect(c.title).toBe("Double and blank gameweeks");
    expect(c.sections.map((s) => s.heading)).toEqual(["Double gameweek", "Fixture TBC"]);
    expect(c.sections[0].rows).toEqual([{ left: "Arsenal", right: "" }]);
  });

  it("a gameweek with none says so instead of an empty card", () => {
    const c = dgwBgwCard({ gameweek: 8, doubles: [], blanks: [], tbc: [] });
    expect(c.sections).toEqual([{ rows: [{ left: "No double or blank gameweeks", right: "" }] }]);
  });

  it("limits long lists per section", () => {
    const many = Array.from({ length: 12 }, (_, i) => t(`Team${i}`));
    const c = dgwBgwCard({ gameweek: 9, doubles: [], blanks: many, tbc: [], limit: 8 });
    expect(c.sections[0].rows).toHaveLength(9);
    expect(c.sections[0].rows[8].left).toBe("+4 more");
  });
});

describe("deadlineCard", () => {
  it("shows the gameweek and deadline", () => {
    const c = deadlineCard({ gameweek: 8, deadlineLabel: "Friday 23 Oct, 23:00" });
    expect(c.title).toBe("Gameweek 8 deadline");
    expect(c.sections[0].rows).toContainEqual({ left: "Deadline", right: "Friday 23 Oct, 23:00" });
    expect(c.footer).toContain("fpldilemmas.com");
  });
});

describe("thingsToCheckCard", () => {
  const av = (name: string, status: string, chance: number | null) => ({ playerId: 1, name, status, chanceOfPlayingNextRound: chance, news: "x" });
  const fx = (name: string, gameweeks: number[]) => ({ playerId: 2, name, gameweeks });
  const none = { availability: [], blanks: [], doubles: [], tbc: [] };

  it("titles the card Things to check for the horizon, and cites the site and FPL", () => {
    const c = thingsToCheckCard({ gwLabel: "GW9-14", flags: none });
    expect(c.title).toBe("Things to check");
    expect(c.subtitle).toContain("GW9-14");
    expect(c.footer).toContain("fpldilemmas.com");
  });

  it("one section per kind of flag, only for kinds that have players, in the order injuries, blanks, TBC, doubles", () => {
    const c = thingsToCheckCard({
      gwLabel: "GW9-14",
      flags: { availability: [av("Salah", "d", 75)], blanks: [fx("Haaland", [10])], doubles: [fx("Saka", [11, 12])], tbc: [fx("Palmer", [13])] },
    });
    expect(c.sections.map((s) => s.heading)).toEqual(["Injuries and suspensions", "Blank gameweek", "Fixture TBC", "Double gameweek"]);
    expect(c.sections[0].rows).toEqual([{ left: "Salah", right: "Doubtful · 75% chance" }]);
    expect(c.sections[1].rows).toEqual([{ left: "Haaland", right: "GW10" }]);
    expect(c.sections[3].rows).toEqual([{ left: "Saka", right: "GW11, GW12" }]);
  });

  it("says so when nothing is flagged, instead of an empty card", () => {
    const c = thingsToCheckCard({ gwLabel: "GW9-14", flags: none });
    expect(c.sections).toEqual([{ rows: [{ left: "No injury flags, blank or double gameweeks in your squad", right: "" }] }]);
  });

  it("shortens long names", () => {
    const c = thingsToCheckCard({ gwLabel: "GW9", flags: { ...none, availability: [av("Alexander-Arnold-Long-Name-Here", "i", 0)] } });
    expect(c.sections[0].rows[0].left.length).toBeLessThanOrEqual(22);
  });

  it("caps the rows so the card fits, counting the rest in the last section shown", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => av(`P${i}`, "i", 0));
    const c = thingsToCheckCard({ gwLabel: "GW9", flags: { ...none, availability: many(9), blanks: [fx("A", [9]), fx("B", [9]), fx("C", [9])] }, limit: 10 });
    const rows = c.sections.flatMap((s) => s.rows);
    expect(rows).toHaveLength(11);
    expect(rows[10]).toEqual({ left: "+2 more", right: "" });
  });
});

describe("signedPoints", () => {
  it("uses a real minus sign, an explicit plus and a plain zero", () => {
    expect(signedPoints(6)).toBe("+6");
    expect(signedPoints(-6)).toBe("−6");
    expect(signedPoints(0)).toBe("0");
  });
});

describe("whatIfCard", () => {
  const allRows = (c: ReturnType<typeof whatIfCard>) => c.sections.flatMap((s) => s.rows);
  const text = (c: ReturnType<typeof whatIfCard>) => JSON.stringify(c);
  const weeks = (n: number, f: (gw: number) => any) => Array.from({ length: n }, (_, i) => f(i + 1));

  const setAndForget = (n: number, hitsSaved = 0): any => ({
    scenario: "set-and-forget",
    fromGameweek: 1,
    squad: [],
    rows: weeks(n, (gw) => ({ gameweek: gw, actualBest: 60, fixedBest: 60 - gw, delta: -gw })),
    totals: { actualBest: 60 * n, fixedBest: 60 * n, delta: -51, hitsSaved, netDelta: -51 + hitsSaved },
  });

  it("every card is titled What if, written in the first person and says it is hindsight, not advice", () => {
    const cards = [
      whatIfCard(setAndForget(3)),
      whatIfCard({ scenario: "captain", player: { id: 1, name: "Haaland" }, rows: [], totals: { delta: 0, weeksApplied: 0, weeksAlready: 0, weeksNotInXI: 0, weeksNotInSquad: 0 } } as any),
      whatIfCard({ scenario: "vice", rows: [], totals: { delta: 0, weeksApplied: 0, weeksNotInXI: 0 } } as any),
      whatIfCard({ scenario: "form-captain", rows: [], totals: { delta: 0, weeksApplied: 0, weeksAlready: 0 } } as any),
      whatIfCard({ scenario: "keeper", keeper: { id: 1, name: "Raya" }, startedCounts: [], rows: [], totals: { delta: 0, weeksChanged: 0 } } as any),
      whatIfCard({ scenario: "rotation", position: "DEF", core: [], rows: [], totals: { delta: 0, weeksChanged: 0 } } as any),
      whatIfCard({ scenario: "chips", chips: [], totals: { gain: 0, missed: 0 } } as any),
      whatIfCard({ scenario: "hits", horizon: 4, rows: [], totals: { hits: 0, cost: 0, net: 0, worthIt: 0 } } as any),
      whatIfCard({ scenario: "wildcard", horizon: 4, chips: [], totals: { delta: 0 } } as any),
      whatIfCard({ scenario: "freehit", horizon: 1, chips: [], totals: { delta: 0 } } as any),
    ];
    for (const c of cards) {
      expect(c.title.startsWith("What if · ")).toBe(true);
      expect(c.subtitle).toMatch(/\b(I|I'd|my)\b/);
      expect(c.footer.toLowerCase()).toContain("hindsight");
      expect(c.footer).toContain("fpldilemmas.com");
      expect(allRows(c).length).toBeGreaterThan(0);
    }
  });

  it("set and forget: the headline difference, the gameweek it starts from, and transfer costs saved only when there are some", () => {
    const c = whatIfCard(setAndForget(4));
    expect(c.title).toBe("What if · Set and forget");
    expect(c.subtitle).toContain("GW1");
    expect(allRows(c)).toContainEqual({ left: "Best XI points vs my real squads", right: "−51" });
    expect(text(c)).not.toContain("Transfer costs saved");
    const withHits = whatIfCard(setAndForget(4, 8));
    expect(allRows(withHits)).toContainEqual({ left: "Transfer costs saved", right: "+8" });
    expect(allRows(withHits)).toContainEqual({ left: "Overall", right: "−43" });
  });

  it("a long season is capped to the biggest weeks, in gameweek order, with a count of the rest", () => {
    const c = whatIfCard(setAndForget(30));
    const weekRows = c.sections.find((s) => s.heading === "Gameweek by gameweek")!.rows;
    expect(weekRows.length).toBeLessThanOrEqual(8);
    const shown = weekRows.filter((r) => r.left.startsWith("GW"));
    const gws = shown.map((r) => Number(r.left.match(/^GW(\d+)/)![1]));
    expect([...gws].sort((a, b) => a - b)).toEqual(gws);
    expect(Math.min(...gws)).toBeGreaterThanOrEqual(24); // the largest |delta| are the late weeks in this data
    expect(weekRows[weekRows.length - 1].left).toMatch(/^\+\d+ more gameweeks$/);
    expect(allRows(c).length).toBeLessThanOrEqual(14);
  });

  it("captain: names the player and lists only the weeks it changed something", () => {
    const c = whatIfCard({
      scenario: "captain",
      player: { id: 1, name: "Haaland" },
      rows: [
        { gameweek: 1, status: "applied", playerPoints: 11, captainPoints: 2, delta: 9 },
        { gameweek: 2, status: "already", playerPoints: 8, captainPoints: 8, delta: 0 },
        { gameweek: 3, status: "not-in-squad", playerPoints: null, captainPoints: 5, delta: 0 },
      ],
      totals: { delta: 9, weeksApplied: 1, weeksAlready: 1, weeksNotInXI: 0, weeksNotInSquad: 1 },
    } as any);
    expect(c.subtitle).toBe("What if I'd captained Haaland every week?");
    expect(allRows(c)).toContainEqual({ left: "Points vs my real captains", right: "+9" });
    expect(allRows(c).some((r) => r.left.startsWith("GW1") && r.right === "+9")).toBe(true);
    expect(allRows(c).some((r) => r.left.startsWith("GW3"))).toBe(false);
  });

  it("chips: points my chips gave, what the best weeks would have given, and a friendly note when none were played", () => {
    const c = whatIfCard({
      scenario: "chips",
      chips: [{ chip: "bboost", usedGameweek: 1, gain: 11, best: { gameweek: 2, gain: 15 }, missed: 4 }],
      totals: { gain: 11, missed: 4 },
    } as any);
    expect(allRows(c)).toContainEqual({ left: "Points my chips gave me", right: "11" });
    expect(allRows(c)).toContainEqual({ left: "Best weeks available would have given", right: "15" });
    expect(text(c)).toContain("Bench Boost");
    expect(text(whatIfCard({ scenario: "chips", chips: [], totals: { gain: 0, missed: 0 } } as any))).toContain("No Bench Boost or Triple Captain played yet");
  });

  it("hits: how many, what they cost, the net, and players in and out", () => {
    const c = whatIfCard({
      scenario: "hits",
      horizon: 4,
      rows: [{ gameweek: 5, cost: 4, bought: [{ id: 1, name: "Palmer" }], sold: [{ id: 2, name: "Saka" }], pointsBought: 20, pointsSold: 9, net: 7, weeksCounted: 4, partial: false }],
      totals: { hits: 1, cost: 4, net: 7, worthIt: 1 },
    } as any);
    expect(allRows(c)).toContainEqual({ left: "Hits taken", right: "1 (−4)" });
    expect(allRows(c)).toContainEqual({ left: "Net after the hits", right: "+7" });
    expect(text(c)).toContain("Palmer");
    expect(text(c)).toContain("Saka");
  });

  it("wildcard and free hit: named correctly, with a note when the chip was not played", () => {
    expect(whatIfCard({ scenario: "wildcard", horizon: 4, chips: [], totals: { delta: 0 } } as any).title).toBe("What if · No Wildcard");
    expect(whatIfCard({ scenario: "freehit", horizon: 1, chips: [], totals: { delta: 0 } } as any).title).toBe("What if · No Free Hit");
    expect(text(whatIfCard({ scenario: "freehit", horizon: 1, chips: [], totals: { delta: 0 } } as any))).toContain("No Free Hit played yet");
  });

  it("rotation rows name only the players who differ, not the whole lineup", () => {
    const p = (id: number, name: string) => ({ id, name, points: 1 });
    const c = whatIfCard({
      scenario: "rotation",
      position: "DEF",
      core: [],
      rows: [{ gameweek: 2, status: "changed", started: [p(1, "Gabriel"), p(2, "Saliba"), p(3, "Timber")], instead: [p(1, "Gabriel"), p(2, "Saliba"), p(4, "Van Hecke")], delta: 8 }],
      totals: { delta: 8, weeksChanged: 1 },
    } as any);
    const row = allRows(c).find((r) => r.left.startsWith("GW2"))!;
    expect(row.left).toBe("GW2 · Van Hecke for Timber");
    expect(row.right).toBe("+8");
  });

  it("rotation and keeper: say so when nothing would have changed", () => {
    expect(text(whatIfCard({ scenario: "rotation", position: "MID", core: [], rows: [], totals: { delta: 0, weeksChanged: 0 } } as any))).toContain("I already started the same midfielders every week");
    expect(text(whatIfCard({ scenario: "keeper", keeper: { id: 1, name: "Raya" }, startedCounts: [], rows: [], totals: { delta: 0, weeksChanged: 0 } } as any))).toContain("I started Raya every week he was in my squad");
  });
});
