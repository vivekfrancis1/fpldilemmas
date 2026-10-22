import { describe, it, expect } from "vitest";
import { captainsCard, hindsightCard, truncateName, shareFileName } from "../shared/share-cards";

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
