// Maps The Odds API's full team names (soccer_epl feed) to FPL team ids from
// PREMIER_LEAGUE_TEAMS. Every name below was observed live from the API, not guessed — several
// FPL short display names ("Man Utd", "Spurs", "Brighton", "Newcastle", "Nott'm Forest", "Leeds",
// "Man City") don't match the Odds API's full names ("Manchester United", "Tottenham Hotspur",
// "Brighton and Hove Albion", "Newcastle United", "Nottingham Forest", "Leeds United",
// "Manchester City"), so this can't be derived from PREMIER_LEAGUE_TEAMS.name alone.
// This list needs a new entry whenever a team is promoted into the league.
const ODDS_API_NAME_TO_FPL_ID: Record<string, number> = {
  'Arsenal': 1,
  'Aston Villa': 2,
  'Bournemouth': 3,
  'Brentford': 4,
  'Brighton and Hove Albion': 5,
  'Chelsea': 6,
  'Coventry City': 7,
  'Crystal Palace': 8,
  'Everton': 9,
  'Fulham': 10,
  'Hull City': 11,
  'Ipswich Town': 12,
  'Leeds United': 13,
  'Liverpool': 14,
  'Manchester City': 15,
  'Manchester United': 16,
  'Newcastle United': 17,
  'Nottingham Forest': 18,
  'Tottenham Hotspur': 19,
  'Sunderland': 20,
};

export function oddsApiTeamNameToFplId(oddsApiTeamName: string): number | null {
  return ODDS_API_NAME_TO_FPL_ID[oddsApiTeamName] ?? null;
}
