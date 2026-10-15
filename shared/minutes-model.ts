// P(minutes bucket | expected minutes), from the calibration in minutes-distribution.generated.ts.
//
// Indexed by EXPECTED minutes (each calibration bin's realised mean), not by the proxy forecast
// the table was built from. That makes it valid for any forecast whose mean is right — notably
// Copilot's xMins, which already include injury/news risk. Anchored at 0 (never plays) and 90
// (always a 75+ appearance), and linearly interpolated, so every output is a proper distribution.
import { MINUTES_BINS, BUCKET_MEAN_MINUTES } from "./minutes-distribution.generated";

export interface MinutesDistribution {
  pZero: number;
  p1to29: number;
  p30to59: number;
  p60to74: number;
  p75plus: number;
}

// Real average minutes within each bucket (from the calibration data), for turning a
// distribution back into a mean or feeding per-bucket maths (Poisson mean = rate x minutes / 90).
export const BUCKET_MINUTES = BUCKET_MEAN_MINUTES;

type Knot = { e: number } & MinutesDistribution;

const KNOTS: Knot[] = (() => {
  const real = MINUTES_BINS.filter((b) => b.n > 0)
    .map((b) => {
      // The generated table is rounded to 4 d.p.; renormalise so each row is exactly a distribution.
      const total = b.pZero + b.p1to29 + b.p30to59 + b.p60to74 + b.p75plus || 1;
      return { e: b.meanMinutes, pZero: b.pZero / total, p1to29: b.p1to29 / total, p30to59: b.p30to59 / total, p60to74: b.p60to74 / total, p75plus: b.p75plus / total };
    })
    .sort((a, b) => a.e - b.e);
  return [
    { e: 0, pZero: 1, p1to29: 0, p30to59: 0, p60to74: 0, p75plus: 0 },
    ...real.filter((k) => k.e > 0 && k.e < 90),
    { e: 90, pZero: 0, p1to29: 0, p30to59: 0, p60to74: 0, p75plus: 1 },
  ];
})();

export function minutesDistribution(expectedMinutes: number): MinutesDistribution {
  const e = Math.min(90, Math.max(0, expectedMinutes));
  for (let i = 1; i < KNOTS.length; i++) {
    const lo = KNOTS[i - 1], hi = KNOTS[i];
    if (e <= hi.e) {
      const t = hi.e === lo.e ? 0 : (e - lo.e) / (hi.e - lo.e);
      const mix = (a: number, b: number) => a + (b - a) * t;
      return {
        pZero: mix(lo.pZero, hi.pZero),
        p1to29: mix(lo.p1to29, hi.p1to29),
        p30to59: mix(lo.p30to59, hi.p30to59),
        p60to74: mix(lo.p60to74, hi.p60to74),
        p75plus: mix(lo.p75plus, hi.p75plus),
      };
    }
  }
  const last = KNOTS[KNOTS.length - 1];
  return { pZero: last.pZero, p1to29: last.p1to29, p30to59: last.p30to59, p60to74: last.p60to74, p75plus: last.p75plus };
}

export const pPlays = (expectedMinutes: number): number => 1 - minutesDistribution(expectedMinutes).pZero;

export const pAtLeast60 = (expectedMinutes: number): number => {
  const d = minutesDistribution(expectedMinutes);
  return d.p60to74 + d.p75plus;
};

export function expectedMinutesOf(d: MinutesDistribution): number {
  return d.pZero * BUCKET_MINUTES.zero + d.p1to29 * BUCKET_MINUTES.p1to29 + d.p30to59 * BUCKET_MINUTES.p30to59 +
    d.p60to74 * BUCKET_MINUTES.p60to74 + d.p75plus * BUCKET_MINUTES.p75plus;
}
