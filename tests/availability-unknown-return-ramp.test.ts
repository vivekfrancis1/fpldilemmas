import { describe, it, expect } from "vitest";
import { calculateAvailabilityProbability, type BootstrapEvent } from "../server/availability-adjustments";

// No gameweek events needed for these cases — the player's news has no parseable
// return date, so calculateAvailabilityProbability falls back to the generic ramp.
const events: BootstrapEvent[] = [];

const injuredNoReturnDate = {
  chance_of_playing_next_round: 0,
  status: "i",
  news: "Back injury - Unknown return date",
};

describe("calculateAvailabilityProbability — unknown return date ramp", () => {
  const currentGameweek = 0; // pre-season; nextGW = 1

  it("stays at 0% for the next 6 gameweeks (GW1-GW6)", () => {
    for (let gw = 1; gw <= 6; gw++) {
      expect(calculateAvailabilityProbability(injuredNoReturnDate, gw, currentGameweek, events)).toBe(0);
    }
  });

  it("rises to 25% in the 7th gameweek", () => {
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 7, currentGameweek, events)).toBe(0.25);
  });

  it("rises to 50% in the 8th gameweek", () => {
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 8, currentGameweek, events)).toBe(0.5);
  });

  it("rises to 75% in the 9th gameweek", () => {
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 9, currentGameweek, events)).toBe(0.75);
  });

  it("reaches 100% from the 10th gameweek onward", () => {
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 10, currentGameweek, events)).toBe(1.0);
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 15, currentGameweek, events)).toBe(1.0);
  });

  it("shifts with currentGameweek — mid-season, next 6 GWs from nextGW stay 0%", () => {
    const midSeasonGW = 10; // nextGW = 11
    for (let gw = 11; gw <= 16; gw++) {
      expect(calculateAvailabilityProbability(injuredNoReturnDate, gw, midSeasonGW, events)).toBe(0);
    }
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 17, midSeasonGW, events)).toBe(0.25);
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 18, midSeasonGW, events)).toBe(0.5);
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 19, midSeasonGW, events)).toBe(0.75);
    expect(calculateAvailabilityProbability(injuredNoReturnDate, 20, midSeasonGW, events)).toBe(1.0);
  });
});
