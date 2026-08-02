import { describe, it, expect } from 'vitest';
import { oddsApiTeamNameToFplId } from '../shared/team-name-crosswalk';
import { PREMIER_LEAGUE_TEAMS } from '../shared/schema';

// Every full name below was observed live from The Odds API's soccer_epl feed this session —
// not guessed. Where the Odds API's full name happens to equal PREMIER_LEAGUE_TEAMS' short
// display name (e.g. "Arsenal"), that's still listed explicitly for clarity/robustness.
const ODDS_API_NAME_TO_FPL_SHORT_NAME: Record<string, string> = {
  'Arsenal': 'ARS',
  'Aston Villa': 'AVL',
  'Bournemouth': 'BOU',
  'Brentford': 'BRE',
  'Brighton and Hove Albion': 'BHA',
  'Chelsea': 'CHE',
  'Coventry City': 'COV',
  'Crystal Palace': 'CRY',
  'Everton': 'EVE',
  'Fulham': 'FUL',
  'Hull City': 'HUL',
  'Ipswich Town': 'IPS',
  'Leeds United': 'LEE',
  'Liverpool': 'LIV',
  'Manchester City': 'MCI',
  'Manchester United': 'MUN',
  'Newcastle United': 'NEW',
  'Nottingham Forest': 'NFO',
  'Tottenham Hotspur': 'TOT',
  'Sunderland': 'SUN',
};

describe('oddsApiTeamNameToFplId', () => {
  it('maps every current-season Odds API team name to the correct FPL team id', () => {
    for (const [oddsApiName, fplShortName] of Object.entries(ODDS_API_NAME_TO_FPL_SHORT_NAME)) {
      const expectedTeam = PREMIER_LEAGUE_TEAMS.find((t) => t.short_name === fplShortName);
      expect(expectedTeam, `no PREMIER_LEAGUE_TEAMS entry for ${fplShortName}`).toBeDefined();
      expect(oddsApiTeamNameToFplId(oddsApiName), `mapping for "${oddsApiName}"`).toBe(expectedTeam!.id);
    }
  });

  it('covers all 20 current Premier League teams with no gaps', () => {
    expect(Object.keys(ODDS_API_NAME_TO_FPL_SHORT_NAME).length).toBe(20);
    expect(PREMIER_LEAGUE_TEAMS.length).toBe(20);
  });

  it('returns null for an unrecognized name', () => {
    expect(oddsApiTeamNameToFplId('Some Made Up FC')).toBeNull();
  });

  it('is case-sensitive to the exact Odds API spelling (no silent partial matches)', () => {
    expect(oddsApiTeamNameToFplId('arsenal')).toBeNull();
    expect(oddsApiTeamNameToFplId('Man United')).toBeNull();
  });
});
