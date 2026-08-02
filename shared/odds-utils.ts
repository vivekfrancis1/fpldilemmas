// Pure helpers for turning The Odds API's raw bookmaker prices into de-vigged, cross-bookmaker
// consensus probabilities. No network or DB access here — see server/odds-service.ts for that.

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: string; // 'h2h' | 'totals' | ...
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

export interface AggregatedFixtureOdds {
  bookmakerCount: number;
  homeWinProb: number | null;
  drawProb: number | null;
  awayWinProb: number | null;
  over25Prob: number | null;
  under25Prob: number | null;
}

const TOTALS_LINE = 2.5;

/**
 * Proportional de-vig: converts decimal odds to implied probabilities (1/price), then
 * normalizes so they sum to 1, removing the bookmaker's overround/margin.
 */
export function devigOutcomes(decimalOdds: number[]): number[] {
  if (decimalOdds.length === 0) return [];
  const implied = decimalOdds.map((price) => 1 / price);
  const overround = implied.reduce((sum, p) => sum + p, 0);
  return implied.map((p) => p / overround);
}

function devigH2H(bookmaker: OddsApiBookmaker, homeTeam: string, awayTeam: string): { home: number; draw: number; away: number } | null {
  const market = bookmaker.markets.find((m) => m.key === 'h2h');
  if (!market) return null;

  const homeOutcome = market.outcomes.find((o) => o.name === homeTeam);
  const drawOutcome = market.outcomes.find((o) => o.name === 'Draw');
  const awayOutcome = market.outcomes.find((o) => o.name === awayTeam);
  if (!homeOutcome || !drawOutcome || !awayOutcome) return null;

  const [home, draw, away] = devigOutcomes([homeOutcome.price, drawOutcome.price, awayOutcome.price]);
  return { home, draw, away };
}

function devigTotals(bookmaker: OddsApiBookmaker): { over: number; under: number } | null {
  const market = bookmaker.markets.find((m) => m.key === 'totals');
  if (!market) return null;

  const overOutcome = market.outcomes.find((o) => o.name === 'Over' && o.point === TOTALS_LINE);
  const underOutcome = market.outcomes.find((o) => o.name === 'Under' && o.point === TOTALS_LINE);
  if (!overOutcome || !underOutcome) return null;

  const [over, under] = devigOutcomes([overOutcome.price, underOutcome.price]);
  return { over, under };
}

const average = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Aggregates one event's per-bookmaker prices into a single consensus, de-vigged probability
 * per outcome — averaging across every bookmaker that quotes that market.
 */
export function aggregateEventOdds(event: OddsApiEvent): AggregatedFixtureOdds {
  const h2hResults = event.bookmakers
    .map((b) => devigH2H(b, event.home_team, event.away_team))
    .filter((r): r is { home: number; draw: number; away: number } => r !== null);

  const totalsResults = event.bookmakers
    .map((b) => devigTotals(b))
    .filter((r): r is { over: number; under: number } => r !== null);

  return {
    bookmakerCount: h2hResults.length,
    homeWinProb: average(h2hResults.map((r) => r.home)),
    drawProb: average(h2hResults.map((r) => r.draw)),
    awayWinProb: average(h2hResults.map((r) => r.away)),
    over25Prob: average(totalsResults.map((r) => r.over)),
    under25Prob: average(totalsResults.map((r) => r.under)),
  };
}
