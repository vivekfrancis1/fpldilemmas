import { db } from "./db";
import { cachedSpreadBettingOdds, type CachedSpreadBettingOdds, type InsertCachedSpreadBettingOdds } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface SpreadBettingData {
  fixtureId: string;
  gameweek: number;
  kickoffTime: string;
  homeTeamId?: number | null;
  homeTeamName: string;
  homeTeamShortName: string;
  awayTeamId?: number | null;
  awayTeamName: string;
  awayTeamShortName: string;
  totalGoalsSell: number;
  totalGoalsBuy: number;
  totalGoalsMidpoint: number;
  supremacySell: number;
  supremacyBuy: number;
  supremacyMidpoint: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  marketConfidence: string;
  dataSource: string;
  bookmakerCount: number;
}

export class SpreadBettingCacheService {
  private static instance: SpreadBettingCacheService;
  
  public static getInstance(): SpreadBettingCacheService {
    if (!SpreadBettingCacheService.instance) {
      SpreadBettingCacheService.instance = new SpreadBettingCacheService();
    }
    return SpreadBettingCacheService.instance;
  }

  /**
   * Check if we have fresh data for today (within last 24 hours)
   */
  async hasFreshData(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const [latestRecord] = await db
        .select()
        .from(cachedSpreadBettingOdds)
        .where(eq(cachedSpreadBettingOdds.fetchDate, today))
        .orderBy(desc(cachedSpreadBettingOdds.lastUpdated))
        .limit(1);

      return !!latestRecord;
    } catch (error) {
      console.error("❌ Error checking for fresh data:", error);
      return false;
    }
  }

  /**
   * Get cached spread betting data
   */
  async getCachedData(): Promise<SpreadBettingData[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const cachedData = await db
        .select()
        .from(cachedSpreadBettingOdds)
        .where(eq(cachedSpreadBettingOdds.fetchDate, today))
        .orderBy(desc(cachedSpreadBettingOdds.gameweek));

      console.log(`📊 Retrieved ${cachedData.length} cached spread betting records for ${today}`);

      return cachedData.map(record => ({
        fixtureId: record.fixtureId,
        gameweek: record.gameweek,
        kickoffTime: record.kickoffTime.toISOString(),
        homeTeamId: record.homeTeamId,
        homeTeamName: record.homeTeamName,
        homeTeamShortName: record.homeTeamShortName,
        awayTeamId: record.awayTeamId,
        awayTeamName: record.awayTeamName,
        awayTeamShortName: record.awayTeamShortName,
        totalGoalsSell: Number(record.totalGoalsSell),
        totalGoalsBuy: Number(record.totalGoalsBuy),
        totalGoalsMidpoint: Number(record.totalGoalsMidpoint),
        supremacySell: Number(record.supremacySell),
        supremacyBuy: Number(record.supremacyBuy),
        supremacyMidpoint: Number(record.supremacyMidpoint),
        homeExpectedGoals: Number(record.homeExpectedGoals),
        awayExpectedGoals: Number(record.awayExpectedGoals),
        marketConfidence: record.marketConfidence,
        dataSource: record.dataSource,
        bookmakerCount: record.bookmakerCount || 0
      }));
    } catch (error) {
      console.error("❌ Error getting cached data:", error);
      return [];
    }
  }

  /**
   * Cache fresh spread betting data
   */
  async cacheData(spreadBettingData: SpreadBettingData[]): Promise<void> {
    try {
      if (spreadBettingData.length === 0) {
        console.log("⚠️ No spread betting data to cache");
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Clear existing data for today to avoid duplicates
      await db
        .delete(cachedSpreadBettingOdds)
        .where(eq(cachedSpreadBettingOdds.fetchDate, today));

      // Insert new data
      const insertData: InsertCachedSpreadBettingOdds[] = spreadBettingData.map(item => ({
        fixtureId: item.fixtureId,
        gameweek: item.gameweek,
        kickoffTime: new Date(item.kickoffTime),
        homeTeamId: item.homeTeamId,
        homeTeamName: item.homeTeamName,
        homeTeamShortName: item.homeTeamShortName,
        awayTeamId: item.awayTeamId,
        awayTeamName: item.awayTeamName,
        awayTeamShortName: item.awayTeamShortName,
        totalGoalsSell: item.totalGoalsSell,
        totalGoalsBuy: item.totalGoalsBuy,
        totalGoalsMidpoint: item.totalGoalsMidpoint,
        supremacySell: item.supremacySell,
        supremacyBuy: item.supremacyBuy,
        supremacyMidpoint: item.supremacyMidpoint,
        homeExpectedGoals: item.homeExpectedGoals,
        awayExpectedGoals: item.awayExpectedGoals,
        marketConfidence: item.marketConfidence,
        dataSource: item.dataSource,
        bookmakerCount: item.bookmakerCount,
        fetchDate: today
      }));

      await db.insert(cachedSpreadBettingOdds).values(insertData);
      
      console.log(`✅ Cached ${insertData.length} spread betting records for ${today}`);
    } catch (error) {
      console.error("❌ Error caching spread betting data:", error);
    }
  }

  /**
   * Fetch fresh data from The Odds API
   */
  async fetchFreshData(): Promise<SpreadBettingData[]> {
    try {
      console.log("🔗 Fetching fresh spread betting data from The Odds API");
      
      if (!process.env.ODDS_API_KEY) {
        console.error("❌ ODDS_API_KEY not found in environment variables");
        return [];
      }

      // Get FPL data for team mapping
      const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      const bootstrapData = await bootstrapResponse.json();
      
      // Fetch real Premier League odds from The Odds API
      const oddsApiUrl = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds`;
      const oddsParams = new URLSearchParams({
        apiKey: process.env.ODDS_API_KEY,
        regions: 'uk,us,eu',
        markets: 'totals,spreads',
        oddsFormat: 'decimal',
        dateFormat: 'iso'
      });

      console.log(`🔗 Calling The Odds API: ${oddsApiUrl}?${oddsParams.toString()}`);
      
      const oddsResponse = await fetch(`${oddsApiUrl}?${oddsParams}`);
      
      if (!oddsResponse.ok) {
        const errorText = await oddsResponse.text();
        console.error(`❌ The Odds API error: ${oddsResponse.status} - ${errorText}`);
        return [];
      }

      const oddsData = await oddsResponse.json();
      console.log(`📊 Received ${oddsData.length} games from The Odds API`);

      // Process and return the data
      return this.processOddsData(oddsData, bootstrapData);
    } catch (error) {
      console.error("❌ Error fetching fresh data:", error);
      return [];
    }
  }

  /**
   * Process odds data from The Odds API
   */
  private processOddsData(oddsData: any[], bootstrapData: any): SpreadBettingData[] {
    const processedData: SpreadBettingData[] = [];
    
    // Get FPL teams data for mapping
    const fplTeams = bootstrapData?.teams || [];
    const events = bootstrapData?.events || [];
    
    // Create team mapping by name
    const teamMapping = new Map();
    fplTeams.forEach((team: any) => {
      const variations = [
        team.name,
        team.short_name,
        team.name.replace(/\s+/g, ''),
        team.name.toLowerCase(),
        team.short_name.toLowerCase()
      ];
      
      variations.forEach(variation => {
        teamMapping.set(variation, {
          id: team.id,
          name: team.name,
          shortName: team.short_name
        });
      });
    });

    // Additional team name mappings for better matching
    const additionalMappings = {
      'tottenham': { shortName: 'TOT', name: 'Spurs' },
      'tottenham hotspur': { shortName: 'TOT', name: 'Spurs' },
      'manchester united': { shortName: 'MUN', name: 'Man Utd' },
      'manchester city': { shortName: 'MCI', name: 'Man City' },
      'newcastle united': { shortName: 'NEW', name: 'Newcastle' },
      'west ham united': { shortName: 'WHU', name: 'West Ham' },
      'wolverhampton wanderers': { shortName: 'WOL', name: 'Wolves' },
      'nottingham forest': { shortName: 'NFO', name: 'Nott\'m Forest' },
      'brighton and hove albion': { shortName: 'BHA', name: 'Brighton' },
      'crystal palace': { shortName: 'CRY', name: 'Crystal Palace' },
      'aston villa': { shortName: 'AVL', name: 'Aston Villa' }
    };

    Object.entries(additionalMappings).forEach(([key, value]) => {
      teamMapping.set(key, value);
    });

    for (const game of oddsData) {
      try {
        const homeTeamName = game.home_team;
        const awayTeamName = game.away_team;
        
        // Find team data
        const homeTeam = this.findTeamData(homeTeamName, teamMapping, fplTeams);
        const awayTeam = this.findTeamData(awayTeamName, teamMapping, fplTeams);
        
        if (!homeTeam || !awayTeam) {
          console.log(`⚠️ Could not map teams: ${homeTeamName} vs ${awayTeamName}`);
          continue;
        }

        // Find gameweek
        const kickoffTime = new Date(game.commence_time);
        const gameweek = this.findGameweek(kickoffTime, events);
        
        if (!gameweek) {
          console.log(`⚠️ Could not determine gameweek for ${homeTeamName} vs ${awayTeamName}`);
          continue;
        }

        // Process bookmaker odds to extract totals and spreads
        const { totalsData, spreadsData, bookmakerCount } = this.extractMarketData(game.bookmakers);
        
        if (!totalsData || !spreadsData) {
          console.log(`⚠️ Missing market data for ${homeTeamName} vs ${awayTeamName}`);
          continue;
        }

        // Calculate expected goals using T+S/2 and T-S/2 formulas
        const T = totalsData.midpoint;
        const S = spreadsData.midpoint;
        const homeExpectedGoals = (T + S) / 2;
        const awayExpectedGoals = (T - S) / 2;

        // Determine market confidence based on bookmaker count
        const marketConfidence = bookmakerCount >= 8 ? 'High' : 
                               bookmakerCount >= 5 ? 'Medium' : 'Low';

        const fixtureId = `${homeTeam.shortName}_${awayTeam.shortName}_GW${gameweek}`;

        processedData.push({
          fixtureId,
          gameweek,
          kickoffTime: kickoffTime.toISOString(),
          homeTeamId: homeTeam.id,
          homeTeamName: homeTeam.name,
          homeTeamShortName: homeTeam.shortName,
          awayTeamId: awayTeam.id,
          awayTeamName: awayTeam.name,
          awayTeamShortName: awayTeam.shortName,
          totalGoalsSell: totalsData.sell,
          totalGoalsBuy: totalsData.buy,
          totalGoalsMidpoint: totalsData.midpoint,
          supremacySell: spreadsData.sell,
          supremacyBuy: spreadsData.buy,
          supremacyMidpoint: spreadsData.midpoint,
          homeExpectedGoals,
          awayExpectedGoals,
          marketConfidence,
          dataSource: "The Odds API",
          bookmakerCount
        });

      } catch (error) {
        console.error(`❌ Error processing game:`, error);
      }
    }

    console.log(`✅ Processed ${processedData.length} spread betting fixtures`);
    return processedData;
  }

  private findTeamData(teamName: string, teamMapping: Map<string, any>, fplTeams: any[]): any {
    const variations = [
      teamName,
      teamName.toLowerCase(),
      teamName.replace(/\s+/g, '').toLowerCase()
    ];
    
    for (const variation of variations) {
      const mapped = teamMapping.get(variation);
      if (mapped) return mapped;
    }
    
    // Fallback: direct search in FPL teams
    const directMatch = fplTeams.find((team: any) => 
      team.name.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(team.name.toLowerCase()) ||
      team.short_name.toLowerCase() === teamName.toLowerCase()
    );
    
    if (directMatch) {
      return {
        id: directMatch.id,
        name: directMatch.name,
        shortName: directMatch.short_name
      };
    }
    
    return null;
  }

  private findGameweek(kickoffTime: Date, events: any[]): number | null {
    for (const event of events) {
      const eventStart = new Date(event.deadline_time);
      const eventEnd = new Date(eventStart);
      eventEnd.setDate(eventEnd.getDate() + 7); // Assume 7-day gameweek
      
      if (kickoffTime >= eventStart && kickoffTime <= eventEnd) {
        return event.id;
      }
    }
    return null;
  }

  private extractMarketData(bookmakers: any[]): { totalsData: any, spreadsData: any, bookmakerCount: number } {
    let totalsData: any = null;
    let spreadsData: any = null;
    let bookmakerCount = 0;

    for (const bookmaker of bookmakers) {
      bookmakerCount++;
      
      for (const market of bookmaker.markets) {
        if (market.key === 'totals' && !totalsData) {
          const overOutcome = market.outcomes.find((o: any) => o.name === 'Over');
          const underOutcome = market.outcomes.find((o: any) => o.name === 'Under');
          
          if (overOutcome && underOutcome && overOutcome.point) {
            const point = parseFloat(overOutcome.point);
            totalsData = {
              sell: point - 0.25, // Typical spread
              buy: point + 0.25,
              midpoint: point
            };
          }
        }
        
        if (market.key === 'spreads' && !spreadsData) {
          const homeOutcome = market.outcomes[0]; // Usually home team first
          if (homeOutcome && homeOutcome.point) {
            const point = parseFloat(homeOutcome.point);
            spreadsData = {
              sell: point - 0.25,
              buy: point + 0.25,
              midpoint: point
            };
          }
        }
      }
      
      // Break if we have both markets from this bookmaker
      if (totalsData && spreadsData) break;
    }

    return { totalsData, spreadsData, bookmakerCount };
  }
}