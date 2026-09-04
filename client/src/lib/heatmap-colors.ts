// Shared 5-tier heatmap palette used across Team/Player Projection tables: darker green (best)
// -> green -> neutral -> red -> darker red (worst). Kept to light 50/100-shade Tailwind tokens
// throughout so no single tier looks jarring next to the others.
export const HEATMAP_TIERS = [
  "bg-green-100 text-green-800 font-semibold", // 0: darker green — best
  "bg-green-50 text-green-700",                // 1: green
  "bg-slate-50 text-slate-600",                // 2: neutral
  "bg-red-50 text-red-700",                    // 3: red
  "bg-red-100 text-red-800 font-semibold",     // 4: darker red — worst
] as const;

/**
 * Buckets `value` into one of the 5 heatmap tiers using 4 ascending cutoffs and returns the
 * matching Tailwind classes. `cutoffs` must be ascending [c1, c2, c3, c4]; by default a value
 * >= c4 is "best" (darker green) and a value < c1 is "worst" (darker red). Pass `invert: true`
 * for metrics where a LOWER value is better (e.g. goals conceded, cards) to flip that mapping.
 */
export function getHeatmapColor(
  value: number,
  cutoffs: readonly [number, number, number, number],
  invert = false,
): string {
  const [c1, c2, c3, c4] = cutoffs;
  let tier: number;
  if (!invert) {
    // Higher is better: value >= c4 is the top (darker green) tier.
    if (value >= c4) tier = 0;
    else if (value >= c3) tier = 1;
    else if (value >= c2) tier = 2;
    else if (value >= c1) tier = 3;
    else tier = 4;
  } else {
    // Lower is better: value <= c1 is the top (darker green) tier.
    if (value <= c1) tier = 0;
    else if (value <= c2) tier = 1;
    else if (value <= c3) tier = 2;
    else if (value <= c4) tier = 3;
    else tier = 4;
  }
  return HEATMAP_TIERS[tier];
}

/**
 * FPL's Fixture Difficulty Rating is already a discrete 1-5 scale (1 = easiest, 5 = hardest),
 * so it maps directly onto the 5 heatmap tiers without needing cutoffs.
 */
export function getFixtureDifficultyColor(difficulty: number): string {
  const tier = Math.min(4, Math.max(0, Math.round(difficulty) - 1));
  return HEATMAP_TIERS[tier];
}

export function meanAndStdDev(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Colors `value` relative to the rest of a small population (e.g. the ~20 Premier League teams)
 * by how many standard deviations it sits from that population's own mean, instead of fixed
 * absolute cutoffs. Under a roughly normal distribution this naturally produces a bell curve of
 * tiers: most teams land in the neutral middle, fewer in green/red, and only the real outliers
 * reach the darker green/red extremes — rather than the whole set clustering into one or two
 * tiers just because the underlying numbers happen to run high or low that gameweek.
 *
 * Pass `invert: true` for metrics where a LOWER value is better (e.g. goals conceded).
 */
export function getBellCurveColor(
  value: number,
  values: number[],
  invert = false,
): string {
  const { mean, stdDev } = meanAndStdDev(values);
  if (stdDev === 0) return HEATMAP_TIERS[2];
  const z = (value - mean) / stdDev;
  // ~38% of a normal distribution falls within ±0.5 SD (neutral), ~24% in each of the next
  // bands out to ±1.5 SD (green/red), leaving ~7% in each tail (darker green/red).
  let tier: number;
  if (z >= 1.5) tier = 0;
  else if (z >= 0.5) tier = 1;
  else if (z >= -0.5) tier = 2;
  else if (z >= -1.5) tier = 3;
  else tier = 4;
  return HEATMAP_TIERS[invert ? 4 - tier : tier];
}
