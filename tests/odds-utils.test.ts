import { describe, it, expect } from 'vitest';
import { devigOutcomes, aggregateEventOdds, type OddsApiEvent } from '../shared/odds-utils';

describe('devigOutcomes', () => {
  it('leaves already-fair (no-margin) two-way odds unchanged', () => {
    const result = devigOutcomes([2.0, 2.0]);
    expect(result[0]).toBeCloseTo(0.5, 4);
    expect(result[1]).toBeCloseTo(0.5, 4);
  });

  it('removes bookmaker margin from symmetric two-way odds', () => {
    // 1/1.9 + 1/1.9 = 1.0526... overround — normalizing should restore 0.5/0.5
    const result = devigOutcomes([1.9, 1.9]);
    expect(result[0]).toBeCloseTo(0.5, 4);
    expect(result[1]).toBeCloseTo(0.5, 4);
  });

  it('removes bookmaker margin from three-way (h2h) odds', () => {
    const result = devigOutcomes([2.0, 3.5, 4.0]);
    expect(result[0]).toBeCloseTo(0.482759, 4);
    expect(result[1]).toBeCloseTo(0.275862, 4);
    expect(result[2]).toBeCloseTo(0.241379, 4);
  });

  it('always sums to 1 regardless of input margin', () => {
    for (const odds of [[2.0, 2.0], [1.9, 1.9], [2.0, 3.5, 4.0], [1.5, 4.0, 6.5]]) {
      const result = devigOutcomes(odds);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('returns an empty array for empty input', () => {
    expect(devigOutcomes([])).toEqual([]);
  });
});

describe('aggregateEventOdds', () => {
  const baseEvent = (bookmakers: OddsApiEvent['bookmakers']): OddsApiEvent => ({
    id: 'evt1',
    sport_key: 'soccer_epl',
    commence_time: '2026-08-22T14:00:00Z',
    home_team: 'Arsenal',
    away_team: 'Coventry City',
    bookmakers,
  });

  it('averages de-vigged h2h probabilities across bookmakers', () => {
    const event = baseEvent([
      {
        key: 'bookmakerA', title: 'A',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Arsenal', price: 2.0 },
          { name: 'Draw', price: 3.5 },
          { name: 'Coventry City', price: 4.0 },
        ] }],
      },
      {
        key: 'bookmakerB', title: 'B',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Arsenal', price: 1.9 },
          { name: 'Draw', price: 3.6 },
          { name: 'Coventry City', price: 4.2 },
        ] }],
      },
    ]);

    const result = aggregateEventOdds(event);
    expect(result.bookmakerCount).toBe(2);
    expect(result.homeWinProb).toBeCloseTo(0.493896, 3);
    expect(result.drawProb).toBeCloseTo(0.271188, 3);
    expect(result.awayWinProb).toBeCloseTo(0.234916, 3);
    // Consensus probabilities should still sum to ~1
    expect(result.homeWinProb! + result.drawProb! + result.awayWinProb!).toBeCloseTo(1, 3);
  });

  it('averages de-vigged totals(2.5) probabilities, ignoring bookmakers without that market', () => {
    const event = baseEvent([
      {
        key: 'bookmakerA', title: 'A',
        markets: [
          { key: 'h2h', outcomes: [
            { name: 'Arsenal', price: 2.0 },
            { name: 'Draw', price: 3.5 },
            { name: 'Coventry City', price: 4.0 },
          ] },
          { key: 'totals', outcomes: [
            { name: 'Over', price: 1.9, point: 2.5 },
            { name: 'Under', price: 1.95, point: 2.5 },
          ] },
        ],
      },
      {
        // No totals market at all for this bookmaker
        key: 'bookmakerB', title: 'B',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Arsenal', price: 1.9 },
          { name: 'Draw', price: 3.6 },
          { name: 'Coventry City', price: 4.2 },
        ] }],
      },
    ]);

    const result = aggregateEventOdds(event);
    expect(result.bookmakerCount).toBe(2);
    expect(result.over25Prob).toBeCloseTo(0.506564, 3);
    expect(result.under25Prob).toBeCloseTo(0.493436, 3);
    expect(result.over25Prob! + result.under25Prob!).toBeCloseTo(1, 3);
  });

  it('ignores a totals line that is not the 2.5 goals market', () => {
    const event = baseEvent([
      {
        key: 'bookmakerA', title: 'A',
        markets: [
          { key: 'h2h', outcomes: [
            { name: 'Arsenal', price: 2.0 },
            { name: 'Draw', price: 3.5 },
            { name: 'Coventry City', price: 4.0 },
          ] },
          { key: 'totals', outcomes: [
            { name: 'Over', price: 1.8, point: 3.5 },
            { name: 'Under', price: 2.0, point: 3.5 },
          ] },
        ],
      },
    ]);

    const result = aggregateEventOdds(event);
    expect(result.over25Prob).toBeNull();
    expect(result.under25Prob).toBeNull();
  });

  it('returns nulls and zero bookmakerCount for an event with no bookmakers', () => {
    const event = baseEvent([]);
    const result = aggregateEventOdds(event);
    expect(result.bookmakerCount).toBe(0);
    expect(result.homeWinProb).toBeNull();
    expect(result.drawProb).toBeNull();
    expect(result.awayWinProb).toBeNull();
    expect(result.over25Prob).toBeNull();
    expect(result.under25Prob).toBeNull();
  });

  it('skips a bookmaker whose h2h outcome names do not match the event teams', () => {
    const event = baseEvent([
      {
        key: 'bookmakerBad', title: 'Bad',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Some Other Team', price: 2.0 },
          { name: 'Draw', price: 3.5 },
          { name: 'Yet Another Team', price: 4.0 },
        ] }],
      },
    ]);

    const result = aggregateEventOdds(event);
    expect(result.bookmakerCount).toBe(0);
    expect(result.homeWinProb).toBeNull();
  });
});
