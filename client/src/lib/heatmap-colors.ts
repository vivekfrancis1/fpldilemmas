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
