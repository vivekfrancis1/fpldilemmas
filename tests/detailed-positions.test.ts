import { describe, it, expect } from "vitest";
import {
  POSITION_LABELS,
  allowedFplPositions,
  buildPositionRecord,
  fplPositionFromType,
  matchFplToFotmob,
  normalizeName,
  parsePositionCodes,
  type FotmobMember,
  type FplPlayerInput,
} from "../shared/detailed-positions";

const fpl = (id: number, first: string, second: string, web: string, type = 2, team = 1): FplPlayerInput => ({ id, first_name: first, second_name: second, web_name: web, element_type: type, team });
const fm = (id: number, name: string, codes: string): FotmobMember => ({ id, name, positionIdsDesc: codes });

describe("normalizeName", () => {
  it("lower-cases, strips accents and punctuation", () => {
    expect(normalizeName("Piero Hincapié")).toBe("piero hincapie");
    expect(normalizeName("N'Golo  Kanté")).toBe("ngolo kante");
    expect(normalizeName("Lewis-Skelly")).toBe("lewis skelly");
  });
  it("turns letters that do not decompose into plain ones", () => {
    expect(normalizeName("Ødegaard")).toBe("odegaard");
    expect(normalizeName("Gyökeres")).toBe("gyokeres");
  });
});

describe("parsePositionCodes / fplPositionFromType", () => {
  it("splits the comma list in order, main position first", () => {
    expect(parsePositionCodes("LB,CB")).toEqual(["LB", "CB"]);
    expect(parsePositionCodes("GK")).toEqual(["GK"]);
  });
  it("ignores blanks, unknown codes and repeats", () => {
    expect(parsePositionCodes("")).toEqual([]);
    expect(parsePositionCodes(undefined)).toEqual([]);
    expect(parsePositionCodes("CB, XX,CB,RB")).toEqual(["CB", "RB"]);
  });
  it("maps FPL's element_type", () => {
    expect([1, 2, 3, 4].map(fplPositionFromType)).toEqual(["GKP", "DEF", "MID", "FWD"]);
  });
});

describe("labels and allowed FPL positions", () => {
  it("every code has a readable label", () => {
    expect(POSITION_LABELS.LB).toBe("Left-back");
    expect(POSITION_LABELS.CB).toBe("Centre-back");
    expect(POSITION_LABELS.CDM).toBe("Defensive midfield");
    expect(POSITION_LABELS.ST).toBe("Striker");
    expect(Object.keys(POSITION_LABELS).sort()).toEqual(["CAM", "CB", "CDM", "CM", "GK", "LB", "LM", "LW", "LWB", "RB", "RM", "RW", "RWB", "ST"]);
  });
  it("a winger can be a midfielder or a forward in FPL; a centre-back only a defender", () => {
    expect(allowedFplPositions("RW")).toEqual(["MID", "FWD"]);
    expect(allowedFplPositions("CB")).toEqual(["DEF"]);
    expect(allowedFplPositions("GK")).toEqual(["GKP"]);
    expect(allowedFplPositions("ST")).toEqual(["FWD"]);
  });
});

describe("matchFplToFotmob", () => {
  it("matches by full name, even when FPL's surname is longer", () => {
    const r = matchFplToFotmob([fpl(1, "David", "Raya Martín", "Raya", 1)], [fm(10, "David Raya", "GK")]);
    expect(r.matches.get(1)?.member.id).toBe(10);
    expect(r.matches.get(1)?.method).toBe("name");
  });
  it("matches when FotMob has a longer name than FPL (Juan Angulo / Juan Riquelme Angulo)", () => {
    const r = matchFplToFotmob([fpl(40, "Juan", "Angulo", "J.Angulo", 3)], [fm(50, "Juan Riquelme Angulo", "RW"), fm(51, "Nilson Angulo", "LW")]);
    expect(r.matches.get(40)?.member.id).toBe(50);
    expect(r.matches.get(40)?.method).toBe("name-part");
  });
  it("matches a mononym by web name", () => {
    const r = matchFplToFotmob([fpl(2, "Gabriel", "Magalhães", "Gabriel")], [fm(11, "Gabriel", "CB")]);
    expect(r.matches.get(2)?.member.id).toBe(11);
    expect(r.matches.get(2)?.method).toBe("web-name");
  });
  it("matches a short web name that sits inside the FotMob name", () => {
    const r = matchFplToFotmob([fpl(3, "Bukayo", "Saka", "Saka", 3)], [fm(12, "Bukayo Saka", "RW,CAM")]);
    expect(r.matches.get(3)?.member.id).toBe(12);
  });
  it("ignores accents", () => {
    const r = matchFplToFotmob([fpl(4, "Piero", "Hincapié", "Hincapié")], [fm(13, "Piero Hincapie", "LB,CB")]);
    expect(r.matches.get(4)?.member.id).toBe(13);
  });
  it("never matches an ambiguous name: two players sharing a surname stay unmatched when nothing else tells them apart", () => {
    const r = matchFplToFotmob(
      [fpl(5, "Jacob", "Ramsey", "Ramsey"), fpl(6, "Aaron", "Ramsey", "Ramsey")],
      [fm(14, "Jacob Ramsey", "CAM"), fm(15, "Aaron Ramsey", "CM")],
    );
    // full names settle it
    expect(r.matches.get(5)?.member.id).toBe(14);
    expect(r.matches.get(6)?.member.id).toBe(15);
    const amb = matchFplToFotmob([fpl(7, "J.", "Smith", "Smith")], [fm(16, "Adam Smith", "RB"), fm(17, "Dan Smith", "LB")]);
    expect(amb.matches.size).toBe(0);
    expect(amb.unmatchedFpl.map((p) => p.id)).toEqual([7]);
  });
  it("never gives one FotMob player to two FPL players: if both claim him, neither gets him", () => {
    const r = matchFplToFotmob([fpl(8, "Joe", "Gomez", "Gomez"), fpl(9, "Joe", "Gomez", "Gomez")], [fm(18, "Joe Gomez", "CB")]);
    expect(r.matches.size).toBe(0);
    expect(r.unmatchedFpl).toHaveLength(2);
    expect(r.unmatchedFotmob.map((m) => m.id)).toEqual([18]);
  });
  it("reports FotMob players with no FPL match", () => {
    const r = matchFplToFotmob([], [fm(19, "Someone Else", "ST")]);
    expect(r.unmatchedFotmob.map((m) => m.id)).toEqual([19]);
  });
});

describe("buildPositionRecord", () => {
  it("keeps the main position first and the others after, with labels", () => {
    const rec = buildPositionRecord(fpl(20, "Jurriën", "Timber", "Timber", 2), fm(30, "Jurriën Timber", "RB,CB,LB"), "name");
    expect(rec).toMatchObject({
      fplPlayerId: 20,
      fplPosition: "DEF",
      mainPosition: "RB",
      mainPositionLabel: "Right-back",
      otherPositions: ["CB", "LB"],
      fotmobPlayerId: 30,
      matchMethod: "name",
      outOfPosition: false,
    });
  });
  it("flags a player whose main position is outside his FPL position (De Cuyper: FPL defender, plays left wing)", () => {
    const rec = buildPositionRecord(fpl(21, "Maxim", "De Cuyper", "De Cuyper", 2), fm(31, "Maxim De Cuyper", "LW,LB"), "name");
    expect(rec?.mainPosition).toBe("LW");
    expect(rec?.otherPositions).toEqual(["LB"]);
    expect(rec?.outOfPosition).toBe(true);
  });
  it("does not flag a winger listed as a midfielder", () => {
    expect(buildPositionRecord(fpl(22, "Bukayo", "Saka", "Saka", 3), fm(32, "Bukayo Saka", "RW,CAM"), "name")?.outOfPosition).toBe(false);
  });
  it("returns null when FotMob gives no position", () => {
    expect(buildPositionRecord(fpl(23, "A", "B", "B"), fm(33, "A B", ""), "name")).toBeNull();
  });
});
