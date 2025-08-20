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
}

export class MemStorage implements IStorage {
  private bootstrapData: BootstrapData | undefined;
  private playerSummaries: Map<number, PlayerSummary>;
  private watchlistEntries: Map<number, WatchlistEntry>;
  private priceAlerts: Map<number, PriceAlert>;
  private nextWatchlistId: number;
  private nextAlertId: number;

  constructor() {
    this.playerSummaries = new Map();
    this.watchlistEntries = new Map();
    this.priceAlerts = new Map();
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
      createdAt: new Date(),
    };
    this.priceAlerts.set(id, priceAlert);
    return priceAlert;
  }
}

export const storage = new MemStorage();
