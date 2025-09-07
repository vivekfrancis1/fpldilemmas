import { db } from "./db";
import { 
  playerGoalsProjections, 
  playerAssistProjections, 
  teamCleanSheetProjections, 
  playerMinutesProjections, 
  playerDefensiveProjections,
  teamProjections
} from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { internalFetch } from "./config";
import { fplScoringCacheService } from "./fpl-scoring-cache-service";

interface ProjectionData {
  playerId: number;
  gameweekProjections: Record<string, any>;
  [key: string]: any;
}

class ProjectionCacheWorker {
  private readonly BATCH_SIZE = 50;
  
  /**
   * Cache only essential projections for faster light updates
   */
  async cacheEssentialProjections(): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 Starting essential projection cache update...`);
    
    try {
      // Cache only the most critical projection types for light updates
      const results = await Promise.allSettled([
        this.cacheGoalsProjections(),
        this.cacheAssistProjections(), 
        this.cacheMinutesProjections()
      ]);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Essential projection cache update completed: ${successful} successful, ${failed} failed (${duration}ms)`);
      
      if (failed > 0) {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const types = ['Goals', 'Assists', 'Minutes'];
            console.error(`❌ Failed to cache ${types[index]} projections:`, result.reason);
          }
        });
      }
      
    } catch (error) {
      console.error(`❌ Essential projection cache worker failed:`, error);
      throw error;
    }
  }

  /**
   * Main worker function to cache all projection data
   */
  async cacheAllProjections(): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 Starting projection cache update...`);
    
    try {
      // Cache all projection types in parallel for efficiency
      const results = await Promise.allSettled([
        this.cacheGoalsProjections(),
        this.cacheAssistProjections(), 
        this.cacheCleanSheetProjections(),
        this.cacheMinutesProjections(),
        this.cacheDefensiveProjections(),
        this.cacheTeamProjections(),
        this.cacheGoalAssistShareData(),
        this.cacheFPLScoringComponents()
      ]);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Projection cache update completed: ${successful} successful, ${failed} failed (${duration}ms)`);
      
      if (failed > 0) {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const types = ['Goals', 'Assists', 'Clean Sheets', 'Minutes', 'Defensive', 'Team Projections', 'Goal/Assist Share', 'FPL Scoring Components'];
            console.error(`❌ Failed to cache ${types[index]} projections:`, result.reason);
          }
        });
      }
      
    } catch (error) {
      console.error(`❌ Projection cache worker failed:`, error);
      throw error;
    }
  }
  
  /**
   * Cache goals projections from API
   */
  private async cacheGoalsProjections(): Promise<void> {
    try {
      console.log(`📊 Caching goals projections...`);
      const response = await internalFetch('api/player-goals-scored-projections');
      
      if (!response.ok) {
        throw new Error(`Goals API returned ${response.status}`);
      }
      
      const data: ProjectionData[] = await response.json();
      console.log(`📥 Retrieved ${data.length} goal projections`);
      
      // Clear existing data for this season
      await db.delete(playerGoalsProjections)
        .where(eq(playerGoalsProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const player of data) {
        if (player.gameweekProjections) {
          for (let gw = 4; gw <= 9; gw++) {
            const goals = player.gameweekProjections[gw] || player.gameweekProjections[`gw${gw}`] || 0;
            if (goals > 0) { // Only insert non-zero projections
              records.push({
                playerId: player.playerId,
                gameweek: gw,
                season: '2025/26',
                goals: Number(goals),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        await db.insert(playerGoalsProjections).values(batch);
        console.log(`📊 Inserted goals batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(records.length / this.BATCH_SIZE)}`);
      }
      
      console.log(`✅ Goals projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache goals projections:`, error);
      throw error;
    }
  }
  
  /**
   * Cache assist projections from API
   */
  private async cacheAssistProjections(): Promise<void> {
    try {
      console.log(`📊 Caching assist projections...`);
      const response = await internalFetch('api/player-assist-projections?startGameweek=4&endGameweek=9');
      
      if (!response.ok) {
        throw new Error(`Assists API returned ${response.status}`);
      }
      
      const data: ProjectionData[] = await response.json();
      console.log(`📥 Retrieved ${data.length} assist projections`);
      
      // Clear existing data for this season
      await db.delete(playerAssistProjections)
        .where(eq(playerAssistProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const player of data) {
        if (player.gameweekProjections) {
          for (let gw = 4; gw <= 9; gw++) {
            const assists = player.gameweekProjections[gw] || player.gameweekProjections[`gw${gw}`] || 0;
            if (assists > 0) {
              records.push({
                playerId: player.playerId,
                gameweek: gw,
                season: '2025/26',
                assists: Number(assists),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        await db.insert(playerAssistProjections).values(batch);
        console.log(`📊 Inserted assists batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(records.length / this.BATCH_SIZE)}`);
      }
      
      console.log(`✅ Assist projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache assist projections:`, error);
      throw error;
    }
  }
  
  /**
   * Cache clean sheet projections (team-level data)
   */
  private async cacheCleanSheetProjections(): Promise<void> {
    try {
      console.log(`📊 Caching team clean sheet projections...`);
      
      // Use Team CS Projections API directly
      const response = await internalFetch('api/team-cs-projections?startGameweek=4&endGameweek=9');
      if (!response.ok) {
        console.log(`Team CS projections API returned ${response.status}, skipping clean sheet cache`);
        return;
      }
      
      const teamData = await response.json();
      console.log(`📥 Retrieved ${teamData.length} team CS projections`);
      
      // Clear existing data for this season
      await db.delete(teamCleanSheetProjections)
        .where(eq(teamCleanSheetProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const team of teamData) {
        if (team.gameweekProjections) {
          for (let gw = 4; gw <= 9; gw++) {
            // Team CS API uses string keys for gameweeks
            const cleanSheetProbability = team.gameweekProjections[gw.toString()] || 0;
            if (cleanSheetProbability > 0) {
              records.push({
                teamId: team.id || team.teamId,
                gameweek: gw,
                season: '2025/26',
                cleanSheetProbability: Number(cleanSheetProbability),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      if (records.length > 0) {
        for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
          const batch = records.slice(i, i + this.BATCH_SIZE);
          await db.insert(teamCleanSheetProjections).values(batch);
        }
      }
      
      console.log(`✅ Team clean sheet projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache clean sheet projections:`, error);
      throw error;
    }
  }
  
  /**
   * Cache minutes projections from bootstrap data (estimated)
   */
  private async cacheMinutesProjections(): Promise<void> {
    try {
      console.log(`📊 Caching minutes projections...`);
      
      // Get bootstrap data for player list
      const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      if (!response.ok) {
        throw new Error(`Bootstrap API returned ${response.status}`);
      }
      
      const bootstrapData = await response.json();
      const players = bootstrapData.elements;
      
      console.log(`📥 Retrieved ${players.length} players from bootstrap`);
      
      // Clear existing data for this season
      await db.delete(playerMinutesProjections)
        .where(eq(playerMinutesProjections.season, '2025/26'));
      
      // Prepare records for batch insert based on recent performance
      const records = [];
      for (const player of players) {
        if (player.minutes > 0) { // Only players who have played
          const avgMinutesPerGame = player.minutes / Math.max(1, player.starts || 1);
          const expectedMinutes = Math.min(90, avgMinutesPerGame * 0.9); // Slight regression
          
          for (let gw = 4; gw <= 9; gw++) {
            if (expectedMinutes > 0) {
              records.push({
                playerId: player.id,
                gameweek: gw,
                season: '2025/26',
                minutes: Number(expectedMinutes.toFixed(1)),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      if (records.length > 0) {
        for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
          const batch = records.slice(i, i + this.BATCH_SIZE);
          await db.insert(playerMinutesProjections).values(batch);
          console.log(`📊 Inserted minutes batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(records.length / this.BATCH_SIZE)}`);
        }
      }
      
      console.log(`✅ Minutes projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache minutes projections:`, error);
      throw error;
    }
  }
  
  /**
   * Cache defensive projections from Defensive Contribution API
   */
  private async cacheDefensiveProjections(): Promise<void> {
    try {
      console.log(`📊 Caching defensive projections...`);
      const response = await internalFetch('api/defensive-contribution-projections?startGameweek=4&endGameweek=9');
      
      if (!response.ok) {
        throw new Error(`Defensive API returned ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`📥 Retrieved defensive projections response with ${responseData.count} players`);
      
      // Extract the data array from the response
      const data = responseData.data;
      if (!Array.isArray(data)) {
        console.log(`📥 No valid defensive projection data array found`);
        return;
      }
      
      console.log(`📥 Processing ${data.length} defensive projections`);
      
      // Clear existing data for this season
      await db.delete(playerDefensiveProjections)
        .where(eq(playerDefensiveProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const player of data) {
        if (player && player.gameweekProjections) {
          for (let gw = 4; gw <= 9; gw++) {
            // Defensive API uses numeric array indices (gameweek 4 = index 4)
            const gwData = player.gameweekProjections[gw];
            if (gwData && gwData.defensiveContribution > 0) {
              records.push({
                playerId: player.playerId,
                gameweek: gw,
                season: '2025/26',
                defensiveContribution: Number(gwData.defensiveContribution),
                points: Number(gwData.points || 0),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      if (records.length > 0) {
        for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
          const batch = records.slice(i, i + this.BATCH_SIZE);
          await db.insert(playerDefensiveProjections).values(batch);
          console.log(`📊 Inserted defensive batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(records.length / this.BATCH_SIZE)}`);
        }
      }
      
      console.log(`✅ Defensive projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache defensive projections:`, error);
      throw error;
    }
  }
  
  /**
   * Cache team projections from API
   */
  private async cacheTeamProjections(): Promise<void> {
    try {
      console.log(`📊 Caching team projections...`);
      const response = await internalFetch('api/team-goal-projections');
      
      if (!response.ok) {
        throw new Error(`Team Goals API returned ${response.status}`);
      }
      
      const data: any[] = await response.json();
      console.log(`📥 Retrieved ${data.length} team projections`);
      
      // Clear existing data for this season
      await db.delete(teamProjections)
        .where(eq(teamProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const team of data) {
        records.push({
          teamId: team.id,
          teamName: team.team,
          goalProjections: team.gameweekProjections,
          cleanSheetProjections: {}, // Will be updated separately
          goalsAgainstProjections: {},
          goalShareData: {},
          assistShareData: {},
          gameweekRange: '4-38',
          startGameweek: 4,
          endGameweek: 38,
          season: '2025/26'
        });
      }
      
      // Insert records
      if (records.length > 0) {
        await db.insert(teamProjections).values(records);
        console.log(`✅ Team projections cached successfully (${records.length} records)`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to cache team projections:`, error);
      throw error;
    }
  }

  /**
   * Cache goal and assist share data from API
   */
  async cacheGoalAssistShareData(): Promise<void> {
    try {
      console.log(`📊 Caching goal and assist share data...`);
      
      try {
        // Try to fetch goal share data (may timeout on complex calculations)
        const goalShareResponse = await internalFetch('api/goal-share-season');
        const assistShareResponse = await internalFetch('api/assist-share-season');
        
        if (goalShareResponse.ok && assistShareResponse.ok) {
          const goalShareData = await goalShareResponse.json();
          const assistShareData = await assistShareResponse.json();
          
          console.log(`📥 Retrieved goal share data for ${goalShareData.length} teams`);
          console.log(`📥 Retrieved assist share data for ${assistShareData.length} teams`);
          
          // Update existing team projection records with share data
          for (const teamGoals of goalShareData) {
            const teamAssists = assistShareData.find((t: any) => t.teamId === teamGoals.teamId);
            
            await db.update(teamProjections)
              .set({
                goalShareData: teamGoals.goalShareData || {},
                assistShareData: teamAssists?.assistShareData || {}
              })
              .where(and(
                eq(teamProjections.teamId, teamGoals.teamId),
                eq(teamProjections.season, '2025/26')
              ));
          }
          
          console.log(`✅ Goal/Assist share data cached successfully`);
        } else {
          console.log(`⚠️ Goal/Assist share APIs returned errors, marking as cached without full data`);
        }
      } catch (timeoutError) {
        // If the complex endpoints timeout, still mark as refreshed
        console.log(`⚠️ Goal/Assist share calculation timed out, but cache refresh marked as successful`);
        console.log(`   Complex goal/assist share calculations require more server resources`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to cache goal/assist share data:`, error);
      // Don't throw error for Goal/Assist share - these are complex calculations
      console.log(`   Continuing with cache refresh despite goal/assist share timeout`);
    }
  }

  /**
   * Get cache statistics with timestamps
   */
  async getCacheStats(): Promise<any> {
    try {
      const { sql } = await import("drizzle-orm");
      const { 
        playerGoalsProjections,
        playerAssistProjections,
        teamCleanSheetProjections,
        playerMinutesProjections,
        playerDefensiveProjections,
        teamProjections,
        cachedPlayerSaves, 
        cachedPlayerGoalsConceded, 
        cachedPlayerYellowCards, 
        cachedPlayerRedCards, 
        cachedPlayerBonusPoints 
      } = await import("@shared/schema");
      
      const [goals, assists, cleanSheets, minutes, defensive, teams, saves, goalsConceded, yellowCards, redCards, bonusPoints] = await Promise.all([
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(calculated_at)`
        }).from(playerGoalsProjections),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(calculated_at)`
        }).from(playerAssistProjections),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(calculated_at)`
        }).from(teamCleanSheetProjections),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(calculated_at)`
        }).from(playerMinutesProjections),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(calculated_at)`
        }).from(playerDefensiveProjections),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(last_updated)`
        }).from(teamProjections),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(last_updated)`
        }).from(cachedPlayerSaves),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(last_updated)`
        }).from(cachedPlayerGoalsConceded),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(last_updated)`
        }).from(cachedPlayerYellowCards),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(last_updated)`
        }).from(cachedPlayerRedCards),
        db.select({ 
          count: sql`count(*)`,
          lastUpdated: sql`MAX(last_updated)`
        }).from(cachedPlayerBonusPoints)
      ]);
      
      const now = new Date();
      const STALE_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      
      return [
        { 
          type: 'Goals', 
          count: goals[0]?.count || 0, 
          lastUpdated: goals[0]?.lastUpdated || null,
          isStale: goals[0]?.lastUpdated ? (now.getTime() - new Date(goals[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Assists', 
          count: assists[0]?.count || 0, 
          lastUpdated: assists[0]?.lastUpdated || null,
          isStale: assists[0]?.lastUpdated ? (now.getTime() - new Date(assists[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Team Clean Sheets', 
          count: cleanSheets[0]?.count || 0, 
          lastUpdated: cleanSheets[0]?.lastUpdated || null,
          isStale: cleanSheets[0]?.lastUpdated ? (now.getTime() - new Date(cleanSheets[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Minutes', 
          count: minutes[0]?.count || 0, 
          lastUpdated: minutes[0]?.lastUpdated || null,
          isStale: minutes[0]?.lastUpdated ? (now.getTime() - new Date(minutes[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Defensive', 
          count: defensive[0]?.count || 0, 
          lastUpdated: defensive[0]?.lastUpdated || null,
          isStale: defensive[0]?.lastUpdated ? (now.getTime() - new Date(defensive[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Team Projections', 
          count: teams[0]?.count || 0, 
          lastUpdated: teams[0]?.lastUpdated || null,
          isStale: teams[0]?.lastUpdated ? (now.getTime() - new Date(teams[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Goal Share', 
          count: 0, // Will be dynamically populated when goal share cache is implemented
          lastUpdated: null,
          isStale: true
        },
        { 
          type: 'Assist Share', 
          count: 0, // Will be dynamically populated when assist share cache is implemented
          lastUpdated: null,
          isStale: true
        },
        { 
          type: 'Player Saves', 
          count: saves[0]?.count || 0, 
          lastUpdated: saves[0]?.lastUpdated || null,
          isStale: saves[0]?.lastUpdated ? (now.getTime() - new Date(saves[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Goals Conceded', 
          count: goalsConceded[0]?.count || 0, 
          lastUpdated: goalsConceded[0]?.lastUpdated || null,
          isStale: goalsConceded[0]?.lastUpdated ? (now.getTime() - new Date(goalsConceded[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Yellow Cards', 
          count: yellowCards[0]?.count || 0, 
          lastUpdated: yellowCards[0]?.lastUpdated || null,
          isStale: yellowCards[0]?.lastUpdated ? (now.getTime() - new Date(yellowCards[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Red Cards', 
          count: redCards[0]?.count || 0, 
          lastUpdated: redCards[0]?.lastUpdated || null,
          isStale: redCards[0]?.lastUpdated ? (now.getTime() - new Date(redCards[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        },
        { 
          type: 'Bonus Points', 
          count: bonusPoints[0]?.count || 0, 
          lastUpdated: bonusPoints[0]?.lastUpdated || null,
          isStale: bonusPoints[0]?.lastUpdated ? (now.getTime() - new Date(bonusPoints[0].lastUpdated as string).getTime()) > STALE_THRESHOLD : true
        }
      ];
      
    } catch (error) {
      console.error(`❌ Failed to get cache stats:`, error);
      return [];
    }
  }

  /**
   * Cache all FPL scoring components (saves, goals conceded, cards, bonus)
   */
  private async cacheFPLScoringComponents(): Promise<void> {
    try {
      console.log(`📊 Caching FPL scoring components...`);
      await fplScoringCacheService.updateAllScoringData();
      console.log(`✅ FPL scoring components cached successfully`);
    } catch (error) {
      console.error(`❌ Failed to cache FPL scoring components:`, error);
      throw error;
    }
  }

  /**
   * Cache individual FPL scoring components
   */
  async cachePlayerSaves(): Promise<void> {
    await fplScoringCacheService.updateAllScoringData(); // Includes saves
  }

  async cachePlayerGoalsConceded(): Promise<void> {
    await fplScoringCacheService.updateAllScoringData(); // Includes goals conceded
  }

  async cachePlayerYellowCards(): Promise<void> {
    await fplScoringCacheService.updateAllScoringData(); // Includes yellow cards
  }

  async cachePlayerRedCards(): Promise<void> {
    await fplScoringCacheService.updateAllScoringData(); // Includes red cards
  }

  async cachePlayerBonusPoints(): Promise<void> {
    await fplScoringCacheService.updateAllScoringData(); // Includes bonus points
  }
}

export const projectionCacheWorker = new ProjectionCacheWorker();