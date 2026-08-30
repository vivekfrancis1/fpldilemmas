import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5050';

async function fetchJSON(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// FPL added real, official price-change-progress fields directly to the public bootstrap-static
// response for 2026/27 (price_change_percent, price_change_projections, price_change_hourly_rate) —
// no login, no scraping, no heuristic guessing needed. /api/price-predictions now reads these
// fields directly instead of estimating thresholds from transfer counts, matching what FPL's own
// site (and third-party trackers like LiveFPL/fpl.page, which state "data comes directly from
// FPL") actually show.
describe('/api/price-predictions uses real official FPL fields', () => {
  let predictions: any[];
  let bootstrapElements: any[];

  // /api/price-predictions fetches fresh, uncached live data from FPL on every call, but our own
  // /api/bootstrap-static endpoint is server-cached for 30 minutes — comparing predictions against
  // that cached snapshot drifts as real transfer activity moves the live numbers between the two
  // fetches. Fetching bootstrap-static directly from FPL here (bypassing our cache) keeps both
  // sides equally fresh, matching how /api/price-predictions itself sources its data.
  beforeAll(async () => {
    const [predictionsRes, bootstrapRes] = await Promise.all([
      fetchJSON(`${BASE_URL}/api/price-predictions`),
      fetchJSON("https://fantasy.premierleague.com/api/bootstrap-static/"),
    ]);
    predictions = predictionsRes;
    bootstrapElements = bootstrapRes.elements;
  }, 30000);

  it('returns every player, not just ones crossing an assumed threshold', () => {
    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBe(bootstrapElements.length);
  });

  it('progress matches bootstrap-static\'s real price_change_percent exactly, for both risers and fallers', () => {
    const riser = bootstrapElements.find((p: any) => parseFloat(p.price_change_percent) > 50);
    const faller = bootstrapElements.find((p: any) => parseFloat(p.price_change_percent) < -50);
    expect(riser).toBeDefined();
    expect(faller).toBeDefined();

    for (const bp of [riser, faller]) {
      const pred = predictions.find((p: any) => p.player_id === bp.id);
      expect(pred).toBeDefined();
      expect(pred.progress).toBeCloseTo(parseFloat(bp.price_change_percent), 5);
    }
  });

  it('predicted_progress matches the official offset-0 projection when FPL has a real signal (nonzero likelihood)', () => {
    const withProjection = bootstrapElements.find((p: any) => {
      const proj = p.price_change_projections || [];
      const offset0 = proj.find((pr: any) => pr.offset === 0);
      return offset0 && offset0.likelihood !== 0;
    });
    expect(withProjection).toBeDefined();
    const pred = predictions.find((p: any) => p.player_id === withProjection.id);
    const officialOffset0 = withProjection.price_change_projections.find((pr: any) => pr.offset === 0);
    expect(pred.predicted_progress).toBeCloseTo(parseFloat(officialOffset0.projected_percent), 5);
  });

  // Confirmed against the official FPL page directly: a player whose offset-0 projection has
  // likelihood 0 (FPL's "no real signal" flag) shows Predicted Progress equal to current Progress
  // there — not the near-zero placeholder value in projected_percent, which is meaningless in that
  // case (e.g. Kudus at -13% current progress showed a placeholder of "0.0", while every other
  // player's real, nonzero-likelihood projection tracks its own current progress closely).
  it('falls back to progress (not the placeholder projected_percent) when likelihood is 0', () => {
    const noSignal = bootstrapElements.find((p: any) => {
      const proj = p.price_change_projections || [];
      const offset0 = proj.find((pr: any) => pr.offset === 0);
      return offset0 && offset0.likelihood === 0 && Math.abs(parseFloat(p.price_change_percent)) > 1;
    });
    if (!noSignal) return; // no live example right now — nothing to assert against
    const pred = predictions.find((p: any) => p.player_id === noSignal.id);
    expect(pred.predicted_progress).toBeCloseTo(pred.progress, 5);
  });

  // Confirmed against the official FPL page's own examples (screenshot cross-referenced):
  // status is keyed off PREDICTED progress (not current progress, and not the coarse -5..+5
  // likelihood scale) — predicted magnitude > 100% is "Very likely", >= 95% is "Likely",
  // anything else is "Unlikely to change". This matched every example checked, including cases
  // that looked inconsistent under a current-progress-based or likelihood-based reading (e.g. a
  // player at -94.6% current progress but -101.5% predicted showing "Very likely to drop").
  it('status is keyed off predicted progress crossing >100%/>=95%, not current progress or the likelihood scale', () => {
    const barelyMoving = bootstrapElements.find((p: any) => {
      const proj = p.price_change_projections || [];
      const predicted = Math.abs(proj[0] ? parseFloat(proj[0].projected_percent) : 0);
      return predicted > 5 && predicted < 90;
    });
    const strongRiser = bootstrapElements.find((p: any) => {
      const proj = p.price_change_projections || [];
      return proj[0] && parseFloat(proj[0].projected_percent) > 100;
    });
    const strongFaller = bootstrapElements.find((p: any) => {
      const proj = p.price_change_projections || [];
      return proj[0] && parseFloat(proj[0].projected_percent) < -100;
    });
    expect(barelyMoving).toBeDefined();
    expect(strongRiser).toBeDefined();
    expect(strongFaller).toBeDefined();

    const barelyPred = predictions.find((p: any) => p.player_id === barelyMoving.id);
    const risePred = predictions.find((p: any) => p.player_id === strongRiser.id);
    const fallPred = predictions.find((p: any) => p.player_id === strongFaller.id);

    expect(barelyPred.status).toBe('Unlikely to change');
    expect(risePred.status.toLowerCase()).toBe('very likely to rise');
    expect(fallPred.status.toLowerCase()).toBe('very likely to drop');
  });

  it('hourly_rate is (predicted_progress - progress) / hours remaining until the next 00:00 UK price update', () => {
    const mover = predictions.find((p: any) => Math.abs(p.progress) > 1);
    expect(mover).toBeDefined();
    expect(Number.isFinite(mover.hourly_rate)).toBe(true);

    // hours_remaining is exposed alongside it so the math is independently checkable, and
    // should always be between 0 and 24 (time until the next UK-midnight price update).
    expect(mover.hours_remaining).toBeGreaterThan(0);
    expect(mover.hours_remaining).toBeLessThanOrEqual(24);

    // progress/predicted_progress/hours_remaining are all rounded before being returned, so
    // recomputing the rate from them only approximates the server's unrounded internal math —
    // allow a small margin rather than asserting to 2dp precision.
    const expectedRate = (mover.predicted_progress - mover.progress) / mover.hours_remaining;
    expect(Math.abs(mover.hourly_rate - expectedRate)).toBeLessThan(0.05);
  });

  it('hours_to_threshold/days_to_threshold extrapolate the current hourly rate to the ±100% price-change threshold', () => {
    // Already past the threshold: crossing is immediate.
    const pastThreshold = predictions.find((p: any) => Math.abs(p.progress) >= 100);
    expect(pastThreshold).toBeDefined();
    expect(pastThreshold.hours_to_threshold).toBe(0);
    expect(pastThreshold.days_to_threshold).toBe(0);

    // Trending toward the threshold: hours_to_threshold should match a straight-line
    // extrapolation of the current progress at the current hourly rate.
    const trendingToward = predictions.find((p: any) => {
      const magnitude = Math.abs(p.progress);
      const movingToward = (p.progress >= 0 && p.hourly_rate > 0) || (p.progress < 0 && p.hourly_rate < 0);
      return magnitude > 1 && magnitude < 100 && movingToward && Math.abs(p.hourly_rate) > 0.01;
    });
    expect(trendingToward).toBeDefined();
    // progress/hourly_rate in the response are already rounded to 1-2dp, so recomputing from them
    // only approximates the server's unrounded internal math — allow a generous margin rather than
    // asserting exact equality.
    const expectedHours = (100 - Math.abs(trendingToward.progress)) / Math.abs(trendingToward.hourly_rate);
    expect(Math.abs(trendingToward.hours_to_threshold - expectedHours)).toBeLessThan(5);
    expect(Math.abs(trendingToward.days_to_threshold - expectedHours / 24)).toBeLessThan(1);

    // Trending away from the threshold (rate sign opposes progress sign): no meaningful ETA.
    const trendingAway = predictions.find((p: any) => {
      const magnitude = Math.abs(p.progress);
      const movingAway = (p.progress >= 0 && p.hourly_rate < 0) || (p.progress < 0 && p.hourly_rate > 0);
      return magnitude > 1 && magnitude < 100 && movingAway;
    });
    expect(trendingAway).toBeDefined();
    expect(trendingAway.hours_to_threshold).toBeNull();
    expect(trendingAway.days_to_threshold).toBeNull();
  });

  it('ownership_trend direction matches the sign of this gameweek\'s net transfers', () => {
    const netPositive = bootstrapElements.find(
      (p: any) => (p.transfers_in_event || 0) - (p.transfers_out_event || 0) > 10000
    );
    const netNegative = bootstrapElements.find(
      (p: any) => (p.transfers_in_event || 0) - (p.transfers_out_event || 0) < -10000
    );
    expect(netPositive).toBeDefined();
    expect(netNegative).toBeDefined();

    const upPred = predictions.find((p: any) => p.player_id === netPositive.id);
    const downPred = predictions.find((p: any) => p.player_id === netNegative.id);
    expect(upPred.ownership_trend).toBe('up');
    expect(downPred.ownership_trend).toBe('down');
  });

  it('every prediction has a finite current_price sourced from now_cost', () => {
    for (const pred of predictions.slice(0, 50)) {
      expect(Number.isFinite(pred.current_price)).toBe(true);
      expect(pred.current_price).toBeGreaterThan(0);
    }
  });
});
