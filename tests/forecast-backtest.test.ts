import { describe, it, expect } from "vitest";
import { summarizeMinutesForecast, type ForecastRow } from "../server/forecast-backtest";

const rows: ForecastRow[] = [
  { forecast: 88, actual: 90 },
  { forecast: 88, actual: 90 },
  { forecast: 88, actual: 0 },
  { forecast: 88, actual: 85 },
  { forecast: 20, actual: 0 },
  { forecast: 20, actual: 30 },
  { forecast: 20, actual: 0 },
  { forecast: 20, actual: 0 },
];

describe("summarizeMinutesForecast", () => {
  it("reports overall bias (forecast minus actual) and mean absolute error", () => {
    const s = summarizeMinutesForecast(rows);
    expect(s.n).toBe(8);
    const meanForecast = (88 * 4 + 20 * 4) / 8;
    const meanActual = (90 + 90 + 0 + 85 + 0 + 30 + 0 + 0) / 8;
    expect(s.bias).toBeCloseTo(meanForecast - meanActual, 9);
    expect(s.meanAbsError).toBeGreaterThan(0);
  });

  it("splits by forecast bucket with realised mean and the realised P(60+) and P(plays)", () => {
    const s = summarizeMinutesForecast(rows);
    const high = s.byBucket.find((b) => b.label === "75+")!;
    const low = s.byBucket.find((b) => b.label === "<30")!;
    expect(high.n).toBe(4);
    expect(high.actualMean).toBeCloseTo((90 + 90 + 0 + 85) / 4, 9);
    expect(high.actualP60).toBeCloseTo(3 / 4, 9);
    expect(low.actualPPlays).toBeCloseTo(1 / 4, 9);
  });

  it("handles empty input without NaN", () => {
    const s = summarizeMinutesForecast([]);
    expect(s.n).toBe(0);
    expect(s.bias).toBe(0);
    expect(s.meanAbsError).toBe(0);
  });
});
