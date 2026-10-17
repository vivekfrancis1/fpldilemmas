// Team-strength model for expected goals in a fixture, used when no betting odds exist for it
// (the 'model' source). Replaces the old average of own-attack and opponent-defence, which never
// looked at the opponent's attack or the team's own defence.
//
// Each team gets one rating: expected goals for minus expected goals against, per game (xG, which
// the odds history showed predicts the market far better than raw goals — goals-only was the
// worst of every blend tested). A fixture's expected goals are then
//     (league average goals per team + weight x (rating - opponent rating)) x venue multiplier
// The rating gap is a goal difference, so each side takes half of it: the two sides' numbers average
// back to the league average. The weight is scaled up with games played, because a gap built from
// 1-2 games is mostly noise.
//
// STRENGTH_MAX_WEIGHT / STRENGTH_HALF_GAMES were fitted on 88 team-fixtures of stored match odds
// (GW2-GW8 of 2026/27; average error against the odds' implied goals 0.341 vs 0.416 for the old
// formula, leave-one-out 0.350). To be refitted after a few more gameweeks of odds have accumulated
// — see .local/known-issues.md.
export const STRENGTH_MAX_WEIGHT = 0.5;
export const STRENGTH_HALF_GAMES = 2.5;

export function strengthWeight(games: number): number {
  if (!(games > 0)) return 0;
  return (STRENGTH_MAX_WEIGHT * games) / (games + STRENGTH_HALF_GAMES);
}

export interface StandingsLike {
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  expectedGoalsFor?: number | null;
  expectedGoalsAgainst?: number | null;
}

// Per-game goal-difference rating: xG for minus xG against, or real goal difference when the
// standings carry no xG. null when the team has no games.
export function teamStrengthRating(team: StandingsLike): number | null {
  if (!(team.played > 0)) return null;
  const hasXg = typeof team.expectedGoalsFor === "number" && typeof team.expectedGoalsAgainst === "number";
  const diff = hasXg
    ? (team.expectedGoalsFor as number) - (team.expectedGoalsAgainst as number)
    : team.goalsFor - team.goalsAgainst;
  return diff / team.played;
}

export function expectedGoalsFromStrength(args: {
  rating: number;
  oppRating: number;
  games: number; // the smaller of the two teams' games played
  leagueAvg: number; // goals per team per game across the league
  venueMultiplier: number;
}): number {
  const { rating, oppRating, games, leagueAvg, venueMultiplier } = args;
  return Math.max(0, (leagueAvg + strengthWeight(games) * (rating - oppRating)) * venueMultiplier);
}
