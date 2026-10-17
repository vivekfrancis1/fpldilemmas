// Team-strength model for expected goals in a fixture, used when no betting odds exist for it
// (the 'model' source). Replaces the old average of own-attack and opponent-defence, which never
// looked at the opponent's attack or the team's own defence.
//
// Each team gets one rating: an equal blend of its goal difference and its xG difference per game
// (STRENGTH_XG_SHARE). A fixture's expected goals are then
//     (league average goals per team + weight x (rating - opponent rating)) x venue multiplier
// The rating gap is a goal difference, so the two sides' numbers average back to the league average
// at the same gap. The weight is scaled up with games played, because a gap built from 1-2 games is
// mostly noise.
//
// Fit notes (88 team-fixtures of stored match odds, GW2-GW8 of 2026/27, venue 1.07/0.93): a pure-xG
// rating fitted the odds best (average error 0.319, max weight 0.55, half-games 4.0) and the 50/50
// blend slightly worse (0.330, 0.40 and 3.0). The 50/50 blend was chosen deliberately by the owner so
// that a team persistently under-scoring its xG (e.g. Forest, GW7) is not rated purely on chances
// created. To be refitted after a few more gameweeks of odds — see .local/known-issues.md.
export const STRENGTH_XG_SHARE = 0.5;
export const STRENGTH_MAX_WEIGHT = 0.4;
export const STRENGTH_HALF_GAMES = 3.0;

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

// Per-game rating: STRENGTH_XG_SHARE x xG difference + (1 - share) x real goal difference, or just
// the real goal difference when the standings carry no xG. null when the team has no games.
export function teamStrengthRating(team: StandingsLike): number | null {
  if (!(team.played > 0)) return null;
  const goalDiff = (team.goalsFor - team.goalsAgainst) / team.played;
  const hasXg = typeof team.expectedGoalsFor === "number" && typeof team.expectedGoalsAgainst === "number";
  if (!hasXg) return goalDiff;
  const xgDiff = ((team.expectedGoalsFor as number) - (team.expectedGoalsAgainst as number)) / team.played;
  return STRENGTH_XG_SHARE * xgDiff + (1 - STRENGTH_XG_SHARE) * goalDiff;
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
