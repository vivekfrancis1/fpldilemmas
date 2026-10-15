import { describe, it, expect } from "vitest";
import { minutesDistribution, pPlays, pAtLeast60, BUCKET_MINUTES, expectedMinutesOf } from "../shared/minutes-model";

const sum = (d: ReturnType<typeof minutesDistribution>) => d.pZero + d.p1to29 + d.p30to59 + d.p60to74 + d.p75plus;

describe("minutes model: distribution as a function of EXPECTED minutes", () => {
  it("is a proper probability distribution everywhere", () => {
    for (let e = 0; e <= 90; e += 2.5) expect(sum(minutesDistribution(e))).toBeCloseTo(1, 9);
  });

  it("anchors: 0 expected minutes never plays; 90 expected minutes is always a 75+ appearance", () => {
    expect(minutesDistribution(0).pZero).toBe(1);
    expect(minutesDistribution(90).p75plus).toBe(1);
  });

  it("clamps out-of-range inputs", () => {
    expect(minutesDistribution(-5)).toEqual(minutesDistribution(0));
    expect(minutesDistribution(120)).toEqual(minutesDistribution(90));
  });

  it("P(plays) and P(60+) never decrease as expected minutes rise", () => {
    let prevPlay = -1, prev60 = -1;
    for (let e = 0; e <= 90; e += 1) {
      const play = pPlays(e), p60 = pAtLeast60(e);
      expect(play).toBeGreaterThanOrEqual(prevPlay - 1e-9);
      expect(p60).toBeGreaterThanOrEqual(prev60 - 1e-9);
      prevPlay = play; prev60 = p60;
    }
  });

  it("a nailed-on 88-minute player is very likely 60+, a 45-minute one is not", () => {
    expect(pAtLeast60(88)).toBeGreaterThan(0.9);
    expect(pAtLeast60(45)).toBeLessThan(0.6);
    expect(pAtLeast60(45)).toBeGreaterThan(0.2);
  });

  it("is internally consistent: the mean implied by the buckets is close to the expected minutes put in", () => {
    for (const e of [10, 20, 30, 45, 60, 75, 85]) {
      expect(Math.abs(expectedMinutesOf(minutesDistribution(e)) - e)).toBeLessThan(10);
    }
  });

  it("exposes representative minutes per bucket in ascending order", () => {
    const m = [BUCKET_MINUTES.zero, BUCKET_MINUTES.p1to29, BUCKET_MINUTES.p30to59, BUCKET_MINUTES.p60to74, BUCKET_MINUTES.p75plus];
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
  });
});
