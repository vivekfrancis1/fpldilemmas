/**
 * FPL Team data fetcher using Team ID
 * Fetches team data from FPL API using only Team ID (no authentication required)
 */

interface FplApiTeamData {
  id: number;
  name: string;
  current_event: number;
  overall_points: number;
  overall_rank: number;
  summary_overall_points: number;
  summary_overall_rank: number;
  total_transfers: number;
  bank: number;
  value: number;
  kit: string;
  favourite_team: number;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  player_region_short_iso: string;
  leagues: {
    classic: Array<{
      id: number;
      name: string;
      short_name: string;
      entry_rank: number;
      entry_last_rank: number;
    }>;
  };
}

interface FplApiPicks {
  active_chip: string | null;
  automatic_subs: any[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
}

export class FplTeamFetcher {
  private baseUrl = 'https://fantasy.premierleague.com/api';

  async fetchTeamData(teamId: number): Promise<any> {
    try {
      console.log(`📊 Fetching team data for Team ID: ${teamId}`);
      
      // Fetch team entry data
      const entryResponse = await fetch(`${this.baseUrl}/entry/${teamId}/`);
      if (!entryResponse.ok) {
        throw new Error(`Team ${teamId} not found or invalid`);
      }
      const teamData: FplApiTeamData = await entryResponse.json();

      // Fetch current gameweek picks
      const currentEvent = teamData.current_event;
      const picksResponse = await fetch(`${this.baseUrl}/entry/${teamId}/event/${currentEvent}/picks/`);
      let picksData: FplApiPicks | null = null;
      
      if (picksResponse.ok) {
        picksData = await picksResponse.json();
      }

      // Transform to our format
      const transformedTeam = {
        id: teamData.id,
        name: `${teamData.player_first_name} ${teamData.player_last_name}`,
        teamName: teamData.name,
        event: currentEvent,
        overallPoints: teamData.summary_overall_points,
        overallRank: teamData.summary_overall_rank,
        gameweekPoints: picksData?.entry_history?.points || 0,
        gameweekRank: picksData?.entry_history?.rank || 0,
        totalTransfers: teamData.total_transfers,
        bank: teamData.bank,
        teamValue: teamData.value,
        freeTransfers: 1, // Would need additional API call to get exact free transfers
        picks: picksData?.picks || [],
        activeChip: picksData?.active_chip,
        leagues: teamData.leagues.classic.slice(0, 5), // Top 5 leagues
      };

      console.log(`✅ Successfully fetched data for ${transformedTeam.name}'s team: ${transformedTeam.teamName}`);
      return transformedTeam;

    } catch (error: any) {
      console.error(`❌ Failed to fetch team data for ID ${teamId}:`, error.message);
      throw new Error(`Failed to fetch team data: ${error.message}`);
    }
  }

  async fetchTransferHistory(teamId: number): Promise<any[]> {
    try {
      console.log(`🔄 Fetching transfer history for Team ID: ${teamId}`);
      
      const response = await fetch(`${this.baseUrl}/entry/${teamId}/transfers/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transfers for team ${teamId}`);
      }

      const transfers = await response.json();
      console.log(`✅ Fetched ${transfers.length} transfers`);
      
      return transfers.map((transfer: any) => ({
        event: transfer.event,
        time: transfer.time,
        element_in: transfer.element_in,
        element_in_cost: transfer.element_in_cost,
        element_out: transfer.element_out,
        element_out_cost: transfer.element_out_cost,
      }));

    } catch (error: any) {
      console.error(`❌ Failed to fetch transfer history:`, error.message);
      throw new Error(`Failed to fetch transfer history: ${error.message}`);
    }
  }

  async fetchGameweekPicks(teamId: number, gameweek: number): Promise<any> {
    try {
      console.log(`🎯 Fetching gameweek ${gameweek} picks for Team ID: ${teamId}`);
      
      const response = await fetch(`${this.baseUrl}/entry/${teamId}/event/${gameweek}/picks/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch picks for gameweek ${gameweek}`);
      }

      const picks = await response.json();
      console.log(`✅ Fetched picks for gameweek ${gameweek}`);
      
      return picks;

    } catch (error: any) {
      console.error(`❌ Failed to fetch gameweek picks:`, error.message);
      throw new Error(`Failed to fetch gameweek picks: ${error.message}`);
    }
  }
}

export const fplTeamFetcher = new FplTeamFetcher();