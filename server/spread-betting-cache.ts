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
      
      // Debug: Sample the first game's raw bookmaker data to check API quality
      if (oddsData.length > 0) {
        const sampleGame = oddsData[0];
        console.log(`🔍 RAW API SAMPLE - ${sampleGame.home_team} vs ${sampleGame.away_team}:`);
        console.log(`📊 Sample game:`, {
          home_team: sampleGame.home_team,
          away_team: sampleGame.away_team,
          commence_time: sampleGame.commence_time,
          bookmakers_count: sampleGame.bookmakers?.length || 0,
          markets: sampleGame.bookmakers?.[0]?.markets?.map((m: any) => m.key) || []
        });
        
        if (sampleGame.bookmakers && sampleGame.bookmakers.length > 0) {
          const sampleBookmaker = sampleGame.bookmakers[0];
          console.log(`📊 First bookmaker: ${sampleBookmaker.title}`);
          
          if (sampleBookmaker.markets) {
            for (const market of sampleBookmaker.markets) {
              console.log(`📊 ${market.key} market:`, market.outcomes?.map((o: any) => `${o.name}=${o.point}@${o.price}`) || []);
              if (market.outcomes && market.outcomes.length > 2) {
                console.log(`📊 ${market.key} has ${market.outcomes.length} total outcomes`);
              }
            }
          }
        }
      }

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
        const { totalsData, spreadsData, bookmakerCount } = this.extractMarketData(game.bookmakers || []);
        
        console.log(`📊 Market data for ${homeTeamName} vs ${awayTeamName}:`, {
          bookmakers: game.bookmakers?.length || 0,
          totalsData: totalsData ? 'Found' : 'Missing',
          spreadsData: spreadsData ? 'Found' : 'Missing',
          bookmakerCount
        });
        
        if (!totalsData || !spreadsData) {
          console.log(`⚠️ Missing market data for ${homeTeamName} vs ${awayTeamName} - skipping`);
          continue;
        }

        // Calculate expected goals using sophisticated betting odds analysis
        const { homeExpectedGoals, awayExpectedGoals } = this.calculateAdvancedExpectedGoals(
          totalsData, spreadsData, game.bookmakers || []
        );

        // Verify data authenticity - check for demo/sample patterns
        const isAuthentic = this.verifyDataAuthenticity(game, totalsData, spreadsData);
        
        // Determine market confidence based on authenticity and data source quality
        let marketConfidence = 'Demo Data';
        let dataSource = "Demo/Sample Data";
        
        if (isAuthentic) {
          dataSource = "The Odds API";
          if (totalsData.source === 'real_market' && spreadsData.source === 'real_market') {
            marketConfidence = 'High';
          } else if (totalsData.source === 'real_market' || spreadsData.source === 'real_market') {
            marketConfidence = 'Medium';
          } else {
            marketConfidence = 'Low';
          }
        }

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
          dataSource,
          bookmakerCount
        });

      } catch (error) {
        console.error(`❌ Error processing game:`, error);
      }
    }

    console.log(`✅ Processed ${processedData.length} spread betting fixtures`);
    return processedData;
  }

  private calculateAdvancedExpectedGoals(totalsData: any, spreadsData: any, bookmakers: any[]): { homeExpectedGoals: number, awayExpectedGoals: number } {
    // Start with basic T+S/2 formula as baseline
    const T = totalsData.midpoint;
    const S = spreadsData.midpoint;
    
    // CRITICAL FIX: Correct supremacy interpretation
    // When S is negative, home team is favored by |S| goals
    // When S is positive, away team is favored by S goals
    let homeExpectedGoals = (T - S) / 2;  // Fixed: subtract supremacy for home team
    let awayExpectedGoals = (T + S) / 2;  // Fixed: add supremacy for away team

    // TEMPORARILY DISABLE COMPLEX ADJUSTMENTS - USE BASIC FORMULA ONLY
    // The win probability adjustments were causing incorrect calculations
    // Keeping this simple for now to ensure accurate supremacy interpretation
    
    // Find best bookmaker with match winner odds for enhanced calculation
    // const winnerOdds = this.extractMatchWinnerOdds(bookmakers);
    
    // if (winnerOdds) {
    //   // Convert decimal odds to implied probabilities
    //   const homeWinProb = 1 / winnerOdds.home;
    //   const awayWinProb = 1 / winnerOdds.away;
    //   const drawProb = 1 / winnerOdds.draw;
    //   
    //   // Normalize probabilities (bookmaker margin)
    //   const totalProb = homeWinProb + awayWinProb + drawProb;
    //   const normHomeProb = homeWinProb / totalProb;
    //   const normAwayProb = awayWinProb / totalProb;
    //   
    //   // Calculate strength ratio from win probabilities
    //   const strengthRatio = normHomeProb / normAwayProb;
    //   
    //   // Adjust expected goals based on win probability insights
    //   // Teams with higher win probability should have slightly higher xG
    //   const adjustment = Math.log(strengthRatio) * 0.3; // Moderate adjustment factor
    //   
    //   homeExpectedGoals = Math.max(0.2, homeExpectedGoals + adjustment);
    //   awayExpectedGoals = Math.max(0.2, awayExpectedGoals - adjustment);
    //   
    //   // Ensure total still approximately matches the total goals line
    //   const actualTotal = homeExpectedGoals + awayExpectedGoals;
    //   const targetTotal = T;
    //   const scaleFactor = targetTotal / actualTotal;
    //   
    //   homeExpectedGoals *= scaleFactor;
    //   awayExpectedGoals *= scaleFactor;
    // }

    // TEMPORARILY DISABLE RANDOM VARIANCE - KEEP CALCULATIONS DETERMINISTIC
    // Add small random variance to prevent identical values (±0.1)
    // const homeVariance = (Math.random() - 0.5) * 0.2;
    // const awayVariance = (Math.random() - 0.5) * 0.2;
    
    homeExpectedGoals = Math.max(0.2, Math.min(4.0, homeExpectedGoals));
    awayExpectedGoals = Math.max(0.2, Math.min(4.0, awayExpectedGoals));

    // Round to 2 decimal places for cleaner display
    return {
      homeExpectedGoals: Math.round(homeExpectedGoals * 100) / 100,
      awayExpectedGoals: Math.round(awayExpectedGoals * 100) / 100
    };
  }

  private extractMatchWinnerOdds(bookmakers: any[]): { home: number, away: number, draw: number } | null {
    // Find first bookmaker with h2h (match winner) market
    for (const bookmaker of bookmakers) {
      const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
      if (h2hMarket && h2hMarket.outcomes?.length === 3) {
        const outcomes = h2hMarket.outcomes;
        return {
          home: outcomes[0]?.price || 2.0,
          away: outcomes[1]?.price || 2.0, 
          draw: outcomes[2]?.price || 3.0
        };
      }
    }
    return null;
  }

  private verifyDataAuthenticity(game: any, totalsData: any, spreadsData: any): boolean {
    console.log(`🔍 Verifying authenticity for ${game.home_team} vs ${game.away_team}`);
    
    // Check 1: Minimum bookmaker count (real markets have multiple bookmakers)
    const bookmakerCount = game.bookmakers?.length || 0;
    if (bookmakerCount < 5) {
      console.log(`❌ DEMO PATTERN: Only ${bookmakerCount} bookmakers (need ≥5 for real markets)`);
      return false;
    }

    // Check 2: Market data freshness (real markets update frequently)
    const now = new Date();
    let hasRecentUpdate = false;
    
    for (const bookmaker of game.bookmakers || []) {
      const lastUpdate = new Date(bookmaker.last_update || 0);
      const ageHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        hasRecentUpdate = true;
        break;
      }
    }
    
    if (!hasRecentUpdate) {
      console.log(`❌ DEMO PATTERN: No bookmaker updates within 24 hours`);
      return false;
    }

    // Check 3: Spreads patterns (0.0 spreads are common in demo data)
    if (spreadsData.midpoint === 0.0 && totalsData.midpoint === 2.5) {
      console.log(`❌ DEMO PATTERN: Classic demo values (0.0 spread, 2.5 total)`);
      return false;
    }

    // Check 4: Market diversity (real markets have varied totals)
    if (totalsData.midpoint < 1.5 || totalsData.midpoint > 5.5) {
      console.log(`❌ DEMO PATTERN: Unrealistic total goals: ${totalsData.midpoint}`);
      return false;
    }

    // Check 5: Bookmaker names (real markets have recognizable bookmakers)
    const realBookmakerNames = ['bet365', 'william hill', 'ladbrokes', 'paddy power', 'betfair', 'coral', 'unibet'];
    const hasRealBookmaker = game.bookmakers?.some((book: any) => 
      realBookmakerNames.some(real => book.title?.toLowerCase().includes(real))
    );
    
    if (!hasRealBookmaker) {
      console.log(`❌ DEMO PATTERN: No recognized bookmaker brands found`);
      return false;
    }

    console.log(`✅ AUTHENTIC: Passed all verification checks`);
    return true;
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
    console.log(`🔍 Extracting from ${bookmakers.length} bookmakers, selecting most popular`);

    // Popular bookmakers in order of preference (most reliable and comprehensive)
    const popularBookmakers = [
      'bet365', 'william hill', 'ladbrokes', 'paddy power', 'sky bet', 
      'coral', 'betfair', 'unibet', 'betway', 'virgin bet'
    ];

    // Find the most popular bookmaker that has both markets
    let selectedBookmaker: any = null;
    let bookmakerRank = Infinity;

    for (const bookmaker of bookmakers) {
      const bookmakerName = (bookmaker.title || '').toLowerCase();
      const rank = popularBookmakers.findIndex(popular => 
        bookmakerName.includes(popular) || popular.includes(bookmakerName.split(' ')[0])
      );
      
      // Check if this bookmaker has both required markets
      const hasTotal = bookmaker.markets?.some((m: any) => m.key === 'totals');
      const hasSpread = bookmaker.markets?.some((m: any) => m.key === 'spreads');
      
      if (hasTotal && hasSpread && rank < bookmakerRank) {
        selectedBookmaker = bookmaker;
        bookmakerRank = rank;
      }
    }

    // If no popular bookmaker found, use the first one with both markets
    if (!selectedBookmaker) {
      selectedBookmaker = bookmakers.find(bookmaker => {
        const hasTotal = bookmaker.markets?.some((m: any) => m.key === 'totals');
        const hasSpread = bookmaker.markets?.some((m: any) => m.key === 'spreads');
        return hasTotal && hasSpread;
      });
    }

    if (!selectedBookmaker) {
      console.log(`⚠️ No bookmaker found with both totals and spreads markets`);
      return {
        totalsData: { sell: 2.3, buy: 2.7, midpoint: 2.5, source: 'fallback' },
        spreadsData: { sell: -0.25, buy: 0.25, midpoint: 0.0, source: 'fallback' },
        bookmakerCount: 0
      };
    }

    console.log(`✅ Selected bookmaker: ${selectedBookmaker.title} (rank: ${bookmakerRank >= 0 ? bookmakerRank + 1 : 'not in top list'})`);

    let totalsData: any = null;
    let spreadsData: any = null;

    // Extract data from the selected bookmaker
    for (const market of selectedBookmaker.markets || []) {
      console.log(`🔍 Processing market: ${market.key} with ${market.outcomes?.length || 0} outcomes`);
      
      if (market.key === 'totals' && !totalsData) {
        console.log(`📊 Available totals outcomes:`, market.outcomes?.map((o: any) => `${o.name}: ${o.point} @ ${o.price}`) || []);
        
        // Find over/under market - try different approaches
        const overOutcome = market.outcomes.find((o: any) => o.name === 'Over' && o.point);
        const underOutcome = market.outcomes.find((o: any) => o.name === 'Under' && o.point);
        
        if (overOutcome && overOutcome.point) {
          const point = parseFloat(overOutcome.point);
          console.log(`🎯 Evaluating totals point: ${point} (range: 1.5-4.5)`);
          
          if (point >= 1.5 && point <= 4.5) { // Reasonable range
            totalsData = {
              sell: Math.max(0.5, point - 0.25),
              buy: point + 0.25,
              midpoint: point,
              source: 'real_market',
              bookmaker: selectedBookmaker.title
            };
            console.log(`✅ Found totals market: ${point} goals (${selectedBookmaker.title})`);
          } else {
            console.log(`❌ Point ${point} outside acceptable range 1.5-4.5`);
          }
        } else {
          console.log(`❌ No valid Over outcome found with point`);
        }
      }
      
      if (market.key === 'spreads' && !spreadsData) {
        console.log(`📊 Available spreads outcomes:`, market.outcomes?.map((o: any) => `${o.name}: ${o.point} @ ${o.price}`) || []);
        
        // Find handicap market - usually first outcome is home team
        const handicapOutcome = market.outcomes.find((o: any) => 
          o.point !== undefined && o.point !== null && Math.abs(o.point) <= 3.0
        );
        
        if (handicapOutcome) {
          const point = parseFloat(handicapOutcome.point);
          console.log(`🎯 Evaluating spreads point: ${point} (range: -3.0 to +3.0)`);
          
          spreadsData = {
            sell: point - 0.25,
            buy: point + 0.25,
            midpoint: point,
            source: 'real_market',
            bookmaker: selectedBookmaker.title
          };
          console.log(`✅ Found spreads market: ${point} handicap (${selectedBookmaker.title})`);
        } else {
          console.log(`❌ No valid handicap outcome found within range`);
        }
      }
    }

    // Final fallback if extraction failed
    if (!totalsData) {
      console.log(`⚠️ Could not extract totals from ${selectedBookmaker.title}, using fallback`);
      totalsData = {
        sell: 2.3, buy: 2.7, midpoint: 2.5, source: 'fallback'
      };
    }
    
    if (!spreadsData) {
      console.log(`⚠️ Could not extract spreads from ${selectedBookmaker.title}, using fallback`);
      spreadsData = {
        sell: -0.25, buy: 0.25, midpoint: 0.0, source: 'fallback'
      };
    }

    console.log(`📊 Final extraction: Totals=${totalsData.source}, Spreads=${spreadsData.source} from ${selectedBookmaker.title}`);
    return { totalsData, spreadsData, bookmakerCount: 1 };
  }
}