import { db } from "./db";
import { teamProjectionsDaily, goalShareDaily, assistShareDaily } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getNextGameweeksList, debugGameweekCalculation, type GameweekEvent } from "@shared/gameweek-utils";

/**
 * Daily Projections Job - Calculates and stores projections in database
 * Runs daily at 3 AM to pre-calculate data for ultra-fast API responses
 */

const INTERNAL_API_BASE = 'http://localhost:5000';

export class DailyProjectionsService {
  
  /**
   * Fetch bootstrap data for gameweek calculations
   */
  private async fetchBootstrapData(): Promise<GameweekEvent[]> {
    try {
      const response = await fetch(`${INTERNAL_API_BASE}/api/bootstrap-static`);
      if (!response.ok) {
        throw new Error(`Bootstrap API failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('❌ Failed to fetch bootstrap data:', error);
      // Return fallback gameweeks if bootstrap fails
      return Array.from({ length: 38 }, (_, i) => ({
        id: i + 1,
        deadline_time: new Date().toISOString(),
        finished: i < 4, // Assume first 4 are finished as fallback
        is_current: i === 4
      }));
    }
  }

  /**
   * Main job entry point - calculates and stores all daily projections
   */
  async runDailyCalculations(): Promise<void> {
    console.log('🚀 Starting daily projections calculation...');
    const startTime = Date.now();
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Clear old data (keep last 7 days for comparison)
      await this.cleanupOldData(7);
      
      // Calculate and store team projections
      await this.calculateTeamProjections(today);
      
      // Calculate and store goal shares
      await this.calculateGoalShares(today);
      
      // Calculate and store assist shares
      await this.calculateAssistShares(today);
      
      // Warm up in-memory caches for player projections (instant access)
      await this.warmPlayerProjectionCaches();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Daily projections completed successfully in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Daily projections failed:', error);
      throw error;
    }
  }

  /**
   * Calculate team projections for next 6 gameweeks and store in database
   */
  private async calculateTeamProjections(date: string): Promise<void> {
    console.log('📊 Calculating team projections...');
    
    try {
      // Fetch bootstrap data for dynamic gameweek calculation
      const events = await this.fetchBootstrapData();
      debugGameweekCalculation(events);
      
      // Calculate next 6 gameweeks dynamically
      const nextGameweeks = getNextGameweeksList(events, 6);
      console.log(`🎯 Using dynamic gameweeks: ${nextGameweeks.join(', ')}`);
      
      // Get team projections from existing API
      const response = await fetch(`${INTERNAL_API_BASE}/api/team-goal-projections`);
      if (!response.ok) {
        throw new Error(`Team projections API failed: ${response.status}`);
      }
      
      const teamData = await response.json();
      
      // Transform and store data with dynamic gameweeks
      const records = teamData.map((team: any) => ({
        calculationDate: date,
        teamId: team.teamId,
        gameweeks: JSON.stringify(nextGameweeks), // Dynamic next 6 gameweeks
        homeGoals: team.homeGoals?.toString() || '0',
        awayGoals: team.awayGoals?.toString() || '0'
      }));
      
      // Batch insert team projections
      if (records.length > 0) {
        await db.insert(teamProjectionsDaily).values(records);
        console.log(`✅ Stored ${records.length} team projections`);
      }
      
    } catch (error) {
      console.error('❌ Team projections calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate goal shares for all teams and store in database
   */
  private async calculateGoalShares(date: string): Promise<void> {
    console.log('⚽ Calculating goal shares...');
    
    try {
      // Get goal share data from existing API
      const response = await fetch(`${INTERNAL_API_BASE}/api/goal-share-season`);
      if (!response.ok) {
        throw new Error(`Goal share API failed: ${response.status}`);
      }
      
      const goalShareData = await response.json();
      
      // Transform data for database storage
      const records: any[] = [];
      goalShareData.forEach((item: any) => {
        if (item.players && Array.isArray(item.players)) {
          item.players.forEach((player: any) => {
            records.push({
              calculationDate: date,
              teamId: item.teamId,
              playerId: player.playerId,
              playerName: player.playerName,
              goalSharePercentage: player.goalShare?.toString() || '0',
              expectedGoals: player.expectedGoals?.toString() || '0'
            });
          });
        }
      });
      
      // Batch insert goal shares
      if (records.length > 0) {
        await db.insert(goalShareDaily).values(records);
        console.log(`✅ Stored ${records.length} goal share records`);
      }
      
    } catch (error) {
      console.error('❌ Goal share calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate assist shares for all teams and store in database
   */
  private async calculateAssistShares(date: string): Promise<void> {
    console.log('🎯 Calculating assist shares...');
    
    try {
      // Get assist share data from existing API
      const response = await fetch(`${INTERNAL_API_BASE}/api/assist-share-season`);
      if (!response.ok) {
        throw new Error(`Assist share API failed: ${response.status}`);
      }
      
      const assistShareData = await response.json();
      
      // Transform data for database storage
      const records: any[] = [];
      assistShareData.forEach((item: any) => {
        if (item.players && Array.isArray(item.players)) {
          item.players.forEach((player: any) => {
            records.push({
              calculationDate: date,
              teamId: item.teamId,
              playerId: player.playerId,
              playerName: player.playerName,
              assistSharePercentage: player.assistShare?.toString() || '0',
              expectedAssists: player.expectedAssists?.toString() || '0'
            });
          });
        }
      });
      
      // Batch insert assist shares
      if (records.length > 0) {
        await db.insert(assistShareDaily).values(records);
        console.log(`✅ Stored ${records.length} assist share records`);
      }
      
    } catch (error) {
      console.error('❌ Assist share calculation failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old calculation data to prevent database bloat
   */
  private async cleanupOldData(daysToKeep: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    
    try {
      // Delete old team projections
      await db.delete(teamProjectionsDaily)
        .where(eq(teamProjectionsDaily.calculationDate, cutoffString));
      
      // Delete old goal shares
      await db.delete(goalShareDaily)
        .where(eq(goalShareDaily.calculationDate, cutoffString));
      
      // Delete old assist shares
      await db.delete(assistShareDaily)
        .where(eq(assistShareDaily.calculationDate, cutoffString));
      
      console.log(`🗑️ Cleaned up data older than ${daysToKeep} days`);
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // Don't throw - cleanup failure shouldn't stop calculations
    }
  }

  /**
   * Get team projections from database (fast query)
   */
  async getTeamProjectionsFromDB(date?: string): Promise<any[]> {
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const results = await db.select()
      .from(teamProjectionsDaily)
      .where(eq(teamProjectionsDaily.calculationDate, queryDate));
    
    return results.map(row => ({
      id: row.teamId,
      teamId: row.teamId,
      gameweeks: JSON.parse(row.gameweeks || '[]'),
      homeGoals: parseFloat(row.homeGoals || '0'),
      awayGoals: parseFloat(row.awayGoals || '0'),
      calculationDate: row.calculationDate
    }));
  }

  /**
   * Get goal shares from database (fast query)
   */
  async getGoalShareFromDB(date?: string): Promise<any[]> {
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const results = await db.select()
      .from(goalShareDaily)
      .where(eq(goalShareDaily.calculationDate, queryDate));
    
    // Group by team
    const teamGroups = results.reduce((acc: any, row: any) => {
      const teamId = row.teamId;
      if (!acc[teamId]) {
        acc[teamId] = {
          teamId: teamId,
          players: []
        };
      }
      acc[teamId].players.push({
        playerId: row.playerId,
        playerName: row.playerName,
        goalShare: parseFloat(row.goalSharePercentage || '0'),
        expectedGoals: parseFloat(row.expectedGoals || '0')
      });
      return acc;
    }, {});
    
    return Object.values(teamGroups);
  }

  /**
   * Get assist shares from database (fast query)
   */
  async getAssistShareFromDB(date?: string): Promise<any[]> {
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const results = await db.select()
      .from(assistShareDaily)
      .where(eq(assistShareDaily.calculationDate, queryDate));
    
    // Group by team
    const teamGroups = results.reduce((acc: any, row: any) => {
      const teamId = row.teamId;
      if (!acc[teamId]) {
        acc[teamId] = {
          teamId: teamId,
          players: []
        };
      }
      acc[teamId].players.push({
        id: row.playerId,           // Fix: Use 'id' instead of 'playerId'
        name: row.playerName,       // Fix: Use 'name' instead of 'playerName'
        playerId: row.playerId,     // Keep for compatibility
        playerName: row.playerName, // Keep for compatibility
        assistShare: parseFloat(row.assistSharePercentage || '0'),
        expectedAssists: parseFloat(row.expectedAssists || '0')
      });
      return acc;
    }, {});
    
    return Object.values(teamGroups);
  }

  /**
   * Warm up in-memory caches for player projections
   * This ensures instant access for the most commonly used cached endpoints
   */
  private async warmPlayerProjectionCaches(): Promise<void> {
    console.log('🔥 Warming up in-memory player projection caches...');
    
    try {
      // Warm player total points cache (most important - used by many tools)
      console.log('📊 Warming player total points cache...');
      const totalPointsResponse = await fetch(`${INTERNAL_API_BASE}/api/cached/player-total-points`);
      if (totalPointsResponse.ok) {
        await totalPointsResponse.json(); // This populates the cache
        console.log('✅ Player total points cache warmed');
      }
      
      // Warm player saves cache
      console.log('🧤 Warming player saves cache...');
      const savesResponse = await fetch(`${INTERNAL_API_BASE}/api/cached/player-saves-projections`);
      if (savesResponse.ok) {
        await savesResponse.json();
        console.log('✅ Player saves cache warmed');
      }
      
      // Warm player yellow cards cache
      console.log('🟨 Warming player yellow cards cache...');
      const yellowCardsResponse = await fetch(`${INTERNAL_API_BASE}/api/cached/player-yellow-cards-projections`);
      if (yellowCardsResponse.ok) {
        await yellowCardsResponse.json();
        console.log('✅ Player yellow cards cache warmed');
      }
      
      // Warm player red cards cache
      console.log('🟥 Warming player red cards cache...');
      const redCardsResponse = await fetch(`${INTERNAL_API_BASE}/api/cached/player-red-cards-projections`);
      if (redCardsResponse.ok) {
        await redCardsResponse.json();
        console.log('✅ Player red cards cache warmed');
      }
      
      console.log('✅ All player projection caches warmed successfully');
      
    } catch (error) {
      console.error('❌ Failed to warm player projection caches:', error);
      // Don't throw - cache warming failure shouldn't stop other calculations
    }
  }
}

// Singleton instance
export const dailyProjectionsService = new DailyProjectionsService();