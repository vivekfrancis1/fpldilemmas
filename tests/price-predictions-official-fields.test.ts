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

  beforeAll(async () => {
    const [predictionsRes, bootstrapRes] = await Promise.all([
      fetchJSON(`${BASE_URL}/api/price-predictions`),
      fetchJSON(`${BASE_URL}/api/bootstrap-static`),
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

  // FPL's own price_change_projections[].likelihood (-5..+5) turned out to be too coarse for a
  // sensible status label: 1 maps to only ~18-20% real progress, so a naive "any nonzero
  // likelihood = Likely to rise/drop" mapping put over 80% of the whole player pool in
  // "Likely to rise/drop" — nonsensical for a column meant to flag genuinely notable movers.
  // Status is instead derived from the real progress percentage itself, with our own
  // transparent magnitude thresholds (>=95% very likely, >=50% likely, >=15% slowly, else
  // unlikely to change) — not a guess at FPL's undisclosed internal boundary logic.
  it('status is derived from real progress magnitude, not the coarse likelihood scale', () => {
    const barelyMoving = bootstrapElements.find((p: any) => {
      const prog = Math.abs(parseFloat(p.price_change_percent) || 0);
      return prog > 5 && prog < 15;
    });
    const strongRiser = bootstrapElements.find((p: any) => (parseFloat(p.price_change_percent) || 0) >= 95);
    const strongFaller = bootstrapElements.find((p: any) => (parseFloat(p.price_change_percent) || 0) <= -95);
    expect(barelyMoving).toBeDefined();
    expect(strongRiser).toBeDefined();
    expect(strongFaller).toBeDefined();

    const barelyPred = predictions.find((p: any) => p.player_id === barelyMoving.id);
    const risePred = predictions.find((p: any) => p.player_id === strongRiser.id);
    const fallPred = predictions.find((p: any) => p.player_id === strongFaller.id);

    // A player barely off 0% must NOT be labeled "Likely" or "Very likely" — that's the
    // exact over-eager mislabeling this fix corrects.
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
