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
