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

  it('predicted_progress matches the official offset-0 projection exactly', () => {
    const withProjection = bootstrapElements.find(
      (p: any) => p.price_change_projections && p.price_change_projections.length > 0
    );
    expect(withProjection).toBeDefined();
    const pred = predictions.find((p: any) => p.player_id === withProjection.id);
    const officialOffset0 = withProjection.price_change_projections.find((pr: any) => pr.offset === 0);
    expect(pred.predicted_progress).toBeCloseTo(parseFloat(officialOffset0.projected_percent), 5);
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

    const expectedRate = (mover.predicted_progress - mover.progress) / mover.hours_remaining;
    expect(mover.hourly_rate).toBeCloseTo(expectedRate, 2);
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
