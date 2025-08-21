import { type BootstrapData, type PlayerSummary, type WatchlistEntry, type InsertWatchlistEntry, type PriceAlert, type InsertPriceAlert } from "@shared/schema";
import { type HistoricalPlayer, type InsertHistoricalPlayer } from "@shared/watchlist-schema";

export interface IStorage {
  getBootstrapData(): Promise<BootstrapData | undefined>;
  setBootstrapData(data: BootstrapData): Promise<void>;
  getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined>;
  setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void>;
  
  // Watchlist operations
  getWatchlistEntries(): Promise<WatchlistEntry[]>;
  addWatchlistEntry(entry: InsertWatchlistEntry): Promise<WatchlistEntry>;
  removeWatchlistEntry(id: number): Promise<void>;
  updateWatchlistEntry(id: number, entry: Partial<InsertWatchlistEntry>): Promise<WatchlistEntry>;
  
  // Price alert operations
  getPriceAlerts(): Promise<PriceAlert[]>;
  addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  
  // Price change tracking operations (for future implementation)
  getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined>;
  setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void>;
  
  // Historical player operations
  getHistoricalPlayers(season: string): Promise<HistoricalPlayer[]>;
  insertHistoricalPlayers(players: InsertHistoricalPlayer[]): Promise<void>;
  hasHistoricalData(season: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private bootstrapData: BootstrapData | undefined;
  private playerSummaries: Map<number, PlayerSummary>;
  private watchlistEntries: Map<number, WatchlistEntry>;
  private priceAlerts: Map<number, PriceAlert>;
  private priceChangeHistory: Map<string, { playerId: number; changeAmount: number; date: string; }>;
  private historicalPlayerCache: Map<string, HistoricalPlayer[]>;
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

  async removeWatchlistEntry(id: number): Promise<void> {
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

  async removeWatchlistEntry(id: number): Promise<void> {
    return this.memFallback.removeWatchlistEntry(id);
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
      // Try database first (commented out for now - will implement database operations)
      return this.memFallback.getHistoricalPlayers(season);
    } catch (error) {
      console.warn('Database fetch failed, using memory fallback:', error);
      return this.memFallback.getHistoricalPlayers(season);
    }
  }

  async insertHistoricalPlayers(players: InsertHistoricalPlayer[]): Promise<void> {
    try {
      // Store in memory cache for immediate use
      await this.memFallback.insertHistoricalPlayers(players);
      
      // TODO: Also store in database for persistence
      console.log(`Stored ${players.length} historical players in memory cache`);
    } catch (error) {
      console.warn('Failed to store historical data:', error);
      throw error;
    }
  }

  async hasHistoricalData(season: string): Promise<boolean> {
    try {
      // Check memory cache first
      return this.memFallback.hasHistoricalData(season);
    } catch (error) {
      console.warn('Failed to check historical data:', error);
      return false;
    }
  }
}

// Use database-backed storage with memory fallback
export const storage = new DatabaseStorage();
