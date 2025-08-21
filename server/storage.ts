import { type BootstrapData, type PlayerSummary, type WatchlistEntry, type InsertWatchlistEntry, type PriceAlert, type InsertPriceAlert } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private bootstrapData: BootstrapData | undefined;
  private playerSummaries: Map<number, PlayerSummary>;
  private watchlistEntries: Map<number, WatchlistEntry>;
  private priceAlerts: Map<number, PriceAlert>;
  private priceChangeHistory: Map<string, { playerId: number; changeAmount: number; date: string; }>;
  private nextWatchlistId: number;
  private nextAlertId: number;

  constructor() {
    this.playerSummaries = new Map();
    this.watchlistEntries = new Map();
    this.priceAlerts = new Map();
    this.priceChangeHistory = new Map();
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
}

export const storage = new MemStorage();
