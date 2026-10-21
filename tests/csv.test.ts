import { describe, it, expect } from "vitest";
import { buildCsv, csvEscape, numericFromDisplay, textOfNode, csvFileName } from "../shared/csv";

describe("csvEscape", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvEscape("Haaland")).toBe("Haaland");
    expect(csvEscape(12.5)).toBe("12.5");
    expect(csvEscape(0)).toBe("0");
  });

  it("quotes values containing commas, quotes or line breaks, doubling embedded quotes", () => {
    expect(csvEscape("Smith, John")).toBe('"Smith, John"');
    expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape("a\r\nb")).toBe('"a\r\nb"');
  });

  it("null and undefined become empty", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });

  it("defuses spreadsheet formulas in text cells but keeps real negative numbers", () => {
    expect(csvEscape("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvEscape("+44 123")).toBe("'+44 123");
    expect(csvEscape("@cmd")).toBe("'@cmd");
    expect(csvEscape("-cmd")).toBe("'-cmd");
    expect(csvEscape(-3)).toBe("-3");
    expect(csvEscape("-3.5")).toBe("-3.5");
  });

  it("keeps accented names intact", () => {
    expect(csvEscape("Ekitiké")).toBe("Ekitiké");
  });
});

describe("buildCsv", () => {
  it("writes a header row then data rows with CRLF line endings and the given column order", () => {
    const csv = buildCsv(["Player", "Pts"], [["Haaland", 58], ["Saka", 41]]);
    expect(csv).toBe("Player,Pts\r\nHaaland,58\r\nSaka,41");
  });

  it("escapes both headers and cells", () => {
    expect(buildCsv(["Name, full", "x"], [['O"Neil', "a,b"]])).toBe('"Name, full",x\r\n"O""Neil","a,b"');
  });

  it("pads or trims nothing: a short row stays short, empty rows give only the header", () => {
    expect(buildCsv(["a", "b"], [])).toBe("a,b");
    expect(buildCsv(["a", "b"], [[1]])).toBe("a,b\r\n1");
  });
});

describe("numericFromDisplay (turn what the table shows into a plain number)", () => {
  it("strips price, percent and thousands formatting", () => {
    expect(numericFromDisplay("£5.5m")).toBe(5.5);
    expect(numericFromDisplay("12.3%")).toBe(12.3);
    expect(numericFromDisplay("1,234,567")).toBe(1234567);
    expect(numericFromDisplay("+0.3")).toBe(0.3);
    expect(numericFromDisplay("-0.2")).toBe(-0.2);
    expect(numericFromDisplay("58")).toBe(58);
  });

  it("placeholders and non-numbers give null, never 0", () => {
    for (const t of ["—", "-", "N/A", "...", "", "abc", "NaN"]) expect(numericFromDisplay(t)).toBeNull();
  });
});

describe("textOfNode (read the text of a rendered table cell)", () => {
  it("reads strings, numbers and nested element children", () => {
    expect(textOfNode("£5.5m")).toBe("£5.5m");
    expect(textOfNode(12)).toBe("12");
    expect(textOfNode({ props: { children: "58" } })).toBe("58");
    expect(textOfNode({ props: { children: ["£", { props: { children: "5.5" } }, "m"] } })).toBe("£5.5m");
    expect(textOfNode({ props: { children: [{ props: { children: "+" } }, "0.3"] } })).toBe("+0.3");
  });

  it("ignores null, undefined and booleans", () => {
    expect(textOfNode(null)).toBe("");
    expect(textOfNode(undefined)).toBe("");
    expect(textOfNode({ props: { children: [false, null, "7"] } })).toBe("7");
  });
});

describe("csvFileName", () => {
  it("builds a safe, readable file name", () => {
    expect(csvFileName(["fpl-dilemmas", "player-stats", "2026/27", "Per 90"], "2026-10-21")).toBe(
      "fpl-dilemmas-player-stats-2026-27-per-90-2026-10-21.csv",
    );
  });
});
