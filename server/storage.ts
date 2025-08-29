import { type BootstrapData, type PlayerSummary, type WatchlistEntry, type InsertWatchlistEntry, type PriceAlert, type InsertPriceAlert, type PlayerMapping, type InsertPlayerMapping, type FplContentCreator, type InsertFplContentCreator, type FplCreatorTracking, type InsertFplCreatorTracking, type PriceChange, type InsertPriceChange, fplContentCreators, fplCreatorTracking, priceChanges } from "@shared/schema";
import { type HistoricalPlayer, type InsertHistoricalPlayer, historicalPlayers } from "@shared/watchlist-schema";
import { db } from "./db";
import { eq, sql, inArray, desc } from "drizzle-orm";

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
  getLastPriceChangeDate(playerId: number, currentPrice: number): Promise<string | null>;
  getBatchPriceChangeDates(playerPrices: Array<{playerId: number, currentPrice: number}>): Promise<Map<number, string>>;
  
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
  
  // Player mappings operations (stable data only)
  getPlayerMappings(): Promise<PlayerMapping[]>;
  upsertPlayerMappings(players: InsertPlayerMapping[]): Promise<void>;
  getPlayerMappingById(playerId: number): Promise<PlayerMapping | undefined>;
  
  // FPL Content Creators operations
  getContentCreators(): Promise<FplContentCreator[]>;
  getContentCreatorById(id: number): Promise<FplContentCreator | undefined>;
  addContentCreator(creator: InsertFplContentCreator): Promise<FplContentCreator>;
  updateContentCreator(id: number, updates: Partial<InsertFplContentCreator>): Promise<FplContentCreator>;
  deleteContentCreator(id: number): Promise<void>;
  clearContentCreators(): Promise<void>;
  
  // FPL Creator Tracking operations
  getCreatorTracking(creatorId: number, limit?: number): Promise<FplCreatorTracking[]>;
  addCreatorTracking(tracking: InsertFplCreatorTracking): Promise<FplCreatorTracking>;
  getLatestCreatorTracking(creatorId: number): Promise<FplCreatorTracking | undefined>;
  
  // Price changes tracking operations
  getPriceChanges(limit?: number): Promise<PriceChange[]>;
  addPriceChange(priceChange: InsertPriceChange): Promise<PriceChange>;
  getLatestPlayerPrice(playerId: number): Promise<{ price: number; date: string } | null>;
  detectPriceChanges(currentPrices: Array<{ playerId: number; price: number; playerName: string; teamId?: number; teamName?: string; position?: string; ownership: number; transfersIn: number; transfersOut: number; totalSeasonChange: number }>): Promise<InsertPriceChange[]>;
  
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

  async getLastPriceChangeDate(playerId: number, currentPrice: number): Promise<string | null> {
    // Memory implementation - return null
    return null;
  }

  async getBatchPriceChangeDates(playerPrices: Array<{playerId: number, currentPrice: number}>): Promise<Map<number, string>> {
    // Memory implementation - return empty map with default dates
    const result = new Map<number, string>();
    const today = new Date().toISOString().split('T')[0];
    playerPrices.forEach(({playerId}) => {
      result.set(playerId, today);
    });
    return result;
  }

  // Player mappings operations (in-memory fallback)
  async getPlayerMappings(): Promise<PlayerMapping[]> {
    return [];
  }

  async upsertPlayerMappings(players: InsertPlayerMapping[]): Promise<void> {
    console.log(`MemStorage: Would store ${players.length} player mappings`);
  }

  async getPlayerMappingById(playerId: number): Promise<PlayerMapping | undefined> {
    return undefined;
  }

  // FPL Content Creators operations (in-memory stubs)
  async getContentCreators(): Promise<FplContentCreator[]> {
    return [];
  }

  async getContentCreatorById(id: number): Promise<FplContentCreator | undefined> {
    return undefined;
  }

  async addContentCreator(creator: InsertFplContentCreator): Promise<FplContentCreator> {
    throw new Error("MemStorage: Content creator operations not supported. Use DatabaseStorage.");
  }

  async updateContentCreator(id: number, updates: Partial<InsertFplContentCreator>): Promise<FplContentCreator> {
    throw new Error("MemStorage: Content creator operations not supported. Use DatabaseStorage.");
  }

  async deleteContentCreator(id: number): Promise<void> {
    throw new Error("MemStorage: Content creator operations not supported. Use DatabaseStorage.");
  }

  async clearContentCreators(): Promise<void> {
    throw new Error("MemStorage: Content creator operations not supported. Use DatabaseStorage.");
  }

  // FPL Creator Tracking operations (in-memory stubs)
  async getCreatorTracking(creatorId: number, limit?: number): Promise<FplCreatorTracking[]> {
    return [];
  }

  async addCreatorTracking(tracking: InsertFplCreatorTracking): Promise<FplCreatorTracking> {
    throw new Error("MemStorage: Creator tracking operations not supported. Use DatabaseStorage.");
  }

  async getLatestCreatorTracking(creatorId: number): Promise<FplCreatorTracking | undefined> {
    return undefined;
  }

  // Price changes tracking operations (in-memory stubs)
  async getPriceChanges(limit?: number): Promise<PriceChange[]> {
    return [];
  }

  async addPriceChange(priceChange: InsertPriceChange): Promise<PriceChange> {
    throw new Error("MemStorage: Price change operations not supported. Use DatabaseStorage.");
  }

  async getLatestPlayerPrice(playerId: number): Promise<{ price: number; date: string } | null> {
    return null;
  }

  async detectPriceChanges(currentPrices: Array<{ playerId: number; price: number; playerName: string; teamId?: number; teamName?: string; position?: string; ownership: number; transfersIn: number; transfersOut: number; totalSeasonChange: number }>): Promise<InsertPriceChange[]> {
    return [];
  }

}

// Database-backed storage with fallback to memory storage
export class DatabaseStorage implements IStorage {
  private memFallback: MemStorage;

  constructor() {
    this.memFallback = new MemStorage();
  }

  // Helper method to map team names to team IDs (standard FPL team IDs)
  private getTeamIdFromName(teamName: string): number {
    const teamMap: Record<string, number> = {
      'Arsenal': 1, 'ARS': 1,
      'Aston Villa': 2, 'AVL': 2, 
      'Bournemouth': 3, 'BOU': 3,
      'Brentford': 4, 'BRE': 4,
      'Brighton': 5, 'BHA': 5,
      'Chelsea': 6, 'CHE': 6,
      'Crystal Palace': 7, 'CRY': 7,
      'Everton': 8, 'EVE': 8,
      'Fulham': 9, 'FUL': 9,
      'Leeds': 10, 'LEE': 10,
      'Liverpool': 11, 'LIV': 11,
      'Manchester City': 12, 'MCI': 12, 'Man City': 12,
      'Manchester United': 13, 'MUN': 13, 'Man Utd': 13,
      'Newcastle': 14, 'NEW': 14,
      'Nottingham Forest': 15, 'NFO': 15, "Nott'm Forest": 15,
      'Southampton': 16, 'SOU': 16,
      'Tottenham': 17, 'TOT': 17, 'Spurs': 17,
      'West Ham': 18, 'WHU': 18,
      'Wolves': 19, 'WOL': 19,
      'Watford': 20, 'WAT': 20
    };
    return teamMap[teamName] || 1; // Default to Arsenal if not found
  }

  // Helper method to calculate form from historical season performance
  private calculateHistoricalForm(totalPoints: number, minutes: number): string {
    if (!minutes || minutes < 90) return "0.0";
    // Calculate average points per game, then convert to form scale (0-10)
    const gamesPlayed = Math.round(minutes / 90);
    const avgPointsPerGame = totalPoints / gamesPlayed;
    const form = Math.min(10, Math.max(0, avgPointsPerGame)).toFixed(1);
    return form;
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
          // Add commonly needed fields with calculated values for historical data
          form: this.calculateHistoricalForm(player.totalPoints || 0, player.minutes || 0),
          points_per_game: player.totalPoints && player.minutes ? 
            ((player.totalPoints / (player.minutes / 90)) || 0).toFixed(1) : "0.0",
          selected_by_percent: "0.0", // Not available for historical data
          now_cost: player.endCost || player.startCost || 0,
          value_form: "0.0", // Not available for historical data
          value_season: player.totalPoints && player.endCost ? 
            ((player.totalPoints / (player.endCost / 10)) || 0).toFixed(1) : "0.0",
          transfers_in: 0, // Not available for historical data
          transfers_out: 0, // Not available for historical data  
          transfers_in_event: 0, // Not available for historical data
          transfers_out_event: 0, // Not available for historical data
          cost_change_event: 0, // Not available for historical data
          cost_change_event_fall: 0, // Not available for historical data
          cost_change_start: (player.endCost || 0) - (player.startCost || 0),
          cost_change_start_fall: (player.startCost || 0) - (player.endCost || 0),
          ep_next: "0.0", // Not available for historical data
          ep_this: "0.0", // Not available for historical data
          squad_number: 0, // Not available for historical data
          event_points: 0, // Not available for historical data - this is last gameweek points
          dreamteam_count: 0, // Not available for historical data
          element_type: player.positionName === 'Goalkeeper' ? 1 : 
                       player.positionName === 'Defender' ? 2 : 
                       player.positionName === 'Midfielder' ? 3 : 4,
          team: this.getTeamIdFromName(player.teamName || player.teamShortName || "")
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
      
      // Fetch all records for these players and process in memory to avoid SQL issues
      const allRecords = await db
        .select()
        .from(dailyPlayerPrices)
        .orderBy(sql`${dailyPlayerPrices.recordDate} DESC`);
      
      // Filter to only the players we need and get the latest for each
      const resultMap = new Map<number, any>();
      const playerIdsSet = new Set(playerIds);
      
      // Group by playerId and get the latest for each
      const playerRecords = new Map<number, any[]>();
      
      // Group records by player (only for the players we need)
      allRecords.forEach(record => {
        if (playerIdsSet.has(record.playerId)) {
          if (!playerRecords.has(record.playerId)) {
            playerRecords.set(record.playerId, []);
          }
          playerRecords.get(record.playerId)!.push(record);
        }
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

  // Find the actual date when each player's price last changed
  async getLastPriceChangeDate(playerId: number, currentPrice: number): Promise<string | null> {
    try {
      const { dailyPlayerPrices } = await import("@shared/schema");
      
      // Get the player's price history ordered by date descending
      const priceHistory = await db
        .select()
        .from(dailyPlayerPrices)
        .where(eq(dailyPlayerPrices.playerId, playerId))
        .orderBy(sql`${dailyPlayerPrices.recordDate} DESC`)
        .limit(100); // Last 100 days should be enough
      
      if (priceHistory.length === 0) {
        return null;
      }
      
      // Find the most recent date where the price was different from current price
      let changeDate = null;
      let previousPrice = currentPrice;
      
      for (const record of priceHistory) {
        if (record.currentPrice !== currentPrice) {
          // This is when the price was different - the change happened after this date
          // Look for the next record (chronologically) where price equals current price
          const indexOfChange = priceHistory.indexOf(record);
          if (indexOfChange > 0) {
            // The price change happened on the date of the previous record (next chronologically)
            changeDate = priceHistory[indexOfChange - 1].recordDate;
          } else {
            // Price changed since our earliest record
            changeDate = record.recordDate;
          }
          break;
        }
      }
      
      return changeDate;
    } catch (error) {
      console.error("Error getting last price change date:", error);
      return null;
    }
  }

  // Get price change dates for multiple players efficiently
  async getBatchPriceChangeDates(playerPrices: Array<{playerId: number, currentPrice: number}>): Promise<Map<number, string>> {
    try {
      const { dailyPlayerPrices } = await import("@shared/schema");
      const result = new Map<number, string>();
      
      if (playerPrices.length === 0) return result;
      
      // Get all relevant players' price history
      const playerIds = playerPrices.map(p => p.playerId);
      const priceHistories = await db
        .select()
        .from(dailyPlayerPrices)
        .where(sql`${dailyPlayerPrices.playerId} = ANY(${JSON.stringify(playerIds)})`)
        .orderBy(sql`${dailyPlayerPrices.playerId}, ${dailyPlayerPrices.recordDate} DESC`);
      
      // Group by player
      const historiesByPlayer = new Map<number, any[]>();
      priceHistories.forEach(record => {
        if (!historiesByPlayer.has(record.playerId)) {
          historiesByPlayer.set(record.playerId, []);
        }
        historiesByPlayer.get(record.playerId)!.push(record);
      });
      
      // Find change date for each player
      for (const {playerId, currentPrice} of playerPrices) {
        const history = historiesByPlayer.get(playerId) || [];
        
        if (history.length === 0) {
          result.set(playerId, new Date().toISOString().split('T')[0]); // Default to today
          continue;
        }
        
        // Find the most recent price change
        let changeDate = history[0].recordDate; // Default to most recent record
        
        for (let i = 0; i < history.length; i++) {
          const record = history[i];
          if (record.currentPrice !== currentPrice) {
            // Found where price was different
            if (i > 0) {
              // Price changed on the date of the previous record
              changeDate = history[i - 1].recordDate;
            } else {
              // Price changed since our earliest record
              changeDate = record.recordDate;
            }
            break;
          }
        }
        
        result.set(playerId, changeDate);
      }
      
      return result;
    } catch (error) {
      console.error("Error getting batch price change dates:", error);
      return new Map();
    }
  }

  // Player mappings operations (use database for persistence)
  async getPlayerMappings(): Promise<PlayerMapping[]> {
    try {
      console.log(`📊 Fetching player mappings from database...`);
      const mappings = await db.execute(sql`SELECT * FROM player_mappings ORDER BY id`);
      console.log(`✅ Found ${mappings.rows.length} player mappings in database`);
      return mappings.rows as PlayerMapping[];
    } catch (error) {
      console.error("Error fetching player mappings from database:", error);
      return [];
    }
  }

  async upsertPlayerMappings(players: InsertPlayerMapping[]): Promise<void> {
    try {
      console.log(`💾 Upserting ${players.length} player mappings...`);
      
      for (const player of players) {
        await db.execute(sql`
          INSERT INTO player_mappings (
            id, first_name, second_name, web_name, current_team_id, 
            current_team_name, position, last_updated
          ) VALUES (
            ${player.id}, ${player.firstName}, ${player.secondName}, ${player.webName}, 
            ${player.currentTeamId}, ${player.currentTeamName}, ${player.position}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            second_name = EXCLUDED.second_name,
            web_name = EXCLUDED.web_name,
            current_team_id = EXCLUDED.current_team_id,
            current_team_name = EXCLUDED.current_team_name,
            position = EXCLUDED.position,
            last_updated = NOW()
        `);
      }
      
      console.log(`✅ Successfully upserted ${players.length} player mappings`);
    } catch (error) {
      console.error("Error upserting player mappings:", error);
      throw error;
    }
  }

  async getPlayerMappingById(playerId: number): Promise<PlayerMapping | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM player_mappings WHERE id = ${playerId}
      `);
      return result.rows[0] as PlayerMapping | undefined;
    } catch (error) {
      console.error(`Error fetching player mapping for ${playerId}:`, error);
      return undefined;
    }
  }

  // FPL Content Creators operations
  async getContentCreators(): Promise<FplContentCreator[]> {
    try {
      console.log(`📊 Fetching content creators from database...`);
      const creators = await db.select().from(fplContentCreators).orderBy(fplContentCreators.name);
      console.log(`✅ Found ${creators.length} content creators in database`);
      return creators;
    } catch (error) {
      console.error("Error fetching content creators from database:", error);
      return [];
    }
  }

  async getContentCreatorById(id: number): Promise<FplContentCreator | undefined> {
    try {
      const [creator] = await db.select().from(fplContentCreators).where(eq(fplContentCreators.id, id));
      return creator;
    } catch (error) {
      console.error(`Error fetching content creator ${id}:`, error);
      return undefined;
    }
  }

  async addContentCreator(creator: InsertFplContentCreator): Promise<FplContentCreator> {
    try {
      console.log(`💾 Adding content creator: ${creator.name}`);
      const [newCreator] = await db.insert(fplContentCreators).values(creator).returning();
      console.log(`✅ Successfully added content creator: ${newCreator.name}`);
      return newCreator;
    } catch (error) {
      console.error("Error adding content creator:", error);
      throw error;
    }
  }

  async updateContentCreator(id: number, updates: Partial<InsertFplContentCreator>): Promise<FplContentCreator> {
    try {
      console.log(`💾 Updating content creator: ${id}`);
      const [updatedCreator] = await db.update(fplContentCreators)
        .set({ ...updates, lastUpdated: new Date() })
        .where(eq(fplContentCreators.id, id))
        .returning();
      console.log(`✅ Successfully updated content creator: ${updatedCreator.name}`);
      return updatedCreator;
    } catch (error) {
      console.error("Error updating content creator:", error);
      throw error;
    }
  }

  async deleteContentCreator(id: number): Promise<void> {
    try {
      console.log(`🗑️ Deleting content creator: ${id}`);
      await db.delete(fplContentCreators).where(eq(fplContentCreators.id, id));
      console.log(`✅ Successfully deleted content creator: ${id}`);
    } catch (error) {
      console.error("Error deleting content creator:", error);
      throw error;
    }
  }

  async clearContentCreators(): Promise<void> {
    try {
      console.log(`🗑️ Clearing all content creators...`);
      await db.delete(fplContentCreators);
      console.log(`✅ Successfully cleared all content creators`);
    } catch (error) {
      console.error("Error clearing content creators:", error);
      throw error;
    }
  }

  // FPL Creator Tracking operations
  async getCreatorTracking(creatorId: number, limit: number = 20): Promise<FplCreatorTracking[]> {
    try {
      console.log(`📊 Fetching tracking data for creator ${creatorId}...`);
      const tracking = await db.select()
        .from(fplCreatorTracking)
        .where(eq(fplCreatorTracking.creatorId, creatorId))
        .orderBy(desc(fplCreatorTracking.recordedAt))
        .limit(limit);
      console.log(`✅ Found ${tracking.length} tracking records for creator ${creatorId}`);
      return tracking;
    } catch (error) {
      console.error(`Error fetching tracking data for creator ${creatorId}:`, error);
      return [];
    }
  }

  async addCreatorTracking(tracking: InsertFplCreatorTracking): Promise<FplCreatorTracking> {
    try {
      console.log(`💾 Adding tracking data for creator ${tracking.creatorId}, GW${tracking.gameweek}`);
      const [newTracking] = await db.insert(fplCreatorTracking).values(tracking).returning();
      console.log(`✅ Successfully added tracking data for creator ${tracking.creatorId}`);
      return newTracking;
    } catch (error) {
      console.error("Error adding creator tracking:", error);
      throw error;
    }
  }

  async getLatestCreatorTracking(creatorId: number): Promise<FplCreatorTracking | undefined> {
    try {
      const [latest] = await db.select()
        .from(fplCreatorTracking)
        .where(eq(fplCreatorTracking.creatorId, creatorId))
        .orderBy(desc(fplCreatorTracking.recordedAt))
        .limit(1);
      return latest;
    } catch (error) {
      console.error(`Error fetching latest tracking for creator ${creatorId}:`, error);
      return undefined;
    }
  }

  // Price changes tracking operations
  async getPriceChanges(limit: number = 100): Promise<PriceChange[]> {
    try {
      console.log(`📊 Fetching recent price changes (limit: ${limit})...`);
      const changes = await db.select()
        .from(priceChanges)
        .orderBy(desc(priceChanges.changeDate), desc(priceChanges.createdAt))
        .limit(limit);
      console.log(`✅ Found ${changes.length} price changes`);
      return changes;
    } catch (error) {
      console.error("Error fetching price changes:", error);
      return [];
    }
  }

  async addPriceChange(priceChange: InsertPriceChange): Promise<PriceChange> {
    try {
      console.log(`💰 Recording price change for ${priceChange.playerName}: ${priceChange.oldPrice}→${priceChange.newPrice}`);
      const [newChange] = await db.insert(priceChanges).values(priceChange).returning();
      console.log(`✅ Price change recorded for ${priceChange.playerName}`);
      return newChange;
    } catch (error) {
      console.error("Error adding price change:", error);
      throw error;
    }
  }

  async getLatestPlayerPrice(playerId: number): Promise<{ price: number; date: string } | null> {
    try {
      // Check price changes table for most recent recorded price
      const [latestChange] = await db.select()
        .from(priceChanges)
        .where(eq(priceChanges.playerId, playerId))
        .orderBy(desc(priceChanges.changeDate), desc(priceChanges.createdAt))
        .limit(1);
        
      if (latestChange) {
        return {
          price: latestChange.newPrice,
          date: latestChange.changeDate
        };
      }
      
      // If no price changes recorded yet, return null so we don't track historical changes
      return null;
    } catch (error) {
      console.error(`Error getting latest price for player ${playerId}:`, error);
      return null;
    }
  }

  async detectPriceChanges(currentPrices: Array<{ 
    playerId: number; 
    price: number; 
    playerName: string; 
    teamId?: number; 
    teamName?: string; 
    position?: string; 
    ownership: number; 
    transfersIn: number; 
    transfersOut: number; 
    totalSeasonChange: number 
  }>): Promise<InsertPriceChange[]> {
    try {
      console.log(`🔍 Detecting actual price changes for ${currentPrices.length} players...`);
      const priceChangesToAdd: InsertPriceChange[] = [];
      const today = new Date().toISOString().split('T')[0];
      
      // Check if this is the first run (empty price_changes table)
      const existingChanges = await this.getPriceChanges(1);
      const isFirstRun = existingChanges.length === 0;
      
      if (isFirstRun) {
        console.log("🌱 First run detected - initializing price changes table with season data");
        
        // Initialize with all players who have had price changes this season
        for (const playerData of currentPrices) {
          if (playerData.totalSeasonChange !== 0) {
            // Calculate original season price
            const originalPrice = playerData.price - playerData.totalSeasonChange;
            
            const priceChange: InsertPriceChange = {
              playerId: playerData.playerId,
              playerName: playerData.playerName,
              teamId: playerData.teamId || null,
              teamName: playerData.teamName || null,
              position: playerData.position || null,
              oldPrice: originalPrice,
              newPrice: playerData.price,
              priceChange: playerData.totalSeasonChange,
              changeDate: today,
              ownership: playerData.ownership.toString(),
              transfersIn: playerData.transfersIn,
              transfersOut: playerData.transfersOut,
              totalSeasonChange: playerData.totalSeasonChange
            };
            
            priceChangesToAdd.push(priceChange);
            const changeType = playerData.totalSeasonChange > 0 ? "RISE" : "FALL";
            console.log(`🔄 SEASON ${changeType}: ${playerData.playerName} (${originalPrice} → ${playerData.price}) = ${playerData.totalSeasonChange > 0 ? '+' : ''}${playerData.totalSeasonChange}`);
          }
        }
        
        console.log(`✅ Initialized with ${priceChangesToAdd.length} season price changes`);
        return priceChangesToAdd;
      }
      
      // Regular price change detection for subsequent runs
      for (const playerData of currentPrices) {
        // Get the player's last recorded price from our price_changes table
        const latestRecordedPrice = await this.getLatestPlayerPrice(playerData.playerId);
        
        // Only track if we have previous data in our table AND the price has actually changed
        if (latestRecordedPrice && latestRecordedPrice.price !== playerData.price) {
          const actualPriceChange = playerData.price - latestRecordedPrice.price;
          
          // Only record if there's an actual price change (rise or fall)
          if (actualPriceChange !== 0) {
            const priceChange: InsertPriceChange = {
              playerId: playerData.playerId,
              playerName: playerData.playerName,
              teamId: playerData.teamId || null,
              teamName: playerData.teamName || null,
              position: playerData.position || null,
              oldPrice: latestRecordedPrice.price,
              newPrice: playerData.price,
              priceChange: actualPriceChange,
              changeDate: today,
              ownership: playerData.ownership.toString(),
              transfersIn: playerData.transfersIn,
              transfersOut: playerData.transfersOut,
              totalSeasonChange: playerData.totalSeasonChange
            };
            
            priceChangesToAdd.push(priceChange);
            const changeType = actualPriceChange > 0 ? "RISE" : "FALL";
            console.log(`💰 ${changeType}: ${playerData.playerName} (table: ${latestRecordedPrice.price} → current: ${playerData.price}) = ${actualPriceChange > 0 ? '+' : ''}${actualPriceChange}`);
          }
        }
      }
      
      console.log(`✅ Detected ${priceChangesToAdd.length} actual price changes`);
      return priceChangesToAdd;
    } catch (error) {
      console.error("Error detecting price changes:", error);
      return [];
    }
  }

}

// Use database-backed storage with memory fallback
export const storage = new DatabaseStorage();
