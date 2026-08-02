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

// ─────────────────────────────────────────────────────────────────────────────
// Match odds → per-team expected goals. The odds we store are match-level (home/draw/away win,
// over 2.5 goals), but projections need a per-team expected-goals number. Standard technique:
// model each team's goals as independent Poisson(lambdaHome)/Poisson(lambdaAway), then search
// for the (lambdaHome, lambdaAway) pair whose implied match probabilities best match the
// observed consensus odds.
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchProbabilities {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over25Prob: number;
}

const MAX_GOALS = 15; // Poisson tail beyond this is negligible for realistic football lambdas

function poissonPmf(k: number, lambda: number): number {
  // e^-lambda * lambda^k / k!, computed iteratively to avoid overflow from lambda^k or k!
  let pmf = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    pmf *= lambda / i;
  }
  return pmf;
}

/**
 * Forward model: given independent Poisson expected goals for each side, compute the implied
 * match outcome and over-2.5 probabilities.
 */
export function computeMatchProbabilities(lambdaHome: number, lambdaAway: number): MatchProbabilities {
  const homeProbs = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(k, lambdaHome));
  const awayProbs = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(k, lambdaAway));

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  let under25Prob = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = homeProbs[h] * awayProbs[a];
      if (h > a) homeWinProb += p;
      else if (h === a) drawProb += p;
      else awayWinProb += p;
      if (h + a <= 2) under25Prob += p;
    }
  }

  return { homeWinProb, drawProb, awayWinProb, over25Prob: 1 - under25Prob };
}

function probabilityError(target: MatchProbabilities, candidate: MatchProbabilities): number {
  return (
    (target.homeWinProb - candidate.homeWinProb) ** 2 +
    (target.drawProb - candidate.drawProb) ** 2 +
    (target.awayWinProb - candidate.awayWinProb) ** 2 +
    (target.over25Prob - candidate.over25Prob) ** 2
  );
}

const LAMBDA_MIN = 0.1;
const LAMBDA_MAX = 4.5;

function gridSearch(target: MatchProbabilities, center: { home: number; away: number } | null, radius: number, step: number) {
  const homeLo = center ? Math.max(LAMBDA_MIN, center.home - radius) : LAMBDA_MIN;
  const homeHi = center ? Math.min(LAMBDA_MAX, center.home + radius) : LAMBDA_MAX;
  const awayLo = center ? Math.max(LAMBDA_MIN, center.away - radius) : LAMBDA_MIN;
  const awayHi = center ? Math.min(LAMBDA_MAX, center.away + radius) : LAMBDA_MAX;

  let best = { home: homeLo, away: awayLo };
  let bestError = Infinity;

  for (let home = homeLo; home <= homeHi; home += step) {
    for (let away = awayLo; away <= awayHi; away += step) {
      const error = probabilityError(target, computeMatchProbabilities(home, away));
      if (error < bestError) {
        bestError = error;
        best = { home, away };
      }
    }
  }

  return best;
}

/**
 * Inverse solve: given observed (de-vigged, consensus) match odds, find the (lambdaHome,
 * lambdaAway) pair that best reproduces them under the independent-Poisson model above.
 * Two-pass grid search (coarse, then refine around the coarse best) — fast enough to run
 * per-fixture on demand, deterministic, no external optimization library needed.
 */
export function solveExpectedGoalsFromOdds(
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number,
  over25Prob: number
): { lambdaHome: number; lambdaAway: number } | null {
  if ([homeWinProb, drawProb, awayWinProb, over25Prob].some((p) => p === null || p === undefined || Number.isNaN(p))) {
    return null;
  }

  const target: MatchProbabilities = { homeWinProb, drawProb, awayWinProb, over25Prob };

  const coarse = gridSearch(target, null, 0, 0.1);
  const refined = gridSearch(target, coarse, 0.15, 0.01);

  return { lambdaHome: refined.home, lambdaAway: refined.away };
}
