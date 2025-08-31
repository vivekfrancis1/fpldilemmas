import { db } from "./db";
import { 
  playerGoalsProjections, 
  playerAssistProjections, 
  teamCleanSheetProjections, 
  playerMinutesProjections, 
  playerDefensiveProjections 
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

interface ProjectionData {
  playerId: number;
  gameweekProjections: Record<string, any>;
  [key: string]: any;
}

class ProjectionCacheWorker {
  private readonly BATCH_SIZE = 50;
  
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
        this.cacheDefensiveProjections()
      ]);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Projection cache update completed: ${successful} successful, ${failed} failed (${duration}ms)`);
      
      if (failed > 0) {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const types = ['Goals', 'Assists', 'Clean Sheets', 'Minutes', 'Defensive'];
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
      const response = await fetch('http://localhost:5000/api/player-goals-scored-projections');
      
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
      const response = await fetch('http://localhost:5000/api/player-assist-projections?startGameweek=4&endGameweek=9');
      
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
      
      // Get team projections from Team Goal/CS Projections API
      const response = await fetch('http://localhost:5000/api/team-projections?startGameweek=4&endGameweek=9');
      if (!response.ok) {
        console.log(`Team projections API not available, using bootstrap data for basic clean sheet estimates`);
        return;
      }
      
      const teamData = await response.json();
      console.log(`📥 Retrieved ${teamData.length} team projections`);
      
      // Clear existing data for this season
      await db.delete(teamCleanSheetProjections)
        .where(eq(teamCleanSheetProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const team of teamData) {
        if (team.cleanSheetProjections) {
          for (let gw = 4; gw <= 9; gw++) {
            const cleanSheetProbability = team.cleanSheetProjections[`gw${gw}`] || 0;
            if (cleanSheetProbability > 0) {
              records.push({
                teamId: team.teamId,
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
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        await db.insert(teamCleanSheetProjections).values(batch);
      }
      
      console.log(`✅ Team clean sheet projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache clean sheet projections:`, error);
      throw error;
    }
  }
  
  /**
   * Cache minutes projections from Player Projections API
   */
  private async cacheMinutesProjections(): Promise<void> {
    try {
      console.log(`📊 Caching minutes projections...`);
      const response = await fetch('http://localhost:5000/api/player-projections?startGameweek=4&endGameweek=9');
      
      if (!response.ok) {
        throw new Error(`Player Projections API returned ${response.status}`);
      }
      
      const data: any[] = await response.json();
      console.log(`📥 Retrieved ${data.length} player projections`);
      
      // Clear existing data for this season
      await db.delete(playerMinutesProjections)
        .where(eq(playerMinutesProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const player of data) {
        if (player.projections) {
          for (let gw = 4; gw <= 9; gw++) {
            const gwData = player.projections[`gw${gw}`];
            const minutes = gwData?.minutes || 0;
            if (minutes > 0) {
              records.push({
                playerId: player.playerId,
                gameweek: gw,
                season: '2025/26',
                minutes: Number(minutes),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        await db.insert(playerMinutesProjections).values(batch);
        console.log(`📊 Inserted minutes batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(records.length / this.BATCH_SIZE)}`);
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
      const response = await fetch('http://localhost:5000/api/defensive-contribution-projections?startGameweek=4&endGameweek=9');
      
      if (!response.ok) {
        throw new Error(`Defensive API returned ${response.status}`);
      }
      
      const data: ProjectionData[] = await response.json();
      console.log(`📥 Retrieved ${data.length} defensive projections`);
      
      // Clear existing data for this season
      await db.delete(playerDefensiveProjections)
        .where(eq(playerDefensiveProjections.season, '2025/26'));
      
      // Prepare records for batch insert
      const records = [];
      for (const player of data) {
        if (player.gameweekProjections || player.pointsProjections) {
          for (let gw = 4; gw <= 9; gw++) {
            const defensiveContribution = player.gameweekProjections?.[gw] || player.gameweekProjections?.[`gw${gw}`] || 0;
            const points = player.pointsProjections?.[`gw${gw}`] || 0;
            
            if (defensiveContribution > 0 || points > 0) {
              records.push({
                playerId: player.playerId,
                gameweek: gw,
                season: '2025/26',
                defensiveContribution: Number(defensiveContribution),
                points: Number(points),
                calculatedAt: new Date()
              });
            }
          }
        }
      }
      
      // Insert in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        await db.insert(playerDefensiveProjections).values(batch);
        console.log(`📊 Inserted defensive batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(records.length / this.BATCH_SIZE)}`);
      }
      
      console.log(`✅ Defensive projections cached successfully (${records.length} records)`);
      
    } catch (error) {
      console.error(`❌ Failed to cache defensive projections:`, error);
      throw error;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const stats = await Promise.all([
        db.select().from(playerGoalsProjections).then(r => ({ type: 'Goals', count: r.length })),
        db.select().from(playerAssistProjections).then(r => ({ type: 'Assists', count: r.length })),
        db.select().from(teamCleanSheetProjections).then(r => ({ type: 'Team Clean Sheets', count: r.length })),
        db.select().from(playerMinutesProjections).then(r => ({ type: 'Minutes', count: r.length })),
        db.select().from(playerDefensiveProjections).then(r => ({ type: 'Defensive', count: r.length }))
      ]);
      
      return stats;
      
    } catch (error) {
      console.error(`❌ Failed to get cache stats:`, error);
      return [];
    }
  }
}

export const projectionCacheWorker = new ProjectionCacheWorker();