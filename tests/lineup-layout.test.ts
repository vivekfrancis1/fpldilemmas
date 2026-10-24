import { describe, it, expect } from "vitest";
import { layoutLineup, type LayoutPlayer } from "../shared/lineup-layout";

const p = (id: number, role: string | null, fallback: LayoutPlayer["fallback"], xMins = 90): LayoutPlayer => ({ id, role, fallback, xMins });
const ids = (rows: ReturnType<typeof layoutLineup>["rows"], key: string) => rows.find((r) => r.key === key)?.ids ?? [];

describe("layoutLineup: players sit where their detailed position says, left to right", () => {
  it("a back four goes LB, CB, CB, RB whatever the minutes order", () => {
    const l = layoutLineup([p(1, "GK", "GKP"), p(2, "RB", "DEF", 90), p(3, "CB", "DEF", 88), p(4, "LB", "DEF", 60), p(5, "CB", "DEF", 85)]);
    expect(ids(l.rows, "GKP")).toEqual([1]);
    expect(ids(l.rows, "DEF")).toEqual([4, 3, 5, 2]);
  });

  it("a 4-2-3-1: two holders, then winger-CAM-winger, then the striker", () => {
    const l = layoutLineup([
      p(1, "GK", "GKP"), p(2, "LB", "DEF"), p(3, "CB", "DEF"), p(4, "CB", "DEF"), p(5, "RB", "DEF"),
      p(6, "CDM", "MID"), p(7, "CDM", "MID"), p(8, "RW", "MID"), p(9, "CAM", "MID"), p(10, "LW", "MID"), p(11, "ST", "FWD"),
    ]);
    expect(l.rows.map((r) => r.key)).toEqual(["GKP", "DEF", "MID", "AM", "FWD"]);
    expect(ids(l.rows, "MID")).toEqual([6, 7]);
    expect(ids(l.rows, "AM")).toEqual([10, 9, 8]);
    expect(ids(l.rows, "FWD")).toEqual([11]);
    expect(l.formation).toBe("4-2-3-1");
  });

  it("a 4-3-3 with no attacking midfielder: the wingers flank the striker", () => {
    const l = layoutLineup([
      p(1, "GK", "GKP"), p(2, "LB", "DEF"), p(3, "CB", "DEF"), p(4, "CB", "DEF"), p(5, "RB", "DEF"),
      p(6, "CM", "MID"), p(7, "CDM", "MID"), p(8, "CM", "MID"), p(9, "RW", "FWD"), p(10, "ST", "FWD"), p(11, "LW", "FWD"),
    ]);
    expect(ids(l.rows, "FWD")).toEqual([11, 10, 9]);
    expect(l.rows.map((r) => r.key)).toEqual(["GKP", "DEF", "MID", "FWD"]);
    expect(l.formation).toBe("4-3-3");
  });

  it("a 4-4-2: LM, CM, CM, RM and two strikers", () => {
    const l = layoutLineup([
      p(1, "GK", "GKP"), p(2, "LB", "DEF"), p(3, "CB", "DEF"), p(4, "CB", "DEF"), p(5, "RB", "DEF"),
      p(6, "RM", "MID"), p(7, "CM", "MID"), p(8, "CM", "MID"), p(9, "LM", "MID"), p(10, "ST", "FWD"), p(11, "ST", "FWD"),
    ]);
    expect(ids(l.rows, "MID")).toEqual([9, 7, 8, 6]);
    expect(l.formation).toBe("4-4-2");
  });

  it("wing-backs sit in the midfield line when there are three centre-backs", () => {
    const l = layoutLineup([
      p(1, "GK", "GKP"), p(2, "CB", "DEF"), p(3, "CB", "DEF"), p(4, "CB", "DEF"),
      p(5, "RWB", "DEF"), p(6, "CM", "MID"), p(7, "CM", "MID"), p(8, "LWB", "DEF"), p(9, "ST", "FWD"), p(10, "ST", "FWD"), p(11, "ST", "FWD"),
    ]);
    expect(ids(l.rows, "DEF")).toHaveLength(3);
    expect(ids(l.rows, "MID")).toEqual([8, 6, 7, 5]);
    expect(l.formation).toBe("3-4-3");
  });

  it("wing-backs sit in the back line when there are only two centre-backs", () => {
    const l = layoutLineup([
      p(1, "GK", "GKP"), p(2, "LWB", "DEF"), p(3, "CB", "DEF"), p(4, "CB", "DEF"), p(5, "RWB", "DEF"),
      p(6, "CM", "MID"), p(7, "CM", "MID"), p(8, "CM", "MID"), p(9, "ST", "FWD"), p(10, "ST", "FWD"), p(11, "ST", "FWD"),
    ]);
    expect(ids(l.rows, "DEF")).toEqual([2, 3, 4, 5]);
  });

  it("an FPL defender who plays on the left wing is drawn on the left wing, not at the back", () => {
    const l = layoutLineup([
      p(1, "GK", "GKP"), p(2, "CB", "DEF"), p(3, "CB", "DEF"), p(4, "CB", "DEF"), p(5, "RB", "DEF"),
      p(6, "CM", "MID"), p(7, "CM", "MID"), p(8, "CM", "MID"), p(9, "LW", "DEF"), p(10, "ST", "FWD"), p(11, "RW", "MID"),
    ]);
    expect(ids(l.rows, "FWD")).toEqual([9, 10, 11]);
    expect(ids(l.rows, "DEF")).toEqual([2, 3, 4, 5]);
  });

  it("a player with no detailed position falls back on his FPL position", () => {
    const l = layoutLineup([p(1, null, "GKP"), p(2, null, "DEF"), p(3, null, "MID"), p(4, null, "FWD")]);
    expect(ids(l.rows, "GKP")).toEqual([1]);
    expect(ids(l.rows, "DEF")).toEqual([2]);
    expect(ids(l.rows, "MID")).toEqual([3]);
    expect(ids(l.rows, "FWD")).toEqual([4]);
  });

  it("ties on position are broken by expected minutes, then id", () => {
    const l = layoutLineup([p(2, "CB", "DEF", 70), p(1, "CB", "DEF", 90), p(3, "CB", "DEF", 90)]);
    expect(ids(l.rows, "DEF")).toEqual([1, 3, 2]);
  });

  it("leaves out empty lines and has no formation without outfield players", () => {
    const l = layoutLineup([p(1, "GK", "GKP")]);
    expect(l.rows.map((r) => r.key)).toEqual(["GKP"]);
    expect(l.formation).toBe("");
  });
});
