import { type BootstrapData, type PlayerSummary, type WatchlistEntry, type InsertWatchlistEntry, type PriceAlert, type InsertPriceAlert } from "@shared/schema";
import { type HistoricalPlayer, type InsertHistoricalPlayer, historicalPlayers } from "@shared/watchlist-schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getBootstrapData(): Promise<BootstrapData | undefined>;
  setBootstrapData(data: BootstrapData): Promise<void>;
  getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined>;
  setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void>;
  
  // Watchlist operations
  getWatchlistEntries(): Promise<WatchlistEntry[]>;
  addWatchlistEntry(entry: InsertWatchlistEntry): Promise<WatchlistEntry>;
  deleteWatchlistEntry(id: number): Promise<void>;
  updateWatchlistEntry(id: number, entry: Partial<InsertWatchlistEntry>): Promise<WatchlistEntry>;
  
  // Price alert operations
  getPriceAlerts(): Promise<PriceAlert[]>;
  addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  
  // Price change tracking operations (for future implementation)
  getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined>;
  setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void>;
  
  // Daily price tracking methods
  saveDailyPriceData(data: any[]): Promise<void>;
  getLatestPriceData(playerId: number): Promise<any | null>;
  getBatchLatestPriceData(playerIds: number[]): Promise<Map<number, any>>;
  getDailyPriceHistory(playerId: number, days?: number): Promise<any[]>;
  
  // Historical player operations
  getHistoricalPlayers(season: string): Promise<HistoricalPlayer[]>;
  insertHistoricalPlayers(players: InsertHistoricalPlayer[]): Promise<void>;
  hasHistoricalData(season: string): Promise<boolean>;
  getSeasons(): Promise<string[]>;
  
  // Manager ID caching operations
  getLastManagerId(): Promise<string | undefined>;
  setLastManagerId(managerId: string): Promise<void>;
  
  // Upset configuration operations
  getUpsetConfig(): Promise<UpsetConfig | undefined>;
  setUpsetConfig(config: UpsetConfig): Promise<void>;
}

export interface UpsetConfig {
  // Enable/disable options
  enableControlledVariance: boolean;        // Option 2
  enableContextUpsets: boolean;             // Option 3
  enableSmartRounding: boolean;             // Option 4
  enableSeasonUpsetBudget: boolean;         // Option 5
  enablePoissonDistribution: boolean;       // Option 1
  
  // Option 2: Controlled Variance settings
  varianceMin: number;                      // Default: 0.8
  varianceMax: number;                      // Default: 1.2
  
  // Option 3: Context-based upsets settings
  giantKillingBoost: number;                // Default: 0.15 (+15%)
  pressurePenalty: number;                  // Default: 0.1 (-10%)
  pressureChance: number;                   // Default: 0.2 (20% chance)
  derbyVarianceBoost: number;               // Default: 0.3 (+30% extra variance)
  derbyChance: number;                      // Default: 0.15 (15% chance)
  topTeamIds: number[];                     // Default: [1, 7, 12, 13, 15, 18]
  
  // Option 4: Smart Rounding settings
  upsetRoundingChance: number;              // Default: 0.15 (15% chance)
  
  // Option 5: Season Upset Budget settings
  upsetBudgetChance: number;                // Default: 0.05 (5% chance)
  upsetBudgetMin: number;                   // Default: 0.5
  upsetBudgetMax: number;                   // Default: 1.5
  
  // Option 1: Poisson Distribution settings
  poissonChance: number;                    // Default: 0.7 (70% chance vs 30% smart rounding)
}

export class MemStorage implements IStorage {
  private bootstrapData: BootstrapData | undefined;
  private playerSummaries: Map<number, PlayerSummary>;
  private watchlistEntries: Map<number, WatchlistEntry>;
  private priceAlerts: Map<number, PriceAlert>;
  private priceChangeHistory: Map<string, { playerId: number; changeAmount: number; date: string; }>;
  private historicalPlayerCache: Map<string, HistoricalPlayer[]>;
  private lastManagerId: string | undefined;
  private upsetConfig: UpsetConfig | undefined;
  private nextWatchlistId: number;
  private nextAlertId: number;

  constructor() {
    this.playerSummaries = new Map();
    this.watchlistEntries = new Map();
    this.priceAlerts = new Map();
    this.priceChangeHistory = new Map();
    this.historicalPlayerCache = new Map();
    this.nextWatchlistId = 1;
    this.nextAlertId = 1;
  }

  async getBootstrapData(): Promise<BootstrapData | undefined> {
    return this.bootstrapData;
  }

  async setBootstrapData(data: BootstrapData): Promise<void> {
    this.bootstrapData = data;
  }

  async getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined> {
    return this.playerSummaries.get(playerId);
  }

  async setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void> {
    this.playerSummaries.set(playerId, data);
  }

  // Watchlist operations
  async getWatchlistEntries(): Promise<WatchlistEntry[]> {
    return Array.from(this.watchlistEntries.values());
  }

  async addWatchlistEntry(entry: InsertWatchlistEntry): Promise<WatchlistEntry> {
    const id = this.nextWatchlistId++;
    const now = new Date();
    const watchlistEntry: WatchlistEntry = {
      id,
      ...entry,
      targetPrice: entry.targetPrice ?? null,
      alertOnRise: entry.alertOnRise ?? null,
      alertOnFall: entry.alertOnFall ?? null,
      notes: entry.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.watchlistEntries.set(id, watchlistEntry);
    return watchlistEntry;
  }

  async deleteWatchlistEntry(id: number): Promise<void> {
    this.watchlistEntries.delete(id);
  }

  async updateWatchlistEntry(id: number, entry: Partial<InsertWatchlistEntry>): Promise<WatchlistEntry> {
    const existing = this.watchlistEntries.get(id);
    if (!existing) {
      throw new Error(`Watchlist entry with id ${id} not found`);
    }
    const updated: WatchlistEntry = {
      ...existing,
      ...entry,
      updatedAt: new Date(),
    };
    this.watchlistEntries.set(id, updated);
    return updated;
  }

  // Price alert operations
  async getPriceAlerts(): Promise<PriceAlert[]> {
    return Array.from(this.priceAlerts.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const id = this.nextAlertId++;
    const priceAlert: PriceAlert = {
      id,
      ...alert,
      alertTriggered: alert.alertTriggered ?? null,
      createdAt: new Date(),
    };
    this.priceAlerts.set(id, priceAlert);
    return priceAlert;
  }

  // Price change tracking operations
  async getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined> {
    const key = `${playerId}-${changeAmount}`;
    return this.priceChangeHistory.get(key);
  }

  async setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void> {
    const key = `${playerId}-${changeAmount}`;
    this.priceChangeHistory.set(key, { playerId, changeAmount, date });
  }

  // Historical player operations (in-memory fallback - will use database when available)
  async getHistoricalPlayers(season: string): Promise<HistoricalPlayer[]> {
    return this.historicalPlayerCache.get(season) || [];
  }

  async insertHistoricalPlayers(players: InsertHistoricalPlayer[]): Promise<void> {
    // Group by season for cache storage
    const byseason = players.reduce((acc, player) => {
      if (!acc[player.season!]) acc[player.season!] = [];
      acc[player.season!].push(player as HistoricalPlayer);
      return acc;
    }, {} as Record<string, HistoricalPlayer[]>);

    Object.entries(byseason).forEach(([season, seasonPlayers]) => {
      this.historicalPlayerCache.set(season, seasonPlayers);
    });
  }

  async hasHistoricalData(season: string): Promise<boolean> {
    return this.historicalPlayerCache.has(season);
  }

  async getSeasons(): Promise<string[]> {
    return Array.from(this.historicalPlayerCache.keys());
  }

  // Manager ID caching operations
  async getLastManagerId(): Promise<string | undefined> {
    return this.lastManagerId;
  }

  async setLastManagerId(managerId: string): Promise<void> {
    this.lastManagerId = managerId;
  }
  
  async getUpsetConfig(): Promise<UpsetConfig | undefined> {
    return this.upsetConfig;
  }
  
  async setUpsetConfig(config: UpsetConfig): Promise<void> {
    this.upsetConfig = config;
  }

  // Daily price tracking methods
  async saveDailyPriceData(data: any[]): Promise<void> {
    // Memory implementation - not persistent
    console.log(`Saved ${data.length} daily price records`);
  }

  async getLatestPriceData(playerId: number): Promise<any | null> {
    // Memory implementation - return null
    return null;
  }

  async getBatchLatestPriceData(playerIds: number[]): Promise<Map<number, any>> {
    // Memory implementation - return empty map
    return new Map();
  }

  async getDailyPriceHistory(playerId: number, days: number = 30): Promise<any[]> {
    // Memory implementation - return empty array
    return [];
  }
}

// Database-backed storage with fallback to memory storage
export class DatabaseStorage implements IStorage {
  private memFallback: MemStorage;

  constructor() {
    this.memFallback = new MemStorage();
  }

  // Bootstrap data methods (keep using memory for fast access)
  async getBootstrapData(): Promise<BootstrapData | undefined> {
    return this.memFallback.getBootstrapData();
  }

  async setBootstrapData(data: BootstrapData): Promise<void> {
    return this.memFallback.setBootstrapData(data);
  }

  // Player summary methods (keep using memory for fast access)
  async getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined> {
    return this.memFallback.getPlayerSummary(playerId);
  }

  async setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void> {
    return this.memFallback.setPlayerSummary(playerId, data);
  }

  // Watchlist methods (keep using memory for simplicity)
  async getWatchlistEntries(): Promise<WatchlistEntry[]> {
    return this.memFallback.getWatchlistEntries();
  }

  async addWatchlistEntry(entry: InsertWatchlistEntry): Promise<WatchlistEntry> {
    return this.memFallback.addWatchlistEntry(entry);
  }

  async deleteWatchlistEntry(id: number): Promise<void> {
    return this.memFallback.deleteWatchlistEntry(id);
  }

  async updateWatchlistEntry(id: number, entry: Partial<InsertWatchlistEntry>): Promise<WatchlistEntry> {
    return this.memFallback.updateWatchlistEntry(id, entry);
  }

  // Price alert methods (keep using memory for simplicity)
  async getPriceAlerts(): Promise<PriceAlert[]> {
    return this.memFallback.getPriceAlerts();
  }

  async addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    return this.memFallback.addPriceAlert(alert);
  }

  // Price change methods (keep using memory for simplicity)
  async getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined> {
    return this.memFallback.getPriceChange(playerId, changeAmount);
  }

  async setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void> {
    return this.memFallback.setPriceChange(playerId, changeAmount, date);
  }

  // Historical player methods (use database for persistence)
  async getHistoricalPlayers(season: string): Promise<HistoricalPlayer[]> {
    try {
      console.log(`🔍 Checking database for ${season} data...`);
      const dbPlayers = await db
        .select()
        .from(historicalPlayers)
        .where(eq(historicalPlayers.season, season))
        .orderBy(sql`${historicalPlayers.totalPoints} DESC`);
      
      if (dbPlayers.length > 0) {
        console.log(`✅ Found ${dbPlayers.length} players in database for ${season}`);
        
        // Convert database format to API format for compatibility
        return dbPlayers.map(player => ({
          ...player,
          // Keep the string ID as required by the schema
          id: player.id, // This is already a string from the schema
          playerId: player.playerId,
          first_name: player.firstName,
          second_name: player.secondName,
          web_name: player.webName,
          team_name: player.teamName,
          team_short_name: player.teamShortName,
          position: player.positionName,
          season_name: player.seasonName,
          element_code: player.elementCode,
          start_cost: player.startCost,
          end_cost: player.endCost,
          total_points: player.totalPoints,
          minutes: player.minutes,
          goals_scored: player.goalsScored,
          assists: player.assists,
          clean_sheets: player.cleanSheets,
          goals_conceded: player.goalsConceded,
          own_goals: player.ownGoals,
          penalties_saved: player.penaltiesSaved,
          penalties_missed: player.penaltiesMissed,
          yellow_cards: player.yellowCards,
          red_cards: player.redCards,
          saves: player.saves,
          bonus: player.bonus,
          bps: player.bps,
          influence: player.influence,
          creativity: player.creativity,
          threat: player.threat,
          ict_index: player.ictIndex,
          // Computed fields for frontend
          now_cost: player.endCost || 0,
          form: ((player.totalPoints || 0) / 38).toFixed(1),
          points_per_game: ((player.totalPoints || 0) / Math.max((player.minutes || 0) / 90, 1)).toFixed(1),
          selected_by_percent: "0.0",
          value_season: ((player.totalPoints || 0) / ((player.endCost || 1) / 10)).toFixed(1),
          value_form: ((player.totalPoints || 0) / ((player.endCost || 1) / 10)).toFixed(1),
          element_type: player.positionName === 'Goalkeeper' ? 1 : 
                       player.positionName === 'Defender' ? 2 : 
                       player.positionName === 'Midfielder' ? 3 : 4,
          team_id: 1 // Default team ID
        }));
      }
      
      console.log(`❌ No data found in database for ${season}`);
      return [];
    } catch (error) {
      console.warn('Database fetch failed, using memory fallback:', error);
      return this.memFallback.getHistoricalPlayers(season);
    }
  }

  async insertHistoricalPlayers(players: InsertHistoricalPlayer[]): Promise<void> {
    try {
      if (players.length === 0) return;
      
      console.log(`💾 Inserting ${players.length} players into database...`);
      
      // Insert into database with conflict resolution
      await db.insert(historicalPlayers)
        .values(players)
        .onConflictDoNothing();
        
      console.log(`✅ Successfully stored ${players.length} players in database`);
      
      // Also cache in memory for immediate use
      await this.memFallback.insertHistoricalPlayers(players);
    } catch (error) {
      console.error('Failed to store historical data in database:', error);
      // Still try to store in memory as fallback
      await this.memFallback.insertHistoricalPlayers(players);
    }
  }

  async hasHistoricalData(season: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(historicalPlayers)
        .where(eq(historicalPlayers.season, season));
      
      const hasData = result.count > 0;
      console.log(`🔍 Database check for ${season}: ${hasData ? `${result.count} records` : 'no data'}`);
      return hasData;
    } catch (error) {
      console.warn('Database check failed, using memory fallback:', error);
      return this.memFallback.hasHistoricalData(season);
    }
  }

  async getSeasons(): Promise<string[]> {
    try {
      const seasons = await db
        .selectDistinct({ season: historicalPlayers.season })
        .from(historicalPlayers)
        .orderBy(historicalPlayers.season);
      
      return seasons.map(s => s.season).filter(Boolean);
    } catch (error) {
      console.warn('Database seasons fetch failed, using memory fallback:', error);
      return this.memFallback.getSeasons();
    }
  }

  // Manager ID caching operations (delegate to memory for simplicity)
  async getLastManagerId(): Promise<string | undefined> {
    return this.memFallback.getLastManagerId();
  }

  async setLastManagerId(managerId: string): Promise<void> {
    return this.memFallback.setLastManagerId(managerId);
  }
  
  async getUpsetConfig(): Promise<UpsetConfig | undefined> {
    return this.memFallback.getUpsetConfig();
  }
  
  async setUpsetConfig(config: UpsetConfig): Promise<void> {
    return this.memFallback.setUpsetConfig(config);
  }

  // Daily price tracking methods (use database for persistence)
  async saveDailyPriceData(data: any[]): Promise<void> {
    try {
      const { dailyPlayerPrices } = await import("@shared/schema");
      await db.insert(dailyPlayerPrices).values(data).onConflictDoNothing();
      console.log(`Saved ${data.length} daily price records to database`);
    } catch (error) {
      console.error("Error saving daily price data:", error);
      // Fallback to memory storage
      return this.memFallback.saveDailyPriceData(data);
    }
  }

  async getLatestPriceData(playerId: number): Promise<any | null> {
    try {
      const { dailyPlayerPrices } = await import("@shared/schema");
      const [latest] = await db
        .select()
        .from(dailyPlayerPrices)
        .where(eq(dailyPlayerPrices.playerId, playerId))
        .orderBy(sql`${dailyPlayerPrices.recordDate} DESC`)
        .limit(1);
      return latest || null;
    } catch (error) {
      console.error("Error getting latest price data:", error);
      return this.memFallback.getLatestPriceData(playerId);
    }
  }

  async getBatchLatestPriceData(playerIds: number[]): Promise<Map<number, any>> {
    try {
      if (playerIds.length === 0) return new Map();
      
      const { dailyPlayerPrices } = await import("@shared/schema");
      
      // Use a more efficient query to get the latest record for each player
      const latestRecords = await db
        .select()
        .from(dailyPlayerPrices)
        .where(sql`${dailyPlayerPrices.playerId} IN (${playerIds.join(',')})`);
      
      // Group by playerId and get the latest for each
      const resultMap = new Map<number, any>();
      const playerRecords = new Map<number, any[]>();
      
      // Group records by player
      latestRecords.forEach(record => {
        if (!playerRecords.has(record.playerId)) {
          playerRecords.set(record.playerId, []);
        }
        playerRecords.get(record.playerId)!.push(record);
      });
      
      // Get the latest record for each player
      playerRecords.forEach((records, playerId) => {
        const latest = records.sort((a, b) => 
          new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
        )[0];
        resultMap.set(playerId, latest);
      });
      
      return resultMap;
    } catch (error) {
      console.error("Error getting batch latest price data:", error);
      return this.memFallback.getBatchLatestPriceData(playerIds);
    }
  }

  async getDailyPriceHistory(playerId: number, days: number = 30): Promise<any[]> {
    try {
      const { dailyPlayerPrices } = await import("@shared/schema");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const history = await db
        .select()
        .from(dailyPlayerPrices)
        .where(eq(dailyPlayerPrices.playerId, playerId))
        .orderBy(sql`${dailyPlayerPrices.recordDate} DESC`)
        .limit(days);
      
      return history;
    } catch (error) {
      console.error("Error getting daily price history:", error);
      return this.memFallback.getDailyPriceHistory(playerId, days);
    }
  }
}

// Use database-backed storage with memory fallback
export const storage = new DatabaseStorage();
