import { describe, it, expect } from "vitest";
import { adjustPlayerForAvailability } from "../server/availability-player-adjustment";

const COMPS = [
  "pointsFromGoals", "pointsFromAssists", "pointsFromCleanSheets", "pointsFromMinutes", "pointsFromBonus",
  "pointsFromSaves", "pointsFromGoalsConceded", "pointsFromYellowCards", "pointsFromRedCards", "pointsFromDefensiveContributions",
];

// A raw stored player: per-GW totals and one populated component.
const makePlayer = (gwPoints: Record<string, number>) => {
  const player: any = { playerId: 1, playerName: "Test", price: 5, totalExpectedPoints: 0, averagePerGameweek: 0, averageValue: 0, gameweekProjections: { ...gwPoints } };
  for (const k of COMPS) player[k] = {};
  for (const gw of Object.keys(gwPoints)) player.pointsFromGoals[gw] = gwPoints[gw] / 2;
  player.totalExpectedPoints = Object.values(gwPoints).reduce((a, b) => a + b, 0);
  return player;
};
const ctx = { currentGameweek: 6, events: [] as any[] };
const available = { status: "a", chance_of_playing_next_round: null, news: "" };

describe("adjustPlayerForAvailability", () => {
  it("leaves a fully available player's projections and total untouched, with no adjustments", () => {
    const p = makePlayer({ "7": 5, "8": 6 });
    const out = adjustPlayerForAvailability(p, available, ctx);
    expect(out.gameweekProjections).toEqual({ "7": 5, "8": 6 });
    expect(out.totalExpectedPoints).toBe(11);
    expect(out.availabilityAdjustments).toEqual({});
    expect(out.originalGameweekProjections).toBeUndefined();
  });

  it("zeroes every gameweek for a player who has left the club and recomputes total, average and value", () => {
    const p = makePlayer({ "7": 5, "8": 6, "9": 4 });
    p.averagePerGameweek = 5; p.averageValue = 3;
    const out = adjustPlayerForAvailability(p, { status: "u", chance_of_playing_next_round: 0, news: "Has joined Genoa permanently" }, ctx);
    expect(Object.values(out.gameweekProjections).every((v) => v === 0)).toBe(true);
    expect(out.totalExpectedPoints).toBe(0); // was 15 raw — must follow the adjusted gameweeks
    expect(out.averagePerGameweek).toBe(0);
    expect(out.averageValue).toBe(0);
    expect(out.originalGameweekProjections).toEqual({ "7": 5, "8": 6, "9": 4 });
    expect(out.availabilityAdjustments["7"]).toEqual({ original: 5, adjusted: 0, reason: "Unavailable" });
  });

  it("labels injured and suspended zeroing reasons", () => {
    const inj = adjustPlayerForAvailability(makePlayer({ "7": 5 }), { status: "i", chance_of_playing_next_round: 0, news: "Hamstring" }, ctx);
    expect(inj.availabilityAdjustments["7"].reason).toBe("Injured");
    const sus = adjustPlayerForAvailability(makePlayer({ "7": 5 }), { status: "s", chance_of_playing_next_round: 0, news: "Suspended" }, ctx);
    expect(sus.availabilityAdjustments["7"].reason).toBe("Suspended");
  });

  it("explains a doubtful player's next-gameweek discount and unscales the component for that gameweek", () => {
    const p = makePlayer({ "7": 3, "8": 6 }); // GW7 already scaled by 0.75 upstream
    const out = adjustPlayerForAvailability(p, { status: "d", chance_of_playing_next_round: 75, news: "Knock" }, ctx);
    expect(out.gameweekProjections["7"]).toBe(3); // projections stay as stored (already scaled)
    expect(out.availabilityAdjustments["7"]).toEqual({ original: 4, adjusted: 3, reason: "75% chance of playing" });
    expect(out.availabilityAdjustments["8"]).toBeUndefined();
    expect(out.pointsFromGoals["7"]).toBeCloseTo(1.5 / 0.75, 2); // component unscaled back to full health
    expect(out.pointsFromGoals["8"]).toBe(3);
    expect(out.totalExpectedPoints).toBe(9);
  });

  it("averages over gameweeks that actually have points (blank/zeroed gameweeks don't dilute it)", () => {
    const p = makePlayer({ "7": 4, "8": 0, "9": 6 });
    const out = adjustPlayerForAvailability(p, available, ctx);
    expect(out.totalExpectedPoints).toBe(10);
    expect(out.averagePerGameweek).toBe(5);
    expect(out.averageValue).toBe(2); // 10 / price 5
  });

  it("can strip the synthetic GW39 bucket (the cached endpoint never exposes it)", () => {
    const p = makePlayer({ "7": 5, "39": 4 });
    const kept = adjustPlayerForAvailability(p, available, ctx);
    const stripped = adjustPlayerForAvailability(p, available, ctx, { stripGW39: true });
    expect(kept.gameweekProjections["39"]).toBe(4);
    expect(stripped.gameweekProjections["39"]).toBeUndefined();
    expect(stripped.totalExpectedPoints).toBe(5);
  });

  it("with no bootstrap record: no adjustments, and the total still matches the (optionally stripped) gameweeks", () => {
    const p = makePlayer({ "7": 5, "39": 4 });
    const out = adjustPlayerForAvailability(p, undefined, ctx, { stripGW39: true });
    expect(out.availabilityAdjustments).toEqual({});
    expect(out.totalExpectedPoints).toBe(5);
  });

  it("never mutates its input", () => {
    const p = makePlayer({ "7": 5, "8": 6 });
    const before = JSON.stringify(p);
    adjustPlayerForAvailability(p, { status: "u", chance_of_playing_next_round: 0, news: "Has joined X permanently" }, ctx, { stripGW39: true });
    expect(JSON.stringify(p)).toBe(before);
  });
});
