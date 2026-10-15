// Applies the official-FPL-status availability adjustment to ONE aggregated player projection.
// Single implementation shared by the live aggregator (/api/player-total-points) and the cache-hit
// path of /api/cached/player-total-points — the two used to carry separate copies that drifted
// apart (the cache-hit copy kept a stale total for players whose gameweeks were zeroed).
import { calculateAvailabilityProbability, BootstrapEvent } from "./availability-adjustments";

const ADJUSTED_COMPONENT_KEYS = [
  "pointsFromGoals", "pointsFromAssists", "pointsFromCleanSheets",
  "pointsFromMinutes", "pointsFromBonus", "pointsFromSaves",
  "pointsFromGoalsConceded", "pointsFromYellowCards", "pointsFromRedCards",
  "pointsFromDefensiveContributions",
];

export interface AvailabilityContext {
  currentGameweek: number;
  events: BootstrapEvent[];
}

const round2 = (v: number) => Math.round(v * 100) / 100;

// Recomputes the figures that must follow the (possibly zeroed) per-gameweek projections:
// total, average over gameweeks that have points, and points per £m.
function withDerivedTotals(player: any, gameweekProjections: { [gw: string]: number }) {
  const values = Object.values(gameweekProjections) as number[];
  const total = values.reduce((s, v) => s + v, 0);
  const scoringGameweeks = values.filter((v) => v > 0).length || 1;
  const price = player.price || 0;
  return {
    totalExpectedPoints: round2(total),
    averagePerGameweek: round2(total / scoringGameweeks),
    averageValue: price > 0 ? round2(total / price) : 0,
  };
}

// Returns a NEW player object (the input is never mutated):
//  - gameweekProjections zeroed for gameweeks the player is certain to miss (injured/suspended/left),
//  - component breakdowns "unscaled" back to full-health values so adjusted and raw responses carry
//    the same per-component numbers,
//  - totalExpectedPoints / averagePerGameweek / averageValue recomputed from the adjusted gameweeks,
//  - availabilityAdjustments explaining each change, and originalGameweekProjections for zeroed ones.
export function adjustPlayerForAvailability(
  player: any,
  bsPlayer: { chance_of_playing_next_round: number | null; status: string; news: string } | undefined,
  ctx: AvailabilityContext,
  opts: { stripGW39?: boolean } = {}
): any {
  const gwProj: { [gw: string]: number } = { ...player.gameweekProjections };
  if (opts.stripGW39) delete gwProj["39"];

  if (!bsPlayer) {
    return opts.stripGW39
      ? { ...player, gameweekProjections: gwProj, ...withDerivedTotals(player, gwProj), availabilityAdjustments: {} }
      : { ...player, availabilityAdjustments: {} };
  }

  const chanceNextRound = bsPlayer.chance_of_playing_next_round;
  const status = bsPlayer.status || "a";
  const nextGW = ctx.currentGameweek + 1;
  const availAdj: { [gw: string]: { original: number; adjusted: number; reason: string } } = {};
  const origGWProj: { [gw: string]: number } = {};
  const sortedGWNums = Object.keys(gwProj).map(Number).sort((a, b) => a - b);

  const gwProb: { [gw: number]: number } = {};
  for (const gwNum of sortedGWNums) {
    gwProb[gwNum] = calculateAvailabilityProbability(bsPlayer, gwNum, ctx.currentGameweek, ctx.events);
  }

  // Unscale component breakdowns. Pass 1: gameweeks with probability > 0.
  const unscaled: { [key: string]: { [gw: number]: number } } = {};
  for (const gwNum of sortedGWNums) {
    const p = gwProb[gwNum];
    if (p > 0) {
      const sf = p < 1.0 ? 1 / p : 1.0;
      for (const key of ADJUSTED_COMPONENT_KEYS) {
        if (!unscaled[key]) unscaled[key] = {};
        unscaled[key][gwNum] = round2((player[key]?.[gwNum.toString()] || 0) * sf);
      }
    }
  }
  // Pass 2: probability 0 gameweeks — estimate from the nearest future non-zero-probability gameweek.
  for (const gwNum of sortedGWNums) {
    if (gwProb[gwNum] > 0) continue;
    const refGW = sortedGWNums.find((g) => g > gwNum && unscaled[ADJUSTED_COMPONENT_KEYS[0]]?.[g] !== undefined)
      ?? sortedGWNums.find((g) => unscaled[ADJUSTED_COMPONENT_KEYS[0]]?.[g] !== undefined);
    for (const key of ADJUSTED_COMPONENT_KEYS) {
      if (!unscaled[key]) unscaled[key] = {};
      unscaled[key][gwNum] = refGW !== undefined ? (unscaled[key]?.[refGW] ?? 0) : 0;
    }
  }
  const unscaledComponents: { [key: string]: { [gw: string]: number } } = {};
  for (const key of ADJUSTED_COMPONENT_KEYS) {
    if (!player[key]) continue;
    unscaledComponents[key] = { ...player[key] };
    for (const gwNum of sortedGWNums) {
      if (unscaled[key]?.[gwNum] !== undefined) unscaledComponents[key][gwNum.toString()] = unscaled[key][gwNum];
    }
  }
  // Rolled-up totalPoints* fields must match the unscaled per-gameweek breakdowns.
  const unscaledTotals: { [key: string]: number } = {};
  for (const key of Object.keys(unscaledComponents)) {
    const totalKey = "total" + key.charAt(0).toUpperCase() + key.slice(1);
    unscaledTotals[totalKey] = Math.round(
      Object.values(unscaledComponents[key]).reduce((sum: number, v: number) => sum + (v ?? 0), 0) * 100
    ) / 100;
  }

  for (const gwKey of Object.keys(gwProj)) {
    const gw = parseInt(gwKey);
    const prob = gwProb[gw] ?? 1.0;
    if (prob >= 1.0) continue;
    const rawVal = gwProj[gwKey] ?? 0;
    if (prob === 0) {
      origGWProj[gwKey] = rawVal;
      gwProj[gwKey] = 0;
      const reason = status === "s" ? "Suspended" : status === "i" ? "Injured" : "Unavailable";
      availAdj[gwKey] = { original: rawVal, adjusted: 0, reason };
    } else if (rawVal > 0) {
      const original = round2(rawVal / prob);
      const reason = gw === nextGW && (chanceNextRound === 25 || chanceNextRound === 50 || chanceNextRound === 75)
        ? `${chanceNextRound}% chance of playing`
        : `Returning from injury – ${Math.round(prob * 100)}% availability`;
      availAdj[gwKey] = { original, adjusted: round2(rawVal), reason };
    }
  }

  const out: any = {
    ...player,
    ...unscaledComponents,
    ...unscaledTotals,
    gameweekProjections: gwProj,
    ...withDerivedTotals(player, gwProj),
    availabilityAdjustments: availAdj,
  };
  if (Object.keys(origGWProj).length > 0) out.originalGameweekProjections = origGWProj;
  return out;
}
